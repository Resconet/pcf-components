import { ExecutorContext, Target, readTargetOptions } from "@nx/devkit";
import { SchemaWithBuildTarget } from "./schemaWithBuildTarget";

export function getBuildOptions<T>(buildTarget: Target, options: SchemaWithBuildTarget<T>, context: ExecutorContext): T {
	return {
		...readTargetOptions<T>(buildTarget, context),
		...options.buildTargetOptions,
	};
}
