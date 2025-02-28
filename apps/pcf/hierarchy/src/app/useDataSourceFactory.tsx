import { ViewType, loadMeta, loadViewDefinition, type ViewIdentifier } from "@resconet/power-service";
import type { ObservableSource } from "@resconet/resco-observables";
import type { TemplatedTreeItem, TreeLevelDefinition } from "@resconet/tree-data";
import { observable } from "knockout";
import { useEffect, useRef, useState } from "react";
import { createLoadedSource } from "./dataSourceFactory";
import { constructTreeLevelDefinition } from "./treeLevelDefinitionFactory";

export function useDataSourceFactory(
	dataSet: ComponentFramework.PropertyTypes.DataSet,
	treeDefinition: ComponentFramework.PropertyTypes.StringProperty,
	webAPI: ComponentFramework.WebApi,
	utils: ComponentFramework.Utility
) {
	const [treeLevelDefinition, setTreeLevelDefinition] = useState<TreeLevelDefinition | undefined>();
	const [dataSource, setDataSource] = useState<ObservableSource<TemplatedTreeItem> | undefined>();
	const filter$ = useRef(observable(""));

	useEffect(() => {
		if (!treeDefinition.raw) {
			return;
		}

		const viewIdentifier: ViewIdentifier = dataSet.getViewId() ?? { entityName: dataSet.getTargetEntityType(), viewType: ViewType.LookupView };
		const treeDefinitionJson = JSON.parse(treeDefinition.raw);

		constructTreeLevelDefinition(
			viewIdentifier,
			treeDefinitionJson,
			async (viewId: ViewIdentifier) => await loadViewDefinition(webAPI, viewId),
			(metaEntityName, attributeNames) => loadMeta(utils, metaEntityName, attributeNames)
		)
			.then(setTreeLevelDefinition)
			.catch(handleError);
	}, [dataSet, treeDefinition.raw, utils, webAPI]);

	useEffect(() => {
		if (!treeLevelDefinition) {
			return;
		}

		setDataSource(createLoadedSource(treeLevelDefinition, dataSet, filter$.current, webAPI, utils));
	}, [dataSet, treeLevelDefinition, utils, webAPI]);

	return dataSource;
}

function handleError(error: unknown): void {
	console.error(error);
	throw error;
}
