import { ExecutorContext, PromiseExecutor } from "@nx/devkit";
import { existsSync, readdirSync } from "fs";
import { writeFile, mkdir, readFile } from "fs/promises";
import { compileFromFile } from "json-schema-to-typescript";
import { JsonSchemaToTypesExecutorSchema } from "./schema";
import { join, extname, basename, relative, dirname } from "path";

const runExecutor: PromiseExecutor<JsonSchemaToTypesExecutorSchema> = async (options: JsonSchemaToTypesExecutorSchema, context: ExecutorContext) => {
	const prettierConfigFile = options.prettierConfigFile ?? ".prettierrc";
	await generateTypeFiles(
		join(context.root, options.schemaDirectory),
		join(context.root, options.generatedDirectory),
		join(context.root, prettierConfigFile)
	);
	return {
		success: true,
	};
};

async function generate(schemaFile: string, generatedFile: string, prettierStyleOptions: { [key: string]: string }) {
	await writeFile(generatedFile, await compileFromFile(schemaFile, { style: prettierStyleOptions }));
}

async function generateTypeFiles(schemaDirectory: string, generatedDirectory: string, prettierOptionsFile: string) {
	const schemaFiles = readdirSync(schemaDirectory, { recursive: true, withFileTypes: true })
		.filter(dirent => dirent.isFile() && extname(dirent.name) === ".json")
		.map(dirent => join(dirent.path, dirent.name));
	const prettierOptionsFromFile = JSON.parse(await readFile(prettierOptionsFile, "utf8"));
	// add using tab to formatting config. This config property is in .editorconfig and not in .prettierrc
	const prettierOptions = { ...prettierOptionsFromFile, useTabs: true };

	const schemaGeneratedFilePairs = schemaFiles.map(file => {
		const relativeFile = relative(schemaDirectory, file);
		const baseFileName = basename(file, ".json");
		const baseDirName = dirname(relativeFile);
		const generatedFileName = join(generatedDirectory, baseDirName, `${baseFileName}.ts`);
		return { schemaFile: file, generatedFile: generatedFileName };
	});

	const uniqueGeneratedDirectories = new Set(schemaGeneratedFilePairs.map(pair => dirname(pair.generatedFile)));
	for (const generatedDirectory of uniqueGeneratedDirectories) {
		if (!existsSync(generatedDirectory)) {
			await mkdir(generatedDirectory, { recursive: true });
		}
	}

	// Writing files in parallel. If the amount of files is too big in future, we will employ `p-limit` for limiting simultaneous writes
	await Promise.all(schemaGeneratedFilePairs.map(pair => generate(pair.schemaFile, pair.generatedFile, prettierOptions)));
}

export default runExecutor;
