import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

interface Config {
	readonly apiUrl?: string;
	readonly token?: string;
}

export const createConfigManager = (appName: string, envPrefix: string) => {
	const configDir = path.join(os.homedir(), ".config", appName);
	const configFile = path.join(configDir, "config.json");

	const readConfig = (): Config => {
		try {
			const content = fs.readFileSync(configFile, "utf8");
			return JSON.parse(content) as Config;
		} catch {
			return {};
		}
	};

	const writeConfig = (config: Config): void => {
		fs.mkdirSync(configDir, { recursive: true });
		fs.writeFileSync(configFile, JSON.stringify(config, undefined, 2) + "\n");
	};

	const getApiUrl = (): string => {
		const envUrl = process.env[`${envPrefix}_API_URL`];
		if (envUrl) return envUrl;

		const config = readConfig();
		if (config.apiUrl) return config.apiUrl;

		console.error(
			`API URL not configured. Run: ${appName} config --api-url <url>`,
		);
		process.exit(1);
	};

	const getToken = (): string | undefined => {
		const envToken = process.env[`${envPrefix}_API_TOKEN`];
		if (envToken) return envToken;

		const config = readConfig();
		return config.token;
	};

	const createClientConfig = () => {
		const token = getToken();
		return token ? { baseUrl: getApiUrl(), token } : { baseUrl: getApiUrl() };
	};

	return { readConfig, writeConfig, getApiUrl, getToken, createClientConfig };
};
