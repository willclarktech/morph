const FORMAT_MIME: Record<string, string> = {
	json: "application/json",
	yaml: "application/x-yaml",
	protobuf: "application/x-protobuf",
};

export const authHeaders = (token?: string): Record<string, string> =>
	token ? { Authorization: `Bearer ${token}` } : {};

export const jsonHeaders = (
	token?: string,
	format?: string,
): Record<string, string> => {
	const mime = (format && FORMAT_MIME[format]) ?? "application/json";
	return {
		Accept: mime,
		"Content-Type": mime,
		...authHeaders(token),
	};
};
