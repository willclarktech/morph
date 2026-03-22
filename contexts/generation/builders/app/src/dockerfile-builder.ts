/** Configuration for the build stage */
export interface DockerBuildStageConfig {
	/** Libraries to include (e.g., ["dsl", "core"] or ["dsl", "client"]) */
	libs: string[];
	/** App directory name (e.g., "api", "cli", "mcp", "ui") */
	appDir: string;
	/** Extra files to copy at the end (e.g., ["schema.json"]) */
	extraFiles?: string[];
	/** Build command to run after copying (for compiled binaries) */
	buildCommand?: string;
}

/** Configuration for the production stage */
export interface DockerProductionStageConfig {
	/** Base image for production (e.g., "oven/bun:1-alpine", "alpine:3.19") */
	baseImage: string;
	/** Working directory in production */
	workdir: string;
	/** How to copy files from builder */
	copyFrom: "full-app" | { binary: string };
	/** Port to expose (optional) */
	port?: number;
	/** Health check path (optional, implies HTTP server) */
	healthCheckPath?: string;
	/** Command to run (e.g., ["bun", "start"] or ["./${name}"]) */
	cmd?: string[];
	/** Entry point (for CLI binaries) */
	entrypoint?: string[];
	/** Comment for the production stage */
	comment?: string;
}

/** Full Dockerfile configuration */
export interface DockerfileConfig {
	/** Project name (used for binary names) */
	name: string;
	/** Build stage configuration */
	build: DockerBuildStageConfig;
	/** Production stage configuration */
	production: DockerProductionStageConfig;
}

/** Build the Dockerfile build stage */
const buildBuildStage = (config: DockerfileConfig): string => {
	const { build } = config;
	const lines: string[] = [
		"# Build stage",
		"FROM oven/bun:1-alpine AS builder",
		"",
		"WORKDIR /app",
		"",
		"# Copy package files",
		"COPY package.json bun.lock* ./",
	];

	// Copy lib package.json files
	for (const lib of build.libs) {
		lines.push(`COPY libs/${lib}/package.json ./libs/${lib}/`);
	}
	lines.push(`COPY apps/${build.appDir}/package.json ./apps/${build.appDir}/`);

	lines.push("");
	lines.push("# Install dependencies");
	lines.push("RUN bun install --frozen-lockfile");
	lines.push("");
	lines.push("# Copy source files");

	// Copy lib source directories
	for (const lib of build.libs) {
		lines.push(`COPY libs/${lib}/ ./libs/${lib}/`);
	}
	lines.push(`COPY apps/${build.appDir}/ ./apps/${build.appDir}/`);

	// Copy extra files
	if (build.extraFiles && build.extraFiles.length > 0) {
		lines.push(`COPY ${build.extraFiles.join(" ")} ./`);
	}

	// Build command (for CLI binaries)
	if (build.buildCommand) {
		lines.push("");
		lines.push("# Build standalone executable");
		lines.push(`RUN ${build.buildCommand}`);
	}

	return lines.join("\n");
};

/** Build the Dockerfile production stage */
const buildProductionStage = (config: DockerfileConfig): string => {
	const { production, name } = config;
	const stageComment = production.comment ?? "# Production stage";
	const lines: string[] = [
		"",
		"",
		stageComment,
		`FROM ${production.baseImage}`,
		"",
		`WORKDIR ${production.workdir}`,
		"",
	];

	// Copy from builder
	if (production.copyFrom === "full-app") {
		lines.push("# Copy from builder");
		lines.push("COPY --from=builder /app /app");
	} else {
		lines.push("# Copy compiled binary from builder");
		lines.push(
			`COPY --from=builder /app/${production.copyFrom.binary} ./${production.copyFrom.binary}`,
		);
	}

	lines.push("");
	lines.push("# Environment defaults (override with docker run -e)");
	lines.push("ENV NODE_ENV=production");

	if (production.port) {
		lines.push(`ENV PORT=${production.port}`);
	}

	// Health check for HTTP servers
	if (production.healthCheckPath) {
		lines.push("");
		lines.push(
			"# Health check (Factor 9: Disposability - fast startup, graceful shutdown)",
		);
		lines.push(
			`HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\`,
		);
		lines.push(
			`  CMD wget --no-verbose --tries=1 --spider http://localhost:\${PORT}${production.healthCheckPath} || exit 1`,
		);
	}

	if (production.port) {
		lines.push("");
		lines.push("EXPOSE ${PORT}");
	}

	// Entry point or command
	if (production.entrypoint) {
		lines.push("");
		lines.push(`ENTRYPOINT [${production.entrypoint.map((e) => `"${e.replace("${name}", name)}"`).join(", ")}]`);
	} else if (production.cmd) {
		const cmdStr = production.cmd.map((c) => `"${c}"`).join(", ");
		lines.push("");
		if (!production.healthCheckPath && production.port === undefined) {
			lines.push("# MCP uses stdio, no port needed");
		}
		lines.push(`CMD [${cmdStr}]`);
	}

	return lines.join("\n");
};

/** Build a complete Dockerfile string from configuration */
export const buildDockerfile = (config: DockerfileConfig): string => {
	const buildStage = buildBuildStage(config);
	const productionStage = buildProductionStage(config);
	return buildStage + productionStage + "\n";
};

/** Build a standard .dockerignore file */
export const buildDockerignore = (): string => `# Dependencies (installed in container)
node_modules/
**/node_modules/

# Build artifacts
dist/
**/dist/
*.tsbuildinfo

# Test files
**/*.test.ts
**/*.spec.ts
tests/
**/test/

# Development files
.git/
.gitignore
.env
.env.*
!.env.example
*.md
!README.md

# IDE and editor files
.vscode/
.idea/
*.swp
*.swo
.DS_Store

# Temporary files
tmp/
.tmp/
*.log
`;
