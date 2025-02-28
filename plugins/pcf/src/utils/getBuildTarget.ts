import { ExecutorContext, Target, parseTargetString } from "@nx/devkit";

export function getBuildTarget(targetName: string, context: ExecutorContext): Target {
	if (context.projectName == null) {
		throw new Error("ProjectName undefined in executor context.");
	}

	if (context.projectGraph == null) {
		throw new Error("ProjectName undefined in executor context.");
	}

	const project = context.projectGraph.nodes[context.projectName];

	if (project.data.targets == null) {
		throw new Error("Project targets undefined in executor context.");
	}

	const buildTarget = parseTargetString(targetName, context.projectGraph);

	if (!project.data.targets[buildTarget.target]) {
		throw new Error(`Cannot find build target ${targetName} for project ${context.projectName}.`);
	}

	return buildTarget;
}
