import * as devkit from "@nx/devkit";
import { ExecutorContext, Target, logger } from "@nx/devkit";
import path, { win32 } from "path";
import * as credentials from "./credentials";
import runExecutor from "./executor";
import { DeployExecutorSchema } from "./schema";
import * as utils from "./utils";
import * as webresources from "./webresources";

describe("Publish Executor", () => {
	let options: DeployExecutorSchema;
	let context: ExecutorContext;

	beforeEach(() => {
		options = {
			webResourcePath: "resco_MobileCRM/Whatever",
			buildTarget: "my-app:build:production",
			buildTargetOptions: {
				some: "build-option",
			},
		};

		context = {
			root: "/root",
			cwd: "/current",
			isVerbose: false,
			projectName: "my-app",
			targetName: "build",
			configurationName: "production",
			taskGraph: {
				roots: [],
				dependencies: {},
				tasks: {},
			},
			projectGraph: {
				nodes: {
					"my-app": {
						type: "app",
						name: "my-app",
						data: {
							root: "/root",
							targets: {
								build: {
									options: {
										some: "option",
									},
								},
							},
						},
					},
				},
				dependencies: {},
			},
		};

		jest.spyOn(devkit, "readTargetOptions").mockImplementation((target: Target) => ({
			outputPath: `/some/path/dist/${target.project}`,
		}));

		jest.spyOn(credentials, "requestCredentials").mockResolvedValue({
			url: "https://some.dynamics.com",
			cookie: "some-cookie",
		});
		jest.spyOn(webresources, "listWebResources").mockResolvedValue([
			{
				name: "resco_MobileCRM/Whatever/subfolder/some.css",
				webresourceid: "85d50775-d81c-4876-8af0-9366a0d32bc0",
			},
		]);
		jest.spyOn(webresources, "createWebResource").mockResolvedValue("some-id");
		jest.spyOn(webresources, "updateWebResource").mockResolvedValue();
		jest.spyOn(webresources, "publishWebResources").mockResolvedValue();

		jest.spyOn(utils, "getFilesFromFolder").mockResolvedValue(["index.html", "subfolder/some.css"]);

		jest.spyOn(logger, "info").mockImplementation();
		jest.spyOn(logger, "warn").mockImplementation();
		jest.spyOn(logger, "error").mockImplementation();
	});

	it("says that it is deploying", async () => {
		buildWill("succeed");
		await runExecutor(options, context);
		expect(logger.info).toHaveBeenCalledWith("Deploying web resources.");
	});

	it("runs the build target first", async () => {
		buildWill("succeed");
		const { success } = await runExecutor(options, context);
		expect(success).toBe(true);
		expect(devkit.runExecutor).toHaveBeenCalledTimes(1);
		expect(devkit.runExecutor).toHaveBeenCalledWith(
			{
				configuration: "production",
				project: "my-app",
				target: "build",
			},
			{
				some: "build-option",
				watch: false,
			},
			context
		);
	});

	it("if the build fails, we fail", async () => {
		buildWill("fail");
		const { success } = await runExecutor(options, context);
		expect(success).toBe(false);
	});

	it("if subsequent build fails, we fail", async () => {
		buildWill("succeed", "succeed", "fail");
		const { success } = await runExecutor(options, context);
		expect(success).toBe(false);
	});

	it("will not start retrieval of files for deployment nor ask user for credentials nor retrieve existing webresources if the build fails", async () => {
		buildWill("fail");
		await runExecutor(options, context);
		expect(credentials.requestCredentials).not.toHaveBeenCalled();
		expect(utils.getFilesFromFolder).not.toHaveBeenCalled();
		expect(webresources.listWebResources).not.toHaveBeenCalled();
	});

	it("will ask user for credentials", async () => {
		buildWill("succeed");
		await runExecutor(options, context);
		expect(credentials.requestCredentials).toHaveBeenCalled();
	});

	it("will retrieve all existing webresources from the webResourcePath folder", async () => {
		buildWill("succeed");
		await runExecutor(options, context);
		expect(webresources.listWebResources).toHaveBeenCalledWith("https://some.dynamics.com", "resco_MobileCRM/Whatever", "some-cookie");
	});

	it("will retrieve list of all files for deployment in the dist file", async () => {
		buildWill("succeed");
		await runExecutor(options, context);
		expect(utils.getFilesFromFolder).toHaveBeenCalledWith("/root/some/path/dist/my-app");
	});

	it("will update existing web resources", async () => {
		buildWill("succeed");
		await runExecutor(options, context);
		expect(webresources.updateWebResource).toHaveBeenCalledTimes(1);
		expect(webresources.updateWebResource).toHaveBeenCalledWith(
			"https://some.dynamics.com",
			"85d50775-d81c-4876-8af0-9366a0d32bc0",
			"/root/some/path/dist/my-app",
			"subfolder/some.css",
			"some-cookie"
		);
	});

	it("will create new web resources", async () => {
		buildWill("succeed");
		await runExecutor(options, context);
		expect(webresources.createWebResource).toHaveBeenCalledTimes(1);
		expect(webresources.createWebResource).toHaveBeenCalledWith(
			"https://some.dynamics.com",
			"resco_MobileCRM/Whatever",
			"/root/some/path/dist/my-app",
			"index.html",
			"some-cookie"
		);
	});

	it("will publish the web resources", async () => {
		buildWill("succeed");
		await runExecutor(options, context);
		expect(webresources.publishWebResources).toHaveBeenCalledWith("https://some.dynamics.com", "some-cookie", [
			"some-id",
			"85d50775-d81c-4876-8af0-9366a0d32bc0",
		]);
	});

	it("will work with windows paths", async () => {
		jest.spyOn(path, "join").mockImplementation(win32.join);
		jest.spyOn(path, "relative").mockImplementation(win32.relative);
		jest.mocked(utils.getFilesFromFolder).mockResolvedValue(["index.html", "subfolder\\some.css"]);
		context.root = "c:\\root";

		buildWill("succeed");
		await runExecutor(options, context);

		expect(webresources.createWebResource).toHaveBeenCalledWith(
			"https://some.dynamics.com",
			"resco_MobileCRM/Whatever",
			"c:\\root\\some\\path\\dist\\my-app",
			"index.html",
			"some-cookie"
		);
		expect(webresources.updateWebResource).toHaveBeenCalledWith(
			"https://some.dynamics.com",
			"85d50775-d81c-4876-8af0-9366a0d32bc0",
			"c:\\root\\some\\path\\dist\\my-app",
			"subfolder\\some.css",
			"some-cookie"
		);
		expect(webresources.publishWebResources).toHaveBeenCalledWith("https://some.dynamics.com", "some-cookie", [
			"some-id",
			"85d50775-d81c-4876-8af0-9366a0d32bc0",
		]);
	});

	it("prints files names that are being published", async () => {
		buildWill("succeed");
		await runExecutor(options, context);
		expect(logger.info).toHaveBeenCalledWith("Deploying web resource: resco_MobileCRM/Whatever/index.html (1 of 2)");
		expect(logger.info).toHaveBeenCalledWith("Deploying web resource: resco_MobileCRM/Whatever/subfolder/some.css (2 of 2)");
	});

	type BuildResult = "succeed" | "fail" | "terminate";

	function buildWill(...what: BuildResult[]): void {
		jest.spyOn(devkit, "runExecutor").mockResolvedValue(
			(async function* () {
				for (const buildResult of what) {
					if (buildResult === "terminate") {
						return { success: false };
					} else {
						yield {
							success: buildResult === "succeed",
						};
					}
				}

				return { success: true };
			})()
		);
	}
});
