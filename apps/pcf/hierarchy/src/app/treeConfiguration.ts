export type TreeConfiguration = Omit<TreeLevelConfiguration, "property" | "viewId">;

export type TreeLevelConfiguration = {
	property: string;
	viewId: string;
	parents?: TreeLevelConfiguration[];
	child?: TreeLevelConfiguration;
	recursive?: string;
};
