import * as devkit from "@nx/devkit";
import { ExecutorContext, Target, logger } from "@nx/devkit";
import { access, mkdir, readFile, writeFile } from "fs/promises";
import * as JSZip from "jszip";
import { env } from "process";
import executor from "./executor";
import { PackageExecutorSchema } from "./schema";

jest.mock("fs/promises", () => jest.requireActual("memfs").fs.promises);

describe("Package Executor", () => {
	let context: ExecutorContext;
	let options: PackageExecutorSchema;

	beforeEach(async () => {
		context = {
			root: "/root",
			cwd: "/current",
			isVerbose: false,
			projectName: "my-control",
			targetName: "build",
			configurationName: "development",
			taskGraph: {
				roots: [],
				dependencies: {},
				tasks: {},
			},
			workspace: {
				version: 2,
				projects: {
					"my-control": {
						root: "my-control",
						sourceRoot: "my-control/src",
						projectType: "application",
					},
				},
			},
			projectGraph: {
				nodes: {
					"my-control": {
						type: "app",
						name: "my-control",
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
			projectsConfigurations: {
				version: 1,
				projects: {
					"my-control": {
						projectType: "application",
						root: "/root",
						targets: {
							build: {
								executor: "some:executor",
							},
						},
					},
				},
			},
		};

		options = {
			buildTarget: "my-control:build:development",
			buildTargetOptions: {
				main: "build-option",
			},
			prefix: "someprefix",
			publisher: "SomePublisher",
			outputPath: "out/my-control.zip",
		};

		jest.spyOn(console, "error").mockImplementation(e => {
			throw new Error("Console error: " + e);
		});

		jest.spyOn(devkit, "readTargetOptions").mockImplementation((target: Target) => ({
			outputPath: `dist/${target.project}`,
		}));

		jest.spyOn(logger, "log").mockImplementation(() => undefined);
		jest.spyOn(logger, "info").mockImplementation(() => undefined);

		await withPackageJson("4.3.2");
	});

	afterEach(() => {
		delete env["RELEASE_COUNTER"];
	});

	it("runs the build target first", async () => {
		buildWill("succeed");
		const { success } = await executor(options, context);
		expect(success).toBe(true);
		expect(devkit.runExecutor).toHaveBeenCalledTimes(1);
		expect(devkit.runExecutor).toHaveBeenCalledWith(
			{
				configuration: "development",
				project: "my-control",
				target: "build",
			},
			{
				main: "build-option",
			},
			context
		);
	});

	it("if the build fails, we fail", async () => {
		buildWill("fail", "fail", "succeed");
		const { success } = await executor(options, context);
		expect(success).toBe(false);
	});

	it("produces the package with correct list of files", async () => {
		buildWill("succeed");
		const { success } = await executor(options, context);
		expect(success).toBe(true);
		await access("/root/out/my-control.zip");
		expect((await unzipNames("/root/out/my-control.zip")).sort()).toEqual(
			[
				"[Content_Types].xml",
				"customizations.xml",
				"solution.xml",
				"Controls/",
				"Controls/MyNamespace.MyControl/",
				"Controls/MyNamespace.MyControl/ControlManifest.xml",
				"Controls/MyNamespace.MyControl/bundle.js",
			].sort()
		);
	});

	it("has correct customizations.xml content", async () => {
		buildWill("succeed");
		const { success } = await executor(options, context);
		expect(success).toBe(true);
		const unzipped = await unzip("/root/out/my-control.zip");
		const customizations = await unzipped["customizations.xml"].async("text");
		expect(customizations).toMatchInlineSnapshot(`
		"<?xml version="1.0" encoding="utf-8"?>
		<ImportExportXml xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
			<Entities />
			<Roles />
			<Workflows />
			<FieldSecurityProfiles />
			<Templates />
			<EntityMaps />
			<EntityRelationships />
			<OrganizationSettings />
			<optionsets />
			<CustomControls>
				<CustomControl>
					<Name>MyNamespace.MyControl</Name>
					<FileName>/Controls/MyNamespace.MyControl/ControlManifest.xml</FileName>
					<ForceUpdate>true</ForceUpdate>
				</CustomControl>
			</CustomControls>
			<SolutionPluginAssemblies />
			<EntityDataProviders />
			<Languages>
				<Language>1033</Language>
			</Languages>
		</ImportExportXml>
		"
	`);
	});

	it("has correct solution.xml content for unmanaged solution", async () => {
		buildWill("succeed");
		const { success } = await executor(options, context);
		expect(success).toBe(true);
		const unzipped = await unzip("/root/out/my-control.zip");
		const solution = await unzipped["solution.xml"].async("text");
		expect(solution).toMatchInlineSnapshot(`
		"<?xml version="1.0" encoding="utf-8"?>
		<ImportExportXml version="9.1.0.643" SolutionPackageVersion="9.1" languagecode="1033"
			generatedBy="CrmLive" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
			<SolutionManifest>
				<UniqueName>MyNamespaceMyControl</UniqueName>
				<LocalizedNames>
					<LocalizedName description="MyNamespaceMyControl" languagecode="1033" />
				</LocalizedNames>
				<Descriptions />
				<Version>4.3.2.0</Version>
				<Managed>0</Managed>
				<Publisher>
					<UniqueName>SomePublisher</UniqueName>
					<LocalizedNames>
						<LocalizedName description="SomePublisher" languagecode="1033" />
					</LocalizedNames>
					<Descriptions>
						<Description description="SomePublisher" languagecode="1033" />
					</Descriptions>
					<EMailAddress xsi:nil="true"></EMailAddress>
					<SupportingWebsiteUrl xsi:nil="true"></SupportingWebsiteUrl>
					<CustomizationPrefix>someprefix</CustomizationPrefix>
					<CustomizationOptionValuePrefix>64827</CustomizationOptionValuePrefix>
					<Addresses>
					</Addresses>
				</Publisher>
				<RootComponents>
					<RootComponent type="66" schemaName="MyNamespace.MyControl"
						behavior="0" />
				</RootComponents>
				<MissingDependencies />
			</SolutionManifest>
		</ImportExportXml>
		"
	`);
	});

	it("has correct solution.xml content for managed solution", async () => {
		options.managed = true;
		buildWill("succeed");
		const { success } = await executor(options, context);
		expect(success).toBe(true);
		const unzipped = await unzip("/root/out/my-control.zip");
		const solution = await unzipped["solution.xml"].async("text");
		expect(solution).toMatchInlineSnapshot(`
		"<?xml version="1.0" encoding="utf-8"?>
		<ImportExportXml version="9.1.0.643" SolutionPackageVersion="9.1" languagecode="1033"
			generatedBy="CrmLive" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
			<SolutionManifest>
				<UniqueName>MyNamespaceMyControl</UniqueName>
				<LocalizedNames>
					<LocalizedName description="MyNamespaceMyControl" languagecode="1033" />
				</LocalizedNames>
				<Descriptions />
				<Version>4.3.2.0</Version>
				<Managed>1</Managed>
				<Publisher>
					<UniqueName>SomePublisher</UniqueName>
					<LocalizedNames>
						<LocalizedName description="SomePublisher" languagecode="1033" />
					</LocalizedNames>
					<Descriptions>
						<Description description="SomePublisher" languagecode="1033" />
					</Descriptions>
					<EMailAddress xsi:nil="true"></EMailAddress>
					<SupportingWebsiteUrl xsi:nil="true"></SupportingWebsiteUrl>
					<CustomizationPrefix>someprefix</CustomizationPrefix>
					<CustomizationOptionValuePrefix>64827</CustomizationOptionValuePrefix>
					<Addresses>
					</Addresses>
				</Publisher>
				<RootComponents>
					<RootComponent type="66" schemaName="MyNamespace.MyControl"
						behavior="0" />
				</RootComponents>
				<MissingDependencies />
			</SolutionManifest>
		</ImportExportXml>
		"
	`);
	});

	it("replaces {version} in the output path with the solution version created from manifest version, 1.2.3 -> 1.2.3.0", async () => {
		options.outputPath = "out/my-control-{version}.zip";
		buildWithManifestWill(someManifest(), "succeed");
		await withPackageJson("1.2.3");
		const { success } = await executor(options, context);
		expect(success).toBe(true);
		await access("/root/out/my-control-1.2.3.0.zip");
	});

	it("replaces {version} in the output path with the solution version created from manifest version, 1.2.3-beta -> 1.2.3.0", async () => {
		options.outputPath = "out/my-control-{version}.zip";
		buildWithManifestWill(someManifest(), "succeed");
		await withPackageJson("1.2.3-beta");
		const { success } = await executor(options, context);
		expect(success).toBe(true);
		await access("/root/out/my-control-1.2.3.0.zip");
	});

	it("replaces {version} in the output path with the solution version created from manifest version, 1.2.3-beta.4 -> 1.2.3.4", async () => {
		options.outputPath = "out/my-control-{version}.zip";
		buildWithManifestWill(someManifest(), "succeed");
		await withPackageJson("1.2.3-beta.4");
		const { success } = await executor(options, context);
		expect(success).toBe(true);
		await access("/root/out/my-control-1.2.3.4.zip");
	});

	it("replaces {version} in the output path with the solution version created from manifest version, 1.2.3 -> 1.2.3.5 with RELEASE_COUNTER=5", async () => {
		env["RELEASE_COUNTER"] = "5";
		options.outputPath = "out/my-control-{version}.zip";
		buildWithManifestWill(someManifest(), "succeed");
		await withPackageJson("1.2.3");
		const { success } = await executor(options, context);
		expect(success).toBe(true);
		await access("/root/out/my-control-1.2.3.5.zip");
	});

	it("replaces {version} in the output path with the solution version created from manifest version, 1.2.3-beta -> 1.2.3.5 with RELEASE_COUNTER=5", async () => {
		env["RELEASE_COUNTER"] = "5";
		options.outputPath = "out/my-control-{version}.zip";
		buildWithManifestWill(someManifest(), "succeed");
		await withPackageJson("1.2.3-beta");
		const { success } = await executor(options, context);
		expect(success).toBe(true);
		await access("/root/out/my-control-1.2.3.5.zip");
	});

	it("in case of 3-number semver, generates a solution version with .0 at the end by default", async () => {
		buildWithManifestWill(someManifest(), "succeed");
		await withPackageJson("1.2.3");
		const { success } = await executor(options, context);
		expect(success).toBe(true);
		const unzipped = await unzip("/root/out/my-control.zip");
		const solution = await unzipped["solution.xml"].async("text");
		expect(solution).toMatchInlineSnapshot(`
		"<?xml version="1.0" encoding="utf-8"?>
		<ImportExportXml version="9.1.0.643" SolutionPackageVersion="9.1" languagecode="1033"
			generatedBy="CrmLive" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
			<SolutionManifest>
				<UniqueName>MyNamespaceMyControl</UniqueName>
				<LocalizedNames>
					<LocalizedName description="MyNamespaceMyControl" languagecode="1033" />
				</LocalizedNames>
				<Descriptions />
				<Version>1.2.3.0</Version>
				<Managed>0</Managed>
				<Publisher>
					<UniqueName>SomePublisher</UniqueName>
					<LocalizedNames>
						<LocalizedName description="SomePublisher" languagecode="1033" />
					</LocalizedNames>
					<Descriptions>
						<Description description="SomePublisher" languagecode="1033" />
					</Descriptions>
					<EMailAddress xsi:nil="true"></EMailAddress>
					<SupportingWebsiteUrl xsi:nil="true"></SupportingWebsiteUrl>
					<CustomizationPrefix>someprefix</CustomizationPrefix>
					<CustomizationOptionValuePrefix>64827</CustomizationOptionValuePrefix>
					<Addresses>
					</Addresses>
				</Publisher>
				<RootComponents>
					<RootComponent type="66" schemaName="MyNamespace.MyControl"
						behavior="0" />
				</RootComponents>
				<MissingDependencies />
			</SolutionManifest>
		</ImportExportXml>
		"
	`);
	});

	it("in case of 3-number semver, generates a solution version with .X at the end by default if RELEASE_COUNTER env var is set to X", async () => {
		env["RELEASE_COUNTER"] = "456";
		buildWithManifestWill(someManifest(), "succeed");
		await withPackageJson("1.2.3");
		const { success } = await executor(options, context);
		expect(success).toBe(true);
		const unzipped = await unzip("/root/out/my-control.zip");
		const solution = await unzipped["solution.xml"].async("text");
		expect(solution).toMatchInlineSnapshot(`
		"<?xml version="1.0" encoding="utf-8"?>
		<ImportExportXml version="9.1.0.643" SolutionPackageVersion="9.1" languagecode="1033"
			generatedBy="CrmLive" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
			<SolutionManifest>
				<UniqueName>MyNamespaceMyControl</UniqueName>
				<LocalizedNames>
					<LocalizedName description="MyNamespaceMyControl" languagecode="1033" />
				</LocalizedNames>
				<Descriptions />
				<Version>1.2.3.456</Version>
				<Managed>0</Managed>
				<Publisher>
					<UniqueName>SomePublisher</UniqueName>
					<LocalizedNames>
						<LocalizedName description="SomePublisher" languagecode="1033" />
					</LocalizedNames>
					<Descriptions>
						<Description description="SomePublisher" languagecode="1033" />
					</Descriptions>
					<EMailAddress xsi:nil="true"></EMailAddress>
					<SupportingWebsiteUrl xsi:nil="true"></SupportingWebsiteUrl>
					<CustomizationPrefix>someprefix</CustomizationPrefix>
					<CustomizationOptionValuePrefix>64827</CustomizationOptionValuePrefix>
					<Addresses>
					</Addresses>
				</Publisher>
				<RootComponents>
					<RootComponent type="66" schemaName="MyNamespace.MyControl"
						behavior="0" />
				</RootComponents>
				<MissingDependencies />
			</SolutionManifest>
		</ImportExportXml>
		"
	`);
	});

	it("has correct [Content Types].xml content", async () => {
		buildWill("succeed");
		const { success } = await executor(options, context);
		expect(success).toBe(true);
		const unzipped = await unzip("/root/out/my-control.zip");
		const solution = await unzipped["[Content_Types].xml"].async("text");
		expect(solution).toMatchInlineSnapshot(`
		"<?xml version="1.0" encoding="utf-8"?>
		<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
			<Default Extension="xml" ContentType="text/xml" />
			<Default Extension="js" ContentType="application/octet-stream" />
			<Default Extension="css" ContentType="text/css" />
			<Default Extension="png" ContentType="image/png" />
			<Default Extension="jpg" ContentType="image/jpeg" />
			<Default Extension="jpeg" ContentType="image/jpeg" />
			<Default Extension="svg" ContentType="image/svg+xml" />
			<Default Extension="resx" ContentType="application/octet-stream" />
			<Override
				PartName="/Controls/MyNamespace.MyControl/ControlManifest.xml"
				ContentType="application/octet-stream" />
		</Types>
		"
	`);
	});

	it("has correct dist files contents", async () => {
		buildWill("succeed");
		const { success } = await executor(options, context);
		expect(success).toBe(true);
		const unzipped = await unzip("/root/out/my-control.zip");
		const bundle = await unzipped["Controls/MyNamespace.MyControl/bundle.js"].async("text");
		const manifest = await unzipped["Controls/MyNamespace.MyControl/ControlManifest.xml"].async("text");
		expect(bundle).toEqual(`some bundle data`);
		expect(manifest).toEqual(someManifest());
	});

	it("says after creation of the package where it is and whether it is unmanaged", async () => {
		options.managed = false;
		buildWill("succeed");
		await executor(options, context);
		expect(logger.info).toHaveBeenCalledWith("Unmanaged solution package created at /root/out/my-control.zip");
	});

	it("says after creation of the package where it is and whether it is managed", async () => {
		options.managed = true;
		buildWill("succeed");
		await executor(options, context);
		expect(logger.info).toHaveBeenCalledWith("Managed solution package created at /root/out/my-control.zip");
	});

	type BuildResult = "succeed" | "fail" | "terminate";

	function buildWill(...what: BuildResult[]): string[] {
		return buildWithManifestWill(someManifest(), ...what);
	}

	function buildWithManifestWill(manifest: string, ...what: BuildResult[]): string[] {
		const yields: string[] = [];

		jest.spyOn(devkit, "runExecutor").mockResolvedValue(
			(async function* () {
				for (const buildResult of what) {
					yields.push(buildResult);
					if (buildResult === "terminate") {
						return { success: false };
					} else {
						await mkdir(`/root/dist/my-control`, { recursive: true });
						await writeFile(`/root/dist/my-control/bundle.js`, `some bundle data`);
						await writeFile(`/root/dist/my-control/ControlManifest.xml`, manifest);
						yield {
							success: buildResult === "succeed",
						};
					}
				}

				return { success: false };
			})()
		);

		return yields;
	}
});

async function unzipNames(path: string): Promise<string[]> {
	return Object.keys(await unzip(path));
}

async function unzip(path: string) {
	const zip = new JSZip();
	const { files } = await zip.loadAsync(await readFile(path));
	return files;
}

async function withPackageJson(version: string) {
	await mkdir(`/root/my-control`, { recursive: true });
	await writeFile("/root/my-control/package.json", JSON.stringify({ version }));
}

function someManifest(): string {
	return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
		<manifest>
			<control namespace="MyNamespace" constructor="MyControl" version="5.6.7"
				display-name-key="MyControl_name" description-key="MyControl_description"
				control-type="standard"
				api-version="1.3.11">
				<external-service-usage enabled="false" />
				<property name="sampleProperty" display-name-key="sampleProperty_name"
					description-key="sampleProperty_description" of-type="SingleLine.Text" usage="bound"
					required="false" />
				<resources>
					<code path="main.aac0f018821cd1e0.js" order="1" />
				</resources>
				<built-by name="resco" version="1.0.0" />
			</control>
		</manifest>`;
}
