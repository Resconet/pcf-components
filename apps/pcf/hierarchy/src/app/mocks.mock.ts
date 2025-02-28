import { Fetch, MetaEntity } from "@resconet/crm-data";
import { TreeLevelDefinition, TreeLevelReference } from "@resconet/tree-data";

export function withTreeDefinition(): TreeLevelDefinition {
	const options = { allowCreate: true, allowOpen: true };

	const mainFetch = new Fetch(undefined, "some-entity");
	mainFetch.entity.meta = new MetaEntity("some-entity", "id", "name", 0, 0);
	mainFetch.tag = "this is main fetch";

	const childFetch = new Fetch(undefined, "child-entity");
	childFetch.entity.meta = new MetaEntity("child-entity", "id", "name", 0, 0);
	const childLevel = new TreeLevelDefinition([], childFetch, undefined, [], undefined, undefined, options);
	const childLevelRef = new TreeLevelReference("parentId", childLevel);

	return new TreeLevelDefinition([], mainFetch, undefined, [], childLevelRef, undefined, options);
}

export function mockNavigation(): ComponentFramework.Navigation {
	return {
		openForm: vi.fn(),
	} as Partial<ComponentFramework.Navigation> as ComponentFramework.Navigation;
}

export function mockWebApi(): ComponentFramework.WebApi {
	return {
		retrieveMultipleRecords: vi.fn().mockResolvedValue({
			entities: [
				{
					id: "child-1",
					// eslint-disable-next-line @typescript-eslint/naming-convention
					_parentId_value: "main-1",
				},
			],
		}),
	} as Partial<ComponentFramework.WebApi> as ComponentFramework.WebApi;
}

export function mockUtility(): ComponentFramework.Utility {
	return {
		getEntityMetadata: vi.fn().mockImplementation(async entityName => {
			if (entityName === "some-entity") {
				// eslint-disable-next-line @typescript-eslint/naming-convention
				return { PrimaryIdAttribute: "some-id", PrimaryNameAttribute: "name", DisplayName: "Some Entity" };
			} else {
				throw new Error(`Entity ${entityName} not found.`);
			}
		}),
	} as Partial<ComponentFramework.Utility> as ComponentFramework.Utility;
}

export function withDataSet(): ComponentFramework.PropertyTypes.DataSet {
	const record: ComponentFramework.PropertyHelper.DataSetApi.EntityRecord = {
		getRecordId: () => "main-1",
		getValue: () => "",
		getFormattedValue: () => "",
		getNamedReference: () => ({ id: { guid: "main-1" }, etn: "some-entity", name: "Row 1" }),
	};

	return {
		getViewId: () => "viewId",
		sortedRecordIds: ["main-1"],
		records: {
			"main-1": record,
		},
		columns: [],
		paging: withPaging(),
	} as Partial<ComponentFramework.PropertyTypes.DataSet> as ComponentFramework.PropertyTypes.DataSet;
}

function withPaging() {
	return {
		hasNextPage: false,
		loadNextPage: vi.fn(),
	} as Partial<ComponentFramework.PropertyHelper.DataSetApi.Paging> as ComponentFramework.PropertyHelper.DataSetApi.Paging;
}
