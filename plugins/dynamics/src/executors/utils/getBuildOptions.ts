import { ExecutorContext, Target, readTargetOptions } from "@nx/devkit";
import { ExecutorOptions } from "@nx/js/src/utils/schema";
import { SchemaWithBuildTarget } from "./schemaWithBuildTarget";

export function getBuildOptions(buildTarget: Target, options: SchemaWithBuildTarget, context: ExecutorContext): ExecutorOptions {
	return {
		...readTargetOptions(buildTarget, context),
		...options.buildTargetOptions,
	};
}
