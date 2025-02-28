import { SchemaWithBuildTarget } from "../utils/schemaWithBuildTarget";

export interface DeployExecutorSchema extends SchemaWithBuildTarget {
	webResourcePath: string;
	withoutAssets?: boolean;
}
