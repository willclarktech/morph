/**
 * README.md generation for UI app.
 */

/**
 * Generate README.md for UI app.
 */
export const generateReadme = (appName: string, envPrefix: string): string =>
	`# ${appName} UI

Web interface for ${appName}.

## Running

\`\`\`sh
# Ensure API server is running first
bun start
\`\`\`

Open http://localhost:4000

## Environment

| Variable | Default | Description |
|----------|---------|-------------|
| \`PORT\` | 4000 | UI server port |
| \`${envPrefix}_API_URL\` | http://localhost:3000 | API server URL |
`;
