import { parse } from "../contexts/schema-dsl/parser/src/index";
import { compile } from "../contexts/schema-dsl/compiler/src/index";
import { decompile } from "../contexts/schema-dsl/decompiler/src/index";

const glob = new Bun.Glob("**/*.morph");
const root = import.meta.dir + "/..";
const files = Array.from(glob.scanSync({ cwd: root }))
	.filter((f) => !f.includes("node_modules") && !f.startsWith(".worktrees/"))
	.sort();

let formatted = 0;
let unchanged = 0;
let failed = 0;

for (const rel of files) {
	const abs = `${import.meta.dir}/../${rel}`;
	const file = Bun.file(abs);
	const source = await file.text();

	const parseResult = parse(source);
	if (!parseResult.ast || parseResult.errors.length > 0) {
		console.error(`  SKIP ${rel}: parse errors`);
		failed++;
		continue;
	}

	const compileResult = compile(parseResult.ast);
	if (!compileResult.schema || compileResult.errors.length > 0) {
		console.error(`  SKIP ${rel}: compile errors`);
		failed++;
		continue;
	}

	const result = decompile(compileResult.schema);
	if (result === source) {
		console.info(`  OK   ${rel} (unchanged)`);
		unchanged++;
	} else {
		await Bun.write(abs, result);
		console.info(`  FMT  ${rel}`);
		formatted++;
	}
}

console.info(
	`\nDone: ${formatted} formatted, ${unchanged} unchanged, ${failed} failed`,
);
