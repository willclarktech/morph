import { buildDockerfile } from "@morphdsl/builder-app";

export const generateCliDockerfile = (name: string): string =>
	buildDockerfile({
		name,
		build: {
			libs: ["dsl", "core"],
			appDir: "cli",
			extraFiles: ["schema.json"],
			buildCommand: `bun build apps/cli/src/index.ts --compile --outfile /app/${name}`,
		},
		production: {
			baseImage: "alpine:3.19",
			workdir: "/app",
			copyFrom: { binary: name },
			entrypoint: [`./${name}`],
			comment: "# Production stage - minimal image with just the binary",
		},
	});
