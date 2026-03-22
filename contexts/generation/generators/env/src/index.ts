export type AppType = "api" | "cli" | "mcp" | "ui";

export interface EnvFeatures {
	hasAuth?: boolean;
	hasEntities?: boolean;
	hasEvents?: boolean;
}

export const generate = (
	envPrefix: string,
	appType: AppType,
	features: EnvFeatures,
): string => {
	const lines: string[] = [
		`# ${envPrefix} Environment Configuration`,
		`# Copy this file to .env and customize for your environment`,
		"",
	];

	if (features.hasEntities) {
		lines.push("# Storage backend: memory, jsonfile, sqlite, redis");
		lines.push(`${envPrefix}_STORAGE=memory`);
		lines.push("");
		lines.push("# JSON file storage path (when using jsonfile)");
		lines.push(`${envPrefix}_DATA_FILE=.data.json`);
		lines.push("");
	}

	if (features.hasEvents) {
		lines.push("# Event store backend: memory, jsonfile, redis");
		lines.push(`${envPrefix}_EVENT_STORE=memory`);
		lines.push("");
	}

	if (appType === "api") {
		lines.push("# Server port");
		lines.push("PORT=3000");
		lines.push("");
	}

	if (appType === "ui") {
		lines.push("# UI server port");
		lines.push("PORT=8080");
		lines.push("");
		lines.push("# API URL for backend calls");
		lines.push(`${envPrefix}_API_URL=http://localhost:3000`);
		lines.push("");
	}

	if (features.hasAuth) {
		lines.push(
			"# JWT secret for token signing (generate a secure random value)",
		);
		lines.push(`${envPrefix}_JWT_SECRET=change-me-in-production`);
		lines.push("");
	}

	lines.push("# Node environment (development, test, production)");
	lines.push("NODE_ENV=development");
	lines.push("");

	return lines.join("\n");
};
