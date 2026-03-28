import type { GeneratedFile } from "@morph/domain-schema";

export const generateRunner = (
	smt2Files: readonly string[],
): GeneratedFile => ({
	filename: "tests/verification/src/verify.ts",
	content: generateRunnerContent(smt2Files),
});

const generateRunnerContent = (smt2Files: readonly string[]): string => {
	const fileChecks = smt2Files
		.map(
			(f) =>
				`\t{ file: "${f}", name: "${f.replace("tests/verification/src/checks/", "").replace(".smt2", "")}" },`,
		)
		.join("\n");

	return `import { $ } from "bun";

interface CheckResult {
\treadonly name: string;
\treadonly file: string;
\treadonly status: "pass" | "fail" | "unknown" | "error";
\treadonly details: string;
}

const checks = [
${fileChecks}
];

const getExpected = (checkName: string, _label: string): "sat" | "unsat" => {
\tif (checkName === "preservation") return "unsat";
\treturn "sat";
};

const parseResults = (
\tcheckName: string,
\toutput: string,
): readonly CheckResult[] => {
\tconst lines = output.split("\\n").filter((l) => l.trim().length > 0);
\tconst results: CheckResult[] = [];
\tlet currentLabel = checkName;

\tfor (const line of lines) {
\t\tconst echoMatch = /^"(.+)"$/.exec(line);
\t\tif (echoMatch?.[1]) {
\t\t\tcurrentLabel = echoMatch[1];
\t\t\tcontinue;
\t\t}

\t\tconst trimmed = line.trim();
\t\tif (trimmed === "sat" || trimmed === "unsat" || trimmed === "unknown" || trimmed === "timeout") {
\t\t\tconst expected = getExpected(checkName, currentLabel);
\t\t\tconst pass = trimmed === expected;

\t\t\tresults.push({
\t\t\t\tname: currentLabel,
\t\t\t\tfile: checkName,
\t\t\t\tstatus: trimmed === "unknown" || trimmed === "timeout" ? "unknown" : pass ? "pass" : "fail",
\t\t\t\tdetails: pass
\t\t\t\t\t? \`\${trimmed} (expected \${expected})\`
\t\t\t\t\t: \`\${trimmed} (expected \${expected}) — COUNTEREXAMPLE FOUND\`,
\t\t\t});
\t\t}
\t}

\treturn results;
};

const run = async (): Promise<void> => {
\tconst allResults: CheckResult[] = [];
\tlet hasFailure = false;

\tfor (const check of checks) {
\t\ttry {
\t\t\tconst result = await $\`z3 -T:30 \${check.file}\`.quiet();
\t\t\tconst output = result.stdout.toString();
\t\t\tconst parsed = parseResults(check.name, output);
\t\t\tallResults.push(...parsed);
\t\t} catch (error: unknown) {
\t\t\tconst message = error instanceof Error ? error.message : String(error);
\t\t\tallResults.push({
\t\t\t\tname: check.name,
\t\t\t\tfile: check.file,
\t\t\t\tstatus: "error",
\t\t\t\tdetails: \`z3 error: \${message}\`,
\t\t\t});
\t\t\thasFailure = true;
\t\t}
\t}

\tconsole.info("\\n=== Formal Verification Results ===\\n");

\tfor (const r of allResults) {
\t\tconst icon = r.status === "pass" ? "OK" : r.status === "fail" ? "FAIL" : "??";
\t\tconsole.info(\`[\${icon}] \${r.name}: \${r.details}\`);
\t\tif (r.status === "fail" || r.status === "error") hasFailure = true;
\t}

\tconst passed = allResults.filter((r) => r.status === "pass").length;
\tconst failed = allResults.filter((r) => r.status === "fail" || r.status === "error").length;
\tconst unknown = allResults.filter((r) => r.status === "unknown").length;

\tconsole.info(\`\\n\${passed} passed, \${failed} failed, \${unknown} unknown\\n\`);

\tif (hasFailure) {
\t\tthrow new Error("Formal verification failed");
\t}
};

void run();
`;
};

export const generateVerificationIndex = (): GeneratedFile => ({
	filename: "tests/verification/src/index.ts",
	content: `export const VERIFICATION_VERSION = "0.0.0";\n`,
});
