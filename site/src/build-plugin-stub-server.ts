import type { BunPlugin } from "bun";

const SERVER_MODULE_PATTERN =
	/^(bun|bun:.+|node:.+|@modelcontextprotocol\/.*)$/;

const noop = "() => {}";
const noopAsync = "async () => {}";

const stubs: Record<string, string> = {
	bun: `export class Glob {}; export const $ = ${noop}; export default {};`,
	"bun:sqlite": `export class Database {}; export default {};`,
	"bun:test": `export const test = ${noop}; export const expect = ${noop}; export const describe = ${noop}; export default {};`,
	"node:fs": `export const readFileSync = ${noop}; export const existsSync = () => false; export const mkdirSync = ${noop}; export const writeFileSync = ${noop}; export const mkdtempSync = ${noop}; export const rmSync = ${noop}; export default {};`,
	"node:fs/promises": `export const mkdir = ${noopAsync}; export const readdir = ${noopAsync}; export const rm = ${noopAsync}; export const cp = ${noopAsync}; export default {};`,
	"node:path": `const join = (...a) => a.join("/"); export const resolve = join; export const dirname = (p) => p; export const basename = (p) => p; export { join }; export default { join, resolve, dirname, basename };`,
	"node:os": `export const homedir = () => "/"; export const tmpdir = () => "/tmp"; export default { homedir, tmpdir };`,
	"node:child_process": `export const execSync = ${noop}; export default {};`,
	"node:crypto": `export const randomUUID = () => "00000000-0000-0000-0000-000000000000"; export default {};`,
	"node:readline": `export const createInterface = ${noop}; export default {};`,
	"node:process": `export default {};`,
	"node:url": `export const fileURLToPath = (u) => String(u); export const URL = globalThis.URL; export default { fileURLToPath };`,
};

const mcpStub = `export class McpServer {}; export class StdioServerTransport {}; export default {};`;

const fallbackStub = `export default {};`;

export const stubServerModules: BunPlugin = {
	name: "stub-server-modules",
	setup(build) {
		build.onResolve({ filter: SERVER_MODULE_PATTERN }, ({ path }) => ({
			path,
			namespace: "server-stub",
		}));

		build.onLoad({ filter: /.*/, namespace: "server-stub" }, ({ path }) => {
			let contents = stubs[path];
			contents ??= path.startsWith("@modelcontextprotocol/")
				? mcpStub
				: fallbackStub;
			return { contents, loader: "js" };
		});
	},
};
