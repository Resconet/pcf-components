import { Dirent, Stats } from "fs";
import fsPromises from "fs/promises";
import { getFilesFromFolder } from "./utils";

describe("getFilesFromFolder", () => {
	it("returns the list of files in the folder with relative paths", async () => {
		mockFiles();
		const result = await getFilesFromFolder("/path/to/dist");
		expect(result).toStrictEqual(["file.svg", "file.xxx", "subfolder/file.svg"]);
	});
});

function mockFiles() {
	jest.spyOn(fsPromises, "readdir").mockImplementation(async path => {
		if (path === "/path/to/dist") {
			return ["file.svg", "file.xxx", "subfolder"] as unknown as Dirent[];
		} else if (path === "/path/to/dist/subfolder") {
			return ["file.svg"] as unknown as Dirent[];
		} else {
			return [];
		}
	});

	jest.spyOn(fsPromises, "stat").mockImplementation(async path => {
		if (path === "/path/to/dist" || path === "/path/to/dist/subfolder") {
			return { isDirectory: () => true } as Stats;
		} else {
			return { isDirectory: () => false } as Stats;
		}
	});

	jest.spyOn(fsPromises, "readFile").mockImplementation(async path => {
		if (path === "/path/to/dist/file.svg" || path === "/path/to/dist/file.xxx") {
			return Buffer.from("file content");
		} else if (path === "/path/to/dist/subfolder/file.svg") {
			return Buffer.from("subfolder file content");
		} else {
			const error: NodeJS.ErrnoException = new Error("ENOENT");
			error.code = "ENOENT";
			throw error;
		}
	});
}
