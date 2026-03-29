import { buildDockerfile } from "@morphdsl/builder-app";

export const generateClientCliDockerfile = (name: string): string =>
	buildDockerfile({
		name: `${name}-client`,
		build: {
			libs: ["dsl", "client"],
			appDir: "cli-client",
			buildCommand: `bun build apps/cli-client/src/index.ts --compile --outfile /app/${name}-client`,
		},
		production: {
			baseImage: "alpine:3.19",
			workdir: "/app",
			copyFrom: { binary: `${name}-client` },
			entrypoint: [`./${name}-client`],
			comment: "# Production stage - minimal image with just the binary",
		},
	});
