type RedisClient = InstanceType<typeof Bun.RedisClient>;

let currentClient: RedisClient | undefined;
let currentUrl = "";

export const getRedisState = (): { client: RedisClient; url: string } => {
	if (!currentClient) {
		throw new Error("Redis not connected. Call connect first.");
	}
	return { client: currentClient, url: currentUrl };
};

export const setRedisState = (client: RedisClient, url: string): void => {
	currentClient = client;
	currentUrl = url;
};
