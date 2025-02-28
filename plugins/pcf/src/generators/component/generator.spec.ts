import { Tree, readJson, readProjectConfiguration, writeJson } from "@nx/devkit";
import { createTreeWithEmptyWorkspace } from "@nx/devkit/testing";
import { Linter } from "@nx/eslint";
import { componentGenerator } from "./generator";
import type { ComponentType } from "./schema";

let emulateWin32 = false;

jest.mock("path", () => {
	return {
		...jest.requireActual("path"), // Use the actual path module for other functionalities
		relative: (from: string, to: string) => {
			if (emulateWin32 && to.indexOf("tools") >= 0) {
				return jest.requireActual("path").win32.relative(from, to);
			} else {
				return jest.requireActual("path").relative(from, to);
			}
		},
		posix: jest.requireActual("path").posix,
	};
});

const COMPONENT_TYPES: ComponentType[] = ["standard", "virtual-react", "virtual-react-fluent"];

describe("component generator", () => {
	let tree: Tree;

	beforeEach(() => {
		emulateWin32 = false;
		tree = createTreeWithEmptyWorkspace();
	});

	COMPONENT_TYPES.forEach(type => {
		describe(`for ${type} component type`, () => {
			it("should install pcf start dependencies", async () => {
				await componentGenerator(tree, {
					name: "apps-my-pcf-component",
					componentName: "MyPcfComponent",
					type,
					directory: "my-pcf-component",
					projectNameAndRootFormat: "as-provided",
					style: "css",
					e2eTestRunner: "none",
					linter: Linter.EsLint,
					namespace: "MyNamespace",
					prefix: "someprefix",
					publisher: "SomePublisher",
					skipFormat: true,
				});

				const packageJson = readJson(tree, "package.json");
				expect(packageJson).toMatchObject({
					dependencies: {
						"pcf-start": "^1.32.5",
					},
				});
			});

			it("should not generate manifest xml", async () => {
				await componentGenerator(tree, {
					name: "apps-my-pcf-component",
					componentName: "MyPcfComponent",
					type,
					directory: "my-pcf-component",
					projectNameAndRootFormat: "as-provided",
					style: "css",
					e2eTestRunner: "none",
					linter: Linter.EsLint,
					namespace: "MyNamespace",
					prefix: "someprefix",
					publisher: "SomePublisher",
					skipFormat: true,
				});

				expect(tree.exists("my-pcf-component/ControlManifest.xml")).toBeFalsy();
			});

			it("should not generate nx welcome component", async () => {
				await componentGenerator(tree, {
					name: "apps-my-pcf-component",
					componentName: "MyPcfComponent",
					type,
					directory: "my-pcf-component",
					projectNameAndRootFormat: "as-provided",
					style: "css",
					e2eTestRunner: "none",
					linter: Linter.EsLint,
					namespace: "MyNamespace",
					prefix: "someprefix",
					publisher: "SomePublisher",
					skipFormat: true,
				});

				expect(tree.exists("my-pcf-component/src/app/nx-welcome.tsx")).toBeFalsy();
			});

			it("should generate a package.json with version 1.0.0", async () => {
				writeJson(tree, "package.json", { version: "1.2.3" });

				await componentGenerator(tree, {
					name: "apps-my-pcf-component",
					componentName: "MyPcfComponent",
					type,
					directory: "apps/my-pcf-component",
					projectNameAndRootFormat: "as-provided",
					style: "css",
					e2eTestRunner: "none",
					linter: Linter.EsLint,
					namespace: "MyNamespace",
					prefix: "someprefix",
					publisher: "SomePublisher",
					skipFormat: true,
				});

				const packageJson = readJson(tree, "apps/my-pcf-component/package.json");
				expect(packageJson).toMatchObject({
					name: "@resconet/apps-my-pcf-component",
					version: "1.0.0",
				});
			});

			it("should generate input output intefaces", async () => {
				await componentGenerator(tree, {
					name: "apps-my-pcf-component",
					componentName: "MyPcfComponent",
					type,
					directory: "my-pcf-component",
					projectNameAndRootFormat: "as-provided",
					style: "css",
					e2eTestRunner: "none",
					linter: Linter.EsLint,
					namespace: "MyNamespace",
					prefix: "someprefix",
					publisher: "SomePublisher",
					skipFormat: true,
				});

				expect(tree.exists("my-pcf-component/src/inputsOutputs.ts")).toBeTruthy();
				const file = tree.read("my-pcf-component/src/inputsOutputs.ts", "utf-8");
				expect(file).toContain("export interface Inputs {");
				expect(file).toContain("export interface Outputs {");
			});

			it("should add pcf component specific configuration to build options in project.json", async () => {
				await componentGenerator(tree, {
					name: "apps-my-pcf-component",
					componentName: "MyPcfComponent",
					type,
					directory: "apps/my-pcf-component",
					projectNameAndRootFormat: "as-provided",
					style: "css",
					e2eTestRunner: "none",
					linter: Linter.EsLint,
					namespace: "MyNamespace",
					prefix: "someprefix",
					publisher: "SomePublisher",
					skipFormat: true,
					requiredFeatures: ["SomeFeature"],
					optionalFeatures: ["SomeOptionalFeature"],
				});

				const project = readProjectConfiguration(tree, "apps-my-pcf-component");

				expect(project.targets?.["build"]["options"]["namespace"]).toBeUndefined(); // namespace is parsed from the @namespace decorator
				expect(project.targets?.["build"]["options"]["type"]).toStrictEqual(type);
				expect(project.targets?.["build"]["options"]["inputOutputTypes"]).toStrictEqual("apps/my-pcf-component/src/inputsOutputs.ts");
				expect(project.targets?.["build"]["options"]["requiredFeatures"]).toStrictEqual(["SomeFeature"]);
				expect(project.targets?.["build"]["options"]["optionalFeatures"]).toStrictEqual(["SomeOptionalFeature"]);
			});

			it("should add a package target to project.json", async () => {
				await componentGenerator(tree, {
					name: "apps-my-pcf-component",
					componentName: "MyPcfComponent",
					type,
					directory: "apps/my-pcf-component",
					projectNameAndRootFormat: "as-provided",
					style: "css",
					e2eTestRunner: "none",
					linter: Linter.EsLint,
					namespace: "MyNamespace",
					prefix: "someprefix",
					publisher: "SomePublisher",
					skipFormat: true,
				});

				const project = readProjectConfiguration(tree, "apps-my-pcf-component");

				expect(project.targets?.["package"]).toStrictEqual({
					executor: "pcf:package",
					options: {
						buildTarget: "apps-my-pcf-component:build",
						prefix: "someprefix",
						publisher: "SomePublisher",
						outputPath: "out/apps/my-pcf-component/apps-my-pcf-component-{version}.zip",
					},
					configurations: {
						production: {
							buildTarget: "apps-my-pcf-component:build:production",
							managed: true,
						},
						development: {
							buildTarget: "apps-my-pcf-component:build:development",
						},
					},
					defaultConfiguration: "production",
				});
			});

			it("should add a publish target to project.json", async () => {
				await componentGenerator(tree, {
					name: "apps-my-pcf-component",
					componentName: "MyPcfComponent",
					type,
					directory: "apps/my-pcf-component",
					projectNameAndRootFormat: "as-provided",
					style: "css",
					e2eTestRunner: "none",
					linter: Linter.EsLint,
					namespace: "MyNamespace",
					prefix: "someprefix",
					publisher: "SomePublisher",
					skipFormat: true,
				});

				const project = readProjectConfiguration(tree, "apps-my-pcf-component");

				expect(project.targets?.["publish"]).toStrictEqual({
					executor: "dynamics:publish",
					options: {
						webResourcePath: "cc_MyNamespace.MyPcfComponent",
						buildTarget: "apps-my-pcf-component:build",
					},
					configurations: {
						development: {
							buildTarget: "apps-my-pcf-component:build:development",
							buildTargetOptions: {
								sourceMap: false,
							},
						},
						production: {
							buildTarget: "apps-my-pcf-component:build:production",
						},
					},
					defaultConfiguration: "development",
				});
			});

			it("should add a proxy target to project.json", async () => {
				await componentGenerator(tree, {
					name: "apps-my-pcf-component",
					componentName: "MyPcfComponent",
					type,
					directory: "apps/my-pcf-component",
					projectNameAndRootFormat: "as-provided",
					style: "css",
					e2eTestRunner: "none",
					linter: Linter.EsLint,
					namespace: "MyNamespace",
					prefix: "someprefix",
					publisher: "SomePublisher",
					skipFormat: true,
				});

				const project = readProjectConfiguration(tree, "apps-my-pcf-component");

				expect(project.targets?.["proxy"]).toStrictEqual({
					executor: "dynamics:proxy",
					options: {
						webResourcePath: "cc_MyNamespace.MyPcfComponent",
						port: 4200,
					},
				});
			});

			it("should add harness and index to development assets but not to production assets", async () => {
				await componentGenerator(tree, {
					name: "apps-my-pcf-component",
					componentName: "MyPcfComponent",
					type,
					directory: "my-pcf-component",
					projectNameAndRootFormat: "as-provided",
					style: "css",
					e2eTestRunner: "none",
					linter: Linter.EsLint,
					namespace: "MyNamespace",
					prefix: "someprefix",
					publisher: "SomePublisher",
					skipFormat: true,
				});

				const project = readProjectConfiguration(tree, "apps-my-pcf-component");

				expect(project.targets?.["build"]["options"]["assets"]).toStrictEqual([]);
				expect(project.targets?.["build"]["configurations"]?.["development"]["assets"]).toStrictEqual([
					{
						input: "node_modules/pcf-start",
						glob: "harness.js",
						output: "",
					},
					{
						input: "node_modules/pcf-start/loc",
						glob: "**",
						output: "loc",
					},
					{
						input: "node_modules/pcf-start",
						glob: "index.html",
						output: "",
					},
				]);
			});

			it("should generate correct webpack config", async () => {
				await componentGenerator(tree, {
					name: "apps-my-pcf-component",
					componentName: "MyPcfComponent",
					type,
					directory: "apps/my-pcf-component",
					projectNameAndRootFormat: "as-provided",
					style: "css",
					e2eTestRunner: "none",
					linter: Linter.EsLint,
					namespace: "MyNamespace",
					prefix: "someprefix",
					publisher: "SomePublisher",
					skipFormat: true,
				});

				expect(tree.exists("apps/my-pcf-component/webpack.config.js")).toBeTruthy();
				const config = tree.read("apps/my-pcf-component/webpack.config.js", "utf-8");
				expect(config).toMatchInlineSnapshot(`
			"// @ts-check

			const { composePlugins, withNx } = require("@nx/webpack");
			const { withReact } = require("@nx/react");
			const { withRescoBasic } = require("../../tools/common/webpack.with.resco.basic");
			const { withHtmlLoader } = require("../../tools/common/webpack.with.htmlloader");
			const { withPcf } = require("../../tools/pcf/webpack.with.pcf");

			module.exports = composePlugins(withNx(), withReact(), withRescoBasic(), withHtmlLoader(), withPcf());
			"
		`);
			});

			it("should generate correct paths to tools in windows environment", async () => {
				emulateWin32 = true;

				await componentGenerator(tree, {
					name: "apps-my-pcf-component",
					componentName: "MyPcfComponent",
					type,
					directory: "apps/my-pcf-component",
					projectNameAndRootFormat: "as-provided",
					style: "css",
					e2eTestRunner: "none",
					linter: Linter.EsLint,
					namespace: "MyNamespace",
					prefix: "someprefix",
					publisher: "SomePublisher",
					skipFormat: true,
				});

				expect(tree.exists("apps/my-pcf-component/webpack.config.js")).toBeTruthy();
				const config = tree.read("apps/my-pcf-component/webpack.config.js", "utf-8");
				expect(config).toMatchInlineSnapshot(`
			"// @ts-check

			const { composePlugins, withNx } = require("@nx/webpack");
			const { withReact } = require("@nx/react");
			const { withRescoBasic } = require("../../tools/common/webpack.with.resco.basic");
			const { withHtmlLoader } = require("../../tools/common/webpack.with.htmlloader");
			const { withPcf } = require("../../tools/pcf/webpack.with.pcf");

			module.exports = composePlugins(withNx(), withReact(), withRescoBasic(), withHtmlLoader(), withPcf());
			"
		`);
			});

			it("should generate a README file with a correct relative path to the PCF plugin documentation", async () => {
				await componentGenerator(tree, {
					name: "apps-my-pcf-component",
					componentName: "MyPcfComponent",
					type,
					directory: "apps/my-pcf-component",
					projectNameAndRootFormat: "as-provided",
					style: "css",
					e2eTestRunner: "none",
					linter: Linter.EsLint,
					namespace: "MyNamespace",
					prefix: "someprefix",
					publisher: "SomePublisher",
					skipFormat: true,
				});

				expect(tree.exists("/apps/my-pcf-component/README.md")).toBeTruthy();
				const readme = tree.read("/apps/my-pcf-component/README.md", "utf-8");
				expect(readme).toContain("[PCF Plugin Documentation](../../plugins/pcf/README.md)");
			});

			it("should add power apps typescript types to tsconfig.app.json", async () => {
				await componentGenerator(tree, {
					name: "apps-my-pcf-component",
					componentName: "MyPcfComponent",
					type,
					directory: "my-pcf-component",
					projectNameAndRootFormat: "as-provided",
					style: "css",
					e2eTestRunner: "none",
					linter: Linter.EsLint,
					namespace: "MyNamespace",
					prefix: "someprefix",
					publisher: "SomePublisher",
					skipFormat: true,
				});

				const tsConfigJson = readJson(tree, "my-pcf-component/tsconfig.app.json");
				expect(tsConfigJson["compilerOptions"]["types"]).toContain("powerapps-component-framework");
			});

			it("should add power apps typescript types to tsconfig.spec.json", async () => {
				await componentGenerator(tree, {
					name: "apps-my-pcf-component",
					componentName: "MyPcfComponent",
					type,
					directory: "my-pcf-component",
					projectNameAndRootFormat: "as-provided",
					style: "css",
					e2eTestRunner: "none",
					linter: Linter.EsLint,
					namespace: "MyNamespace",
					prefix: "someprefix",
					publisher: "SomePublisher",
					skipFormat: true,
				});

				const tsConfigJson = readJson(tree, "my-pcf-component/tsconfig.spec.json");
				expect(tsConfigJson["compilerOptions"]["types"]).toContain("powerapps-component-framework");
			});

			it("should add generateIndexHtml property to project.json equaled to false", async () => {
				await componentGenerator(tree, {
					name: "apps-my-pcf-component",
					componentName: "MyPcfComponent",
					type,
					directory: "my-pcf-component",
					projectNameAndRootFormat: "as-provided",
					style: "css",
					e2eTestRunner: "none",
					linter: Linter.EsLint,
					namespace: "MyNamespace",
					prefix: "someprefix",
					publisher: "SomePublisher",
					skipFormat: true,
				});

				const project = readProjectConfiguration(tree, "apps-my-pcf-component");

				expect(project.targets?.["build"]["options"]["generateIndexHtml"]).toStrictEqual(false);
			});

			it("should add some more strict options to tsconfig.json if strict mode is enabled", async () => {
				await componentGenerator(tree, {
					name: "apps-my-pcf-component",
					componentName: "MyPcfComponent",
					type,
					directory: "apps/my-pcf-component",
					projectNameAndRootFormat: "as-provided",
					style: "css",
					e2eTestRunner: "none",
					linter: Linter.EsLint,
					namespace: "MyNamespace",
					prefix: "someprefix",
					publisher: "SomePublisher",
					skipFormat: true,
					strict: true,
				});
				const tsConfigJson = readJson(tree, "apps/my-pcf-component/tsconfig.json");
				expect(tsConfigJson["compilerOptions"]["noImplicitOverride"]).toStrictEqual(true);
				expect(tsConfigJson["compilerOptions"]["noImplicitReturns"]).toStrictEqual(true);
				expect(tsConfigJson["compilerOptions"]["noFallthroughCasesInSwitch"]).toStrictEqual(true);
				expect(tsConfigJson["compilerOptions"]["forceConsistentCasingInFileNames"]).toStrictEqual(true);
				expect(tsConfigJson["compilerOptions"]["noPropertyAccessFromIndexSignature"]).toStrictEqual(true);
			});

			it("should add new component launch configuration to launch.json file", async () => {
				const existingPcfComponentConfig = {
					version: "0.2.0",
					configurations: [
						{
							name: "Pcf: ExistingPcfComponent (Chrome)",
							request: "launch",
							type: "chrome",
							url: "http://localhost:4200",
							webRoot: "${workspaceFolder}/apps/existing-pcf-component",
						},
					],
				};
				writeJson(tree, ".vscode/launch.json", existingPcfComponentConfig);

				await componentGenerator(tree, {
					name: "apps-my-pcf-component",
					componentName: "MyPcfComponent",
					type,
					directory: "apps/my-pcf-component",
					projectNameAndRootFormat: "as-provided",
					style: "css",
					e2eTestRunner: "none",
					linter: Linter.EsLint,
					namespace: "MyNamespace",
					prefix: "someprefix",
					publisher: "SomePublisher",
					skipFormat: true,
				});

				const packageJson = readJson(tree, ".vscode/launch.json");
				expect(packageJson).toMatchObject({
					version: "0.2.0",
					configurations: existingPcfComponentConfig.configurations.concat([
						{
							name: "Pcf: MyPcfComponent (Chrome)",
							request: "launch",
							type: "chrome",
							url: "http://localhost:4200",
							webRoot: "${workspaceFolder}/apps/my-pcf-component",
						},
					]),
				});
			});
		});
	});

	describe("for standard component type", () => {
		it("should generate a main with MyPcfComponent main class", async () => {
			await componentGenerator(tree, {
				name: "apps-my-pcf-component",
				componentName: "MyPcfComponent",
				type: "standard",
				directory: "my-pcf-component",
				projectNameAndRootFormat: "as-provided",
				style: "css",
				e2eTestRunner: "none",
				linter: Linter.EsLint,
				namespace: "MyNamespace",
				prefix: "someprefix",
				publisher: "SomePublisher",
				skipFormat: true,
			});

			expect(tree.exists("my-pcf-component/src/main.tsx")).toBeTruthy();
			const main = tree.read("my-pcf-component/src/main.tsx", "utf-8");
			expect(main).toMatchInlineSnapshot(`
			"import { name, namespace, registerPcfComponent } from "@resconet/component";
			import { StrictMode } from "react";
			import * as ReactDOM from "react-dom/client";
			import { App } from "./app/app";
			import type { Inputs, Outputs } from "./inputsOutputs";

			@namespace("MyNamespace")
			@name("MyPcfComponent")
			export class MyPcfComponent implements ComponentFramework.StandardControl<Inputs, Outputs> {
				/**
				 * Used to initialize the control instance. Controls can kick off remote server calls and other initialization actions here.
				 * Data-set values are not initialized here, use updateView.
				 * @param context The entire property bag available to control via Context Object; It contains values as set up by the customizer mapped to property names defined in the manifest, as well as utility functions.
				 * @param notifyOutputChanged A callback method to alert the framework that the control has new outputs ready to be retrieved asynchronously.
				 * @param state A piece of data that persists in one session for a single user. Can be set at any point in a controls life cycle by calling 'setControlState' in the Mode interface.
				 * @param container If a control is marked control-type='standard', it will receive an empty div element within which it can render its content.
				 */
				public init(
					context: ComponentFramework.Context<Inputs>,
					notifyOutputChanged: () => void,
					state: ComponentFramework.Dictionary,
					container: HTMLDivElement
				): void {
					const root = ReactDOM.createRoot(container);
					root.render(
						<StrictMode>
							<App />
						</StrictMode>
					);
				}

				/**
				 * Called when any value in the property bag has changed. This includes field values, data-sets, global values such as container height and width, offline status, control metadata values such as label, visible, etc.
				 * @param context The entire property bag available to control via Context Object; It contains values as set up by the customizer mapped to names defined in the manifest, as well as utility functions
				 */
				public updateView(context: ComponentFramework.Context<Inputs>): void {
					// Add code to update control view
				}

				/**
				 * It is called by the framework prior to a control receiving new data.
				 * @returns an object based on nomenclature defined in manifest, expecting object[s] for property marked as “bound” or “output”
				 */
				public getOutputs(): Outputs {
					return {};
				}

				/**
				 * Called when the control is to be removed from the DOM tree. Controls should use this call for cleanup.
				 * i.e. cancelling any pending remote calls, removing listeners, etc.
				 */
				public destroy(): void {
					// Add code to cleanup control if necessary
				}
			}

			registerPcfComponent(MyPcfComponent);
			"
		`);
		});
	});

	describe("for virtual-react component type", () => {
		it("should generate a main with MyPcfComponent main class in virtual-react mode", async () => {
			await componentGenerator(tree, {
				name: "apps-my-pcf-component",
				componentName: "MyPcfComponent",
				type: "virtual-react",
				directory: "my-pcf-component",
				projectNameAndRootFormat: "as-provided",
				style: "css",
				e2eTestRunner: "none",
				linter: Linter.EsLint,
				namespace: "MyNamespace",
				prefix: "someprefix",
				publisher: "SomePublisher",
				skipFormat: true,
			});

			expect(tree.exists("my-pcf-component/src/main.tsx")).toBeTruthy();
			const main = tree.read("my-pcf-component/src/main.tsx", "utf-8");
			expect(main).toMatchInlineSnapshot(`
			"import { name, namespace, registerPcfComponent } from "@resconet/component";
			import { StrictMode, type ReactElement } from 'react';
			import { App } from "./app/app";
			import type { Inputs, Outputs } from "./inputsOutputs";

			@namespace("MyNamespace")
			@name("MyPcfComponent")
			export class MyPcfComponent implements ComponentFramework.ReactControl<Inputs, Outputs> {
				/**
				 * Used to initialize the control instance. Controls can kick off remote server calls and other initialization actions here.
				 * Data-set values are not initialized here, use updateView.
				 * @param context The entire property bag available to control via Context Object; It contains values as set up by the customizer mapped to property names defined in the manifest, as well as utility functions.
				 * @param notifyOutputChanged A callback method to alert the framework that the control has new outputs ready to be retrieved asynchronously.
				 * @param state A piece of data that persists in one session for a single user. Can be set at any point in a controls life cycle by calling 'setControlState' in the Mode interface.
				 */
				public init(
					context: ComponentFramework.Context<Inputs>,
					notifyOutputChanged: () => void,
					state: ComponentFramework.Dictionary
				): void {
					// Add code to initialize control
				}

				/**
				 * Called when any value in the property bag has changed. This includes field values, data-sets, global values such as container height and width, offline status, control metadata values such as label, visible, etc.
				 * @param context The entire property bag available to control via Context Object; It contains values as set up by the customizer mapped to names defined in the manifest, as well as utility functions
				 * @returns ReactElement root react element for the control
				 */
				public updateView(context: ComponentFramework.Context<Inputs>): ReactElement {
					return (
						<StrictMode>
							<App />
						</StrictMode>
					);
				}

				/**
				 * It is called by the framework prior to a control receiving new data.
				 * @returns an object based on nomenclature defined in manifest, expecting object[s] for property marked as “bound” or “output”
				 */
				public getOutputs(): Outputs {
					return {};
				}

				/**
				 * Called when the control is to be removed from the DOM tree. Controls should use this call for cleanup.
				 * i.e. cancelling any pending remote calls, removing listeners, etc.
				 */
				public destroy(): void {
					// Add code to cleanup control if necessary
				}
			}

			registerPcfComponent(MyPcfComponent);
			"
		`);
		});
	});

	describe("for virtual-react-fluent component type", () => {
		it("should generate a main with MyPcfComponent main class in virtual-react-fluent mode", async () => {
			await componentGenerator(tree, {
				name: "apps-my-pcf-component",
				componentName: "MyPcfComponent",
				type: "virtual-react-fluent",
				directory: "my-pcf-component",
				projectNameAndRootFormat: "as-provided",
				style: "css",
				e2eTestRunner: "none",
				linter: Linter.EsLint,
				namespace: "MyNamespace",
				prefix: "someprefix",
				publisher: "SomePublisher",
				skipFormat: true,
			});

			expect(tree.exists("my-pcf-component/src/main.tsx")).toBeTruthy();
			const main = tree.read("my-pcf-component/src/main.tsx", "utf-8");
			expect(main).toMatchInlineSnapshot(`
			"import { name, namespace, registerPcfComponent } from "@resconet/component";
			import { StrictMode, type ReactElement } from 'react';
			import { App } from "./app/app";
			import type { Inputs, Outputs } from "./inputsOutputs";

			@namespace("MyNamespace")
			@name("MyPcfComponent")
			export class MyPcfComponent implements ComponentFramework.ReactControl<Inputs, Outputs> {
				/**
				 * Used to initialize the control instance. Controls can kick off remote server calls and other initialization actions here.
				 * Data-set values are not initialized here, use updateView.
				 * @param context The entire property bag available to control via Context Object; It contains values as set up by the customizer mapped to property names defined in the manifest, as well as utility functions.
				 * @param notifyOutputChanged A callback method to alert the framework that the control has new outputs ready to be retrieved asynchronously.
				 * @param state A piece of data that persists in one session for a single user. Can be set at any point in a controls life cycle by calling 'setControlState' in the Mode interface.
				 */
				public init(
					context: ComponentFramework.Context<Inputs>,
					notifyOutputChanged: () => void,
					state: ComponentFramework.Dictionary
				): void {
					// Add code to initialize control
				}

				/**
				 * Called when any value in the property bag has changed. This includes field values, data-sets, global values such as container height and width, offline status, control metadata values such as label, visible, etc.
				 * @param context The entire property bag available to control via Context Object; It contains values as set up by the customizer mapped to names defined in the manifest, as well as utility functions
				 * @returns ReactElement root react element for the control
				 */
				public updateView(context: ComponentFramework.Context<Inputs>): ReactElement {
					return (
						<StrictMode>
							<App />
						</StrictMode>
					);
				}

				/**
				 * It is called by the framework prior to a control receiving new data.
				 * @returns an object based on nomenclature defined in manifest, expecting object[s] for property marked as “bound” or “output”
				 */
				public getOutputs(): Outputs {
					return {};
				}

				/**
				 * Called when the control is to be removed from the DOM tree. Controls should use this call for cleanup.
				 * i.e. cancelling any pending remote calls, removing listeners, etc.
				 */
				public destroy(): void {
					// Add code to cleanup control if necessary
				}
			}

			registerPcfComponent(MyPcfComponent);
			"
		`);
		});
	});
});
