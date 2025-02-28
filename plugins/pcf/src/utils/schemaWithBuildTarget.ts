export interface SchemaWithBuildTarget<T> {
	buildTargetOptions: Partial<T>;
	buildTarget: string;
}
