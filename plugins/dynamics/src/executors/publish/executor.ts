import { ExecutorContext, logger, runExecutor } from "@nx/devkit";
import { join } from "path";
import { getBuildOptions } from "../utils/getBuildOptions";
import { getBuildTarget } from "../utils/getBuildTarget";
import { Credentials, requestCredentials } from "./credentials";
import { DeployExecutorSchema } from "./schema";
import { getFilesFromFolder, splitArrayToChunks, waitSeconds } from "./utils";
import { WebResource, createWebResource, listWebResources, publishWebResources, updateWebResource } from "./webresources";

type FileResource = {
	relativeFilePath: string;
	webResourceName: string;
	webResourceId?: string;
};

export default async function executor(options: DeployExecutorSchema, context: ExecutorContext): Promise<{ success: boolean }> {
	process.env["NODE_ENV"] ??= context?.configurationName ?? "production";

	const buildResult = await runBuild(options, context);
	if (!buildResult.success) {
		return buildResult;
	}

	const distDir = getDistDir(options, context);
	const credentials = await requestCredentials();

	logger.info("Getting the list of existing web resources.");

	const webResources = await listWebResources(credentials.url, options.webResourcePath, credentials.cookie);
	const fileResources = await listFilesToDeploy(distDir, options.webResourcePath);

	fillExistingIds(webResources, fileResources);
	await deploy(fileResources, credentials, distDir, options.webResourcePath);

	assertAllIdsAreFilled(fileResources);
	await publish(fileResources, credentials);

	return {
		success: true,
	};
}

function getDistDir(options: DeployExecutorSchema, context: ExecutorContext) {
	const buildTarget = getBuildTarget(options, context);
	const buildOptions = getBuildOptions(buildTarget, options, context);
	return join(context.root, buildOptions.outputPath);
}

async function runBuild(options: DeployExecutorSchema, context: ExecutorContext): Promise<{ success: boolean }> {
	const buildTarget = getBuildTarget(options, context);

	logger.info(`Building target ${buildTarget.project}:${buildTarget.target}:${buildTarget.configuration}.`);

	const buildIterator = await runExecutor(buildTarget, { ...options.buildTargetOptions, watch: false }, context);

	for await (const buildResult of buildIterator) {
		if (!buildResult.success) {
			return buildResult;
		}
	}

	return { success: true };
}

async function listFilesToDeploy(distDir: string, webResourcePath: string): Promise<FileResource[]> {
	const distFiles = await getFilesFromFolder(distDir);
	const filteredDistFiles = distFiles.filter(file => /\.(html|js|css)$/i.test(file));

	return filteredDistFiles.map(relativeFilePath => ({
		relativeFilePath,
		webResourceName: webResourcePath + "/" + relativeFilePath.replaceAll("\\", "/"),
	}));
}

function fillExistingIds(webResources: WebResource[], fileResources: FileResource[]): void {
	const webResourcesByName = new Map<string, WebResource>();

	for (const webResource of webResources) {
		webResourcesByName.set(webResource.name, webResource);
	}

	for (const fileResource of fileResources) {
		const existingWebResource = webResourcesByName.get(fileResource.webResourceName);

		if (existingWebResource) {
			fileResource.webResourceId = existingWebResource.webresourceid;
		}
	}
}

function assertAllIdsAreFilled(fileResources: FileResource[]): asserts fileResources is Required<FileResource>[] {
	for (const fileResource of fileResources) {
		if (fileResource.webResourceId == null) {
			throw new Error(`Web resource id for ${fileResource.webResourceName} is not filled.`);
		}
	}
}

async function deploy(filesToDeploy: FileResource[], credentials: Credentials, distDir: string, webResourcePath: string) {
	let doneCount = 0;
	const totalCount = filesToDeploy.length;

	async function updateProgress(resource: string) {
		doneCount++;
		logger.info(`Deploying web resource: ${resource} (${doneCount} of ${totalCount})`);
	}

	logger.info("Deploying web resources.");

	const chunks = splitArrayToChunks(filesToDeploy, 100);

	for (let i = 0; i < chunks.length; i++) {
		const chunk = chunks[i];
		if (i > 0) {
			await waitSeconds(60);
		}
		await Promise.all(chunk.map(deployResource));
	}

	async function deployResource(resource: FileResource) {
		if (resource.webResourceId != null) {
			await updateWebResource(credentials.url, resource.webResourceId, distDir, resource.relativeFilePath, credentials.cookie);
		} else {
			resource.webResourceId = await createWebResource(credentials.url, webResourcePath, distDir, resource.relativeFilePath, credentials.cookie);
		}

		await updateProgress(resource.webResourceName);
	}
}

async function publish(fileResources: Required<FileResource>[], credentials: Credentials) {
	logger.info("Publishing.");

	const idsForPublish = fileResources.map(webResource => webResource.webResourceId);
	await publishWebResources(credentials.url, credentials.cookie, idsForPublish);

	logger.info("Published.");
}
