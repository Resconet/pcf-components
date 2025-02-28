import { serializeToFetchXml, type Fetch } from "@resconet/crm-data";
import { dataSetToEntities, recordsToPowerEntities } from "@resconet/power-data";
import { loadMeta } from "@resconet/power-service";
import { ListCellStyle } from "@resconet/resco-data";
import type { ObservableSource } from "@resconet/resco-observables";
import { TemplatedTreeSource, type TemplatedTreeItem, type TreeLevelDefinition } from "@resconet/tree-data";
import type { Observable } from "knockout";
import { getPowerWorkflowFeatures } from "./workflowFeatures";

export function createSource(
	treeDefinition: TreeLevelDefinition,
	dataSet: ComponentFramework.PropertyTypes.DataSet,
	filter: Observable<string>,
	webApi: ComponentFramework.WebApi,
	utility: ComponentFramework.Utility
): ObservableSource<TemplatedTreeItem> {
	const fetcher = async (f: Fetch) => {
		const isMainLevel = f.tag === "this is main fetch";

		if (isMainLevel) {
			const entities = dataSetToEntities(dataSet);
			return entities;
		} else {
			const fetchXml = `?fetchXml=${serializeToFetchXml(f)}`;
			const result = await webApi.retrieveMultipleRecords(f.entity.name, fetchXml);
			return recordsToPowerEntities(f.entity.meta, result.entities);
		}
	};

	const workflowFeatures = getPowerWorkflowFeatures();

	return new TemplatedTreeSource(treeDefinition, fetcher, e => loadMeta(utility, e), styleProvider, bindingResolver, workflowFeatures, filter);
}

export function createLoadedSource(
	treeDefinition: TreeLevelDefinition,
	dataSet: ComponentFramework.PropertyTypes.DataSet,
	filter: Observable<string>,
	webApi: ComponentFramework.WebApi,
	utility: ComponentFramework.Utility
): ObservableSource<TemplatedTreeItem> {
	const source = createSource(treeDefinition, dataSet, filter, webApi, utility);
	source.loadMore();
	return source;
}

function bindingResolver(binding: string): string {
	return binding;
}

function styleProvider(): ListCellStyle {
	return new ListCellStyle();
}
