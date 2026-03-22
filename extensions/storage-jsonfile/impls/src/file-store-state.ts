let currentPath = "";

export const getFileStorePath = (): string => currentPath;

export const setFileStorePath = (path: string): void => {
	currentPath = path;
};
