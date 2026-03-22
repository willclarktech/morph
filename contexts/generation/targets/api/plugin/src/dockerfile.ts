import { buildDockerfile } from "@morph/builder-app";

export const generateApiDockerfile = (name: string): string =>
	buildDockerfile({
		name,
		build: {
			libs: ["dsl", "core"],
			appDir: "api",
			extraFiles: ["schema.json"],
		},
		production: {
			baseImage: "oven/bun:1-alpine",
			workdir: "/app/apps/api",
			copyFrom: "full-app",
			port: 3000,
			healthCheckPath: "/health",
			cmd: ["bun", "start"],
		},
	});
