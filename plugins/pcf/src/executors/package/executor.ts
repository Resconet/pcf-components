import { ExecutorContext, logger, runExecutor } from "@nx/devkit";
import { WebpackExecutorOptions } from "@nx/webpack";
import { DOMParser } from "@xmldom/xmldom";
import { readFileSync } from "fs";
import { mkdir, readFile, readdir, writeFile } from "fs/promises";
import * as JSZip from "jszip";
import { dirname, join, posix, resolve } from "path";
import { env } from "process";
import { getBuildOptions } from "../../utils/getBuildOptions";
import { getBuildTarget } from "../../utils/getBuildTarget";
import { PackageExecutorSchema } from "./schema";

export default async function runPackageExecutor(options: PackageExecutorSchema, context: ExecutorContext) {
	process.env["NODE_ENV"] ??= context?.configurationName ?? "development";

	const buildResult = await runBuild(options, context);

	if (buildResult.success) {
		await prepareZip(options, context);
	}

	return buildResult;
}

async function prepareZip(options: PackageExecutorSchema, context: ExecutorContext) {
	const buildTargetOptions = getBuildTargetMergedOptions(options, context);
	const outputPath = buildTargetOptions.outputPath;
	const { namespace, componentName } = await parseManifest(join(context.root, outputPath, "ControlManifest.xml"));
	const controlFilesPathInZip = `Controls/${namespace}.${componentName}`;
	const buildFiles = await enumerateFiles(join(context.root, outputPath));

	const version = await getVersion(context);

	const vars: TemplateVars = {
		namespace,
		componentName,
		version,
		prefix: options.prefix,
		publisher: options.publisher,
		managedFlag: options.managed ? "1" : "0",
	};

	const jszip = new JSZip();

	jszip.file("[Content_Types].xml", loadTemplate("files/contentTypes.xml.template", vars));
	jszip.file("customizations.xml", loadTemplate("files/customizations.xml.template", vars));
	jszip.file("solution.xml", loadTemplate("files/solution.xml.template", vars));

	for (const buildFile of buildFiles) {
		const buildFileFullPath = join(context.root, outputPath, buildFile);
		const fileContent = await readFile(buildFileFullPath);
		const filePathInZip = posix.join(controlFilesPathInZip, buildFile);
		jszip.file(filePathInZip, fileContent);
	}

	const zip = await jszip.generateAsync({ type: "nodebuffer" });

	const outPath = join(context.root, options.outputPath.replace("{version}", version));

	await mkdirRecursive(dirname(outPath));
	await writeFile(outPath, zip);

	logger.log();
	logger.info(`${options.managed ? "Managed" : "Unmanaged"} solution package created at ${outPath}`);
}

function getBuildTargetMergedOptions(options: PackageExecutorSchema, context: ExecutorContext) {
	const buildTarget = getBuildTarget(options.buildTarget, context);
	const buildTargetOptions = getBuildOptions<WebpackExecutorOptions>(buildTarget, options, context);

	if (!buildTargetOptions.outputPath) {
		throw new Error("Output path is not set in the build target options.");
	}

	return buildTargetOptions;
}

async function enumerateFiles(directoryPath: string): Promise<string[]> {
	return (await readdir(directoryPath, { recursive: true, withFileTypes: true }))
		.filter(f => f.isFile())
		.map(f => join(f.path.substring(directoryPath.length + 1), f.name));
}

async function mkdirRecursive(directoryPath: string): Promise<void> {
	const fullPath = resolve(directoryPath);
	await mkdir(fullPath, { recursive: true });
}

type TemplateVars = {
	namespace: string;
	componentName: string;
	version: string;
	prefix: string;
	publisher: string;
	managedFlag: string;
};

/**
 * Reads a template and applies the given variables to it.
 */
function loadTemplate(templatePath: string, vars: TemplateVars): string {
	const template = readFileSync(join(__dirname, templatePath), "utf8");
	return replaceTemplateVars(template, vars);
}

function replaceTemplateVars(input: string, { namespace, componentName, version, prefix, publisher, managedFlag }: TemplateVars): string {
	return input
		.replaceAll("<%= componentNamespace %>", namespace)
		.replaceAll("<%= componentName %>", componentName)
		.replaceAll("<%= version %>", version)
		.replaceAll("<%= prefix %>", prefix)
		.replaceAll("<%= publisher %>", publisher)
		.replaceAll("<%= managedFlag %>", managedFlag);
}

async function parseManifest(manifestPath: string): Promise<{ version: string; namespace: string; componentName: string }> {
	const xmlContent = await readFile(manifestPath, "utf8");
	const parser = new DOMParser();
	const xmlDoc = parser.parseFromString(xmlContent, "text/xml");
	const controlElement = xmlDoc.getElementsByTagName("control")[0];
	const manifestVersion = controlElement?.getAttribute("version");
	const namespace = controlElement?.getAttribute("namespace");
	const componentName = controlElement?.getAttribute("constructor");

	if (!manifestVersion || !namespace || !componentName) {
		throw new Error("Missing required attributes in ControlManifest.xml");
	}

	const version = manifestVersionToSolutionVersion(manifestVersion);

	return { version, namespace, componentName };
}

async function runBuild(options: PackageExecutorSchema, context: ExecutorContext) {
	const buildTarget = getBuildTarget(options.buildTarget, context);
	const buildIterator = await runExecutor(buildTarget, options.buildTargetOptions ?? {}, context);

	for await (const buildResult of buildIterator) {
		if (!buildResult.success) {
			return buildResult;
		}
	}

	return {
		success: true,
	};
}

async function getVersion(context: ExecutorContext): Promise<string> {
	if (!context.projectName) {
		throw new Error("Project name is not set in the context.");
	}

	const projectRoot = context.workspace?.projects[context.projectName].root;

	if (!projectRoot) {
		throw new Error("Project root not found.");
	}

	const packageJsonPath = join(context.root, projectRoot, "package.json");
	const { version } = JSON.parse(await readFile(packageJsonPath, "utf8")) as { version: string | undefined };

	if (!version) {
		throw new Error("Version is not set in package.json.");
	}

	return manifestVersionToSolutionVersion(version);
}

function manifestVersionToSolutionVersion(manifestVersion: string) {
	const shortSemverRegex = /^(\d+\.\d+\.\d+)(-\w+)?$/;
	const longSemverRegex = /^(\d+\.\d+\.\d+)(-\w+)(\.\d+)$/;
	const counter = env["RELEASE_COUNTER"] ?? "0";
	const solutionVersion = longSemverRegex.test(manifestVersion)
		? manifestVersion.replace(longSemverRegex, "$1$3")
		: manifestVersion.replace(shortSemverRegex, `$1.${counter}`);
	return solutionVersion;
}
