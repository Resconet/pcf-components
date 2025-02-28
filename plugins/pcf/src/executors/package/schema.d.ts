import { WebpackExecutorOptions } from "@nx/webpack";
import { SchemaWithBuildTarget } from "../../utils/schemaWithBuildTarget";

export interface PackageExecutorSchema extends SchemaWithBuildTarget<WebpackExecutorOptions> {
	outputPath: string;
	prefix: string;
	publisher: string;
	managed?: boolean;
}
