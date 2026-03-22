#!/usr/bin/env bun
/**
 * Git worktree management for parallel development sessions.
 *
 * Usage:
 *   bun run worktree:new <name>     # Create a new worktree with branch
 *   bun run worktree:list           # List active worktrees
 *   bun run worktree:remove <name>  # Remove a worktree
 *
 * Worktrees are created in .worktrees/<name>/ with branch worktree/<name>.
 * Each worktree has its own node_modules (installed automatically) but shares
 * the lockfile with the main worktree.
 */
import { existsSync } from "node:fs";
import path from "node:path";

const ROOT_DIR = path.join(import.meta.dir, "..");
const WORKTREES_DIR = path.join(ROOT_DIR, ".worktrees");

const run = (
	args: string[],
	options?: { cwd?: string },
): { exitCode: number; stderr: string; stdout: string } => {
	const result = Bun.spawnSync(args, {
		cwd: options?.cwd ?? ROOT_DIR,
		stdout: "pipe",
		stderr: "pipe",
	});
	return {
		exitCode: result.exitCode,
		stdout: result.stdout.toString().trim(),
		stderr: result.stderr.toString().trim(),
	};
};

const runInherit = (args: string[], options?: { cwd?: string }): number => {
	const result = Bun.spawnSync(args, {
		cwd: options?.cwd ?? ROOT_DIR,
		stdout: "inherit",
		stderr: "inherit",
	});
	return result.exitCode;
};

const validateName = (name: string): boolean => {
	return /^[a-z0-9-]+$/.test(name);
};

const getWorktrees = (): { branch: string; path: string }[] => {
	const result = run(["git", "worktree", "list", "--porcelain"]);
	if (result.exitCode !== 0) {
		return [];
	}

	const worktrees: { branch: string; path: string }[] = [];
	let currentPath = "";
	let currentBranch = "";

	for (const line of result.stdout.split("\n")) {
		if (line.startsWith("worktree ")) {
			currentPath = line.slice(9);
		} else if (line.startsWith("branch ")) {
			currentBranch = line.slice(7).replace("refs/heads/", "");
		} else if (line === "") {
			if (currentPath && currentBranch) {
				worktrees.push({ path: currentPath, branch: currentBranch });
			}
			currentPath = "";
			currentBranch = "";
		}
	}

	// Handle last entry if no trailing newline
	if (currentPath && currentBranch) {
		worktrees.push({ path: currentPath, branch: currentBranch });
	}

	return worktrees;
};

const listWorktrees = (): void => {
	const worktrees = getWorktrees();

	if (worktrees.length === 0) {
		console.info("No worktrees found");
		return;
	}

	console.info("Active worktrees:\n");
	for (const wt of worktrees) {
		const isMain = wt.path === ROOT_DIR;
		const label = isMain ? " (main)" : "";
		console.info(`  ${wt.branch}${label}`);
		console.info(`    ${wt.path}\n`);
	}
};

const newWorktree = (name: string): void => {
	if (!validateName(name)) {
		console.error(
			`Invalid name: "${name}". Use lowercase letters, numbers, and hyphens only.`,
		);
		process.exit(1);
	}

	const worktreePath = path.join(WORKTREES_DIR, name);
	const branchName = `worktree/${name}`;

	if (existsSync(worktreePath)) {
		console.error(`Worktree already exists: ${worktreePath}`);
		process.exit(1);
	}

	// Check if branch already exists
	const branchCheck = run(["git", "rev-parse", "--verify", branchName]);
	if (branchCheck.exitCode === 0) {
		console.error(`Branch already exists: ${branchName}`);
		process.exit(1);
	}

	console.info(`Creating worktree "${name}"...\n`);

	// Create worktree with new branch from main
	const createResult = run([
		"git",
		"worktree",
		"add",
		"-b",
		branchName,
		worktreePath,
		"main",
	]);

	if (createResult.exitCode !== 0) {
		console.error(`Failed to create worktree: ${createResult.stderr}`);
		process.exit(1);
	}

	console.info(`  Created branch: ${branchName}`);
	console.info(`  Created worktree: ${worktreePath}\n`);

	// Install dependencies
	console.info("Installing dependencies...\n");
	const installCode = runInherit(["bun", "install"], { cwd: worktreePath });

	if (installCode !== 0) {
		console.error("Failed to install dependencies");
		process.exit(1);
	}

	// Show other active worktrees
	const otherWorktrees = getWorktrees().filter(
		(wt) => wt.path !== worktreePath && wt.path !== ROOT_DIR,
	);

	console.info("\n---");
	console.info(`\nWorktree ready!\n`);
	console.info(`  cd ${worktreePath}\n`);

	if (otherWorktrees.length > 0) {
		console.info("Other active worktrees:");
		for (const wt of otherWorktrees) {
			console.info(`  - ${wt.branch} (${wt.path})`);
		}
		console.info("");
	}

	console.info(`When done: bun run worktree:remove ${name}`);
};

const removeWorktree = (name: string): void => {
	const worktreePath = path.join(WORKTREES_DIR, name);
	const branchName = `worktree/${name}`;

	if (!existsSync(worktreePath)) {
		console.error(`Worktree not found: ${worktreePath}`);
		process.exit(1);
	}

	console.info(`Removing worktree "${name}"...\n`);

	// Remove worktree
	const removeResult = run(["git", "worktree", "remove", worktreePath]);

	if (removeResult.exitCode !== 0) {
		// Try force removal if there are uncommitted changes
		console.info("Worktree has changes, attempting force removal...");
		const forceResult = run([
			"git",
			"worktree",
			"remove",
			"--force",
			worktreePath,
		]);

		if (forceResult.exitCode !== 0) {
			console.error(`Failed to remove worktree: ${forceResult.stderr}`);
			process.exit(1);
		}
	}

	console.info(`  Removed worktree: ${worktreePath}`);

	// Check if branch is merged into main
	const mergeCheck = run(["git", "branch", "--merged", "main"]);
	const isMerged = mergeCheck.stdout.includes(branchName);

	if (isMerged) {
		// Delete the branch if merged
		const deleteResult = run(["git", "branch", "-d", branchName]);
		if (deleteResult.exitCode === 0) {
			console.info(`  Deleted branch: ${branchName} (was merged)`);
		}
	} else {
		console.info(`  Branch kept: ${branchName} (not yet merged into main)`);
	}

	console.info("\nWorktree removed.");
};

const main = (): void => {
	const [command, ...args] = process.argv.slice(2);

	switch (command) {
		case "list": {
			listWorktrees();
			break;
		}
		case "new": {
			const name = args[0];
			if (!name) {
				console.error("Usage: bun run worktree:new <name>");
				process.exit(1);
			}
			newWorktree(name);
			break;
		}
		case "remove": {
			const name = args[0];
			if (!name) {
				console.error("Usage: bun run worktree:remove <name>");
				process.exit(1);
			}
			removeWorktree(name);
			break;
		}
		default: {
			console.error("Git worktree management\n");
			console.error("Commands:");
			console.error("  bun run worktree:new <name>     Create a new worktree");
			console.error("  bun run worktree:list           List active worktrees");
			console.error("  bun run worktree:remove <name>  Remove a worktree");
			process.exit(1);
		}
	}
};

main();
