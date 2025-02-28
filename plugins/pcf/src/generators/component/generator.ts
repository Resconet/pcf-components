import {
	addDependenciesToPackageJson,
	formatFiles,
	generateFiles,
	GeneratorCallback,
	joinPathFragments,
	readJson,
	readProjectConfiguration,
	Tree,
	writeJson,
} from "@nx/devkit";
import { determineProjectNameAndRootOptions } from "@nx/devkit/src/generators/project-name-and-root-utils";
import { applicationGenerator as reactApplicationGenerator } from "@nx/react";
import { join, posix } from "path";
import { ComponentGeneratorSchema } from "./schema";

export async function componentGenerator(tree: Tree, options: ComponentGeneratorSchema) {
	await reactApplicationGenerator(tree, options);

	const { projectRoot, projectName } = await determineProjectNameAndRootOptions(tree, {
		name: options.name,
		projectType: "application",
		directory: options.directory,
		projectNameAndRootFormat: options.projectNameAndRootFormat,
		rootProject: options.rootProject,
		callingGenerator: "@nx/react:application",
	});

	const componentName = options.componentName;
	const namespace = options.namespace;
	const toolsPath = posix.relative(projectRoot, "tools");
	const pluginsPath = posix.relative(projectRoot, "plugins");
	const version = "1.0.0";

	addProjectDependencies(tree);
	updateProjectJson(tree, projectName, projectRoot, options);
	updateTsConfigs(tree, projectRoot, options);
	addLaunchConfig(tree, componentName, projectRoot);
	generateFiles(tree, join(__dirname, "files", "common"), projectRoot, { ...options, componentName, namespace, toolsPath, pluginsPath, version });
	generateFiles(tree, join(__dirname, "files", options.type === "standard" ? "standard" : "virtual"), projectRoot, {
		...options,
		componentName,
		namespace,
		toolsPath,
		pluginsPath,
		version,
	});
	removeNxWelcome(tree, projectRoot);

	if (!options.skipFormat) {
		await formatFiles(tree);
	}
}

function removeNxWelcome(tree: Tree, projectRoot: string) {
	tree.delete(join(projectRoot, "src", "app", "nx-welcome.tsx"));
}

function addLaunchConfig(tree: Tree, componentName: string, projectRoot: string) {
	const launchConfigPath = join(".vscode", "launch.json");
	if (tree.exists(launchConfigPath)) {
		const launchConfig = readJson(tree, launchConfigPath);
		launchConfig.configurations ??= [];
		launchConfig.configurations.push({
			name: `Pcf: ${componentName} (Chrome)`,
			request: "launch",
			type: "chrome",
			url: "http://localhost:4200",
			webRoot: "${workspaceFolder}/" + projectRoot,
		});
		writeJson(tree, launchConfigPath, launchConfig);
	}
}

function updateTsConfigs(tree: Tree, projectRoot: string, options: ComponentGeneratorSchema) {
	const tsConfigAppJson = readJson(tree, join(projectRoot, "tsconfig.app.json"));
	tsConfigAppJson["compilerOptions"]["types"].push("powerapps-component-framework");
	writeJson(tree, join(projectRoot, "tsconfig.app.json"), tsConfigAppJson);

	const tsConfigSpecJson = readJson(tree, join(projectRoot, "tsconfig.spec.json"));
	tsConfigSpecJson["compilerOptions"]["types"].push("powerapps-component-framework");
	writeJson(tree, join(projectRoot, "tsconfig.spec.json"), tsConfigSpecJson);

	if (options.strict) {
		const tsConfigJson = readJson(tree, join(projectRoot, "tsconfig.json"));
		tsConfigJson["compilerOptions"]["noImplicitOverride"] = true;
		tsConfigJson["compilerOptions"]["noImplicitReturns"] = true;
		tsConfigJson["compilerOptions"]["noFallthroughCasesInSwitch"] = true;
		tsConfigJson["compilerOptions"]["forceConsistentCasingInFileNames"] = true;
		tsConfigJson["compilerOptions"]["noPropertyAccessFromIndexSignature"] = true;
		writeJson(tree, join(projectRoot, "tsconfig.json"), tsConfigJson);
	}
}

function updateProjectJson(tree: Tree, projectName: string, projectRoot: string, options: ComponentGeneratorSchema) {
	const projectJson = readProjectConfiguration(tree, projectName);

	projectJson.targets ??= {};
	projectJson.targets["build"] ??= {};
	projectJson.targets["build"]["options"] ??= {};
	projectJson.targets["build"]["configurations"] ??= {};

	projectJson.targets["build"]["options"]["type"] = options.type;
	projectJson.targets["build"]["options"]["inputOutputTypes"] = posix.join(projectRoot, "src/inputsOutputs.ts");
	projectJson.targets["build"]["options"]["requiredFeatures"] = options.requiredFeatures ?? [];
	projectJson.targets["build"]["options"]["optionalFeatures"] = options.optionalFeatures ?? [];
	projectJson.targets["build"]["options"]["assets"] = [];
	projectJson.targets["build"]["configurations"]["development"]["assets"] = [
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
	];
	projectJson.targets["build"]["options"]["generateIndexHtml"] = false;

	projectJson.targets["package"] = {
		executor: "pcf:package",
		options: {
			outputPath: joinPathFragments("out", !options.rootProject ? projectRoot : projectName, projectName + `-{version}.zip`),
			prefix: options.prefix,
			publisher: options.publisher,
			buildTarget: `${projectName}:build`,
		},
		configurations: {
			development: {
				buildTarget: `${projectName}:build:development`,
			},
			production: {
				buildTarget: `${projectName}:build:production`,
				managed: true,
			},
		},
		defaultConfiguration: "production",
	};

	projectJson.targets["publish"] = {
		executor: "dynamics:publish",
		options: {
			webResourcePath: `cc_${options.namespace}.${options.componentName}`,
			buildTarget: `${projectName}:build`,
		},
		configurations: {
			development: {
				buildTarget: `${projectName}:build:development`,
				buildTargetOptions: {
					sourceMap: false,
				},
			},
			production: {
				buildTarget: `${projectName}:build:production`,
			},
		},
		defaultConfiguration: "development",
	};

	projectJson.targets["proxy"] = {
		executor: "dynamics:proxy",
		options: {
			webResourcePath: `cc_${options.namespace}.${options.componentName}`,
			port: 4200,
		},
	};

	writeJson(tree, join(projectRoot, "project.json"), projectJson);
}

function addProjectDependencies(tree: Tree): GeneratorCallback {
	return addDependenciesToPackageJson(
		tree,
		{
			"pcf-start": "^1.32.5",
		},
		{}
	);
}

export default componentGenerator;
