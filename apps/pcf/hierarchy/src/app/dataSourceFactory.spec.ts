import { tick } from "@resconet/testing";
import { observable } from "knockout";
import { createSource } from "./dataSourceFactory";
import { mockUtility, mockWebApi, withDataSet, withTreeDefinition } from "./mocks.mock";

describe("createSource", () => {
	it("creates TemplatedTreeSource which uses data set to retrieve data at first level", async () => {
		const treeDefinition = withTreeDefinition();
		const dataSet = withDataSet();
		const filter = observable("some filter");
		const webApi = mockWebApi();
		const utility = mockUtility();

		const source = createSource(treeDefinition, dataSet, filter, webApi, utility);

		source.loadMore();
		await tick();

		expect(source.error$()).toBeUndefined();
		expect(source.items$().length).toBe(1);
		expect(source.items$()[0].entity.id).toBe("main-1");
	});

	it("creates TemplatedTreeSource which uses web api to retrieve data at child level", async () => {
		const treeDefinition = withTreeDefinition();
		const dataSet = withDataSet();
		const filter = observable("some filter");
		const webApi = mockWebApi();
		const utility = mockUtility();

		const source = createSource(treeDefinition, dataSet, filter, webApi, utility);

		source.loadMore();
		await tick();

		expect(source.error$()).toBeUndefined();
		expect(webApi.retrieveMultipleRecords).toHaveBeenCalledWith(
			"child-entity",
			'?fetchXml=<fetch version="1.0"><entity name="child-entity"><attribute name="parentId" /><filter type="and"><condition attribute="parentId" operator="eq" value="main-1" /><condition attribute="name" operator="like" value="%" /></filter></entity></fetch>'
		);

		source.items$()[0].children.loadMore();

		expect(source.items$()[0].children.items$().length).toBe(1);
		expect(source.items$()[0].children.items$()[0].entity.id).toBe("child-1");
	});
});
