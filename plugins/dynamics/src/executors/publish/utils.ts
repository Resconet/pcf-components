import { readdir, stat } from "fs/promises";
import { join } from "path";

export async function getFilesFromFolder(dir: string): Promise<string[]> {
	return getFilesFromFolderWithRelativePath(dir);
}

async function getFilesFromFolderWithRelativePath(dir: string, prefix = ""): Promise<string[]> {
	let results: string[] = [];
	const dirContent = await readdir(dir);

	for (const fileOrDir of dirContent) {
		const fullPath = join(dir, fileOrDir);
		const statResult = await stat(fullPath);
		if (statResult && statResult.isDirectory()) {
			results = results.concat(await getFilesFromFolderWithRelativePath(fullPath, join(prefix, fileOrDir)));
		} else {
			results.push(join(prefix, fileOrDir));
		}
	}
	return results;
}

export async function waitSeconds(seconds: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

export function splitArrayToChunks<T>(array: T[], chunkSize: number): T[][] {
	const chunks = [];
	for (let i = 0; i < array.length; i += chunkSize) {
		chunks.push(array.slice(i, i + chunkSize));
	}
	return chunks;
}
