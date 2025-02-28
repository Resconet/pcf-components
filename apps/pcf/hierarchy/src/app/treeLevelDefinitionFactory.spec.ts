import { LocalizedMetaEntity, type ViewDefinitionLoader, type ViewIdentifier } from "@resconet/power-service";
import { ContentAlignment, ListCellAnchor } from "@resconet/resco-data";
import type { RowTemplate } from "@resconet/resco-observables";
import type { TreeConfiguration } from "./treeConfiguration";
import { constructTreeLevelDefinition, type HierarchyRowTemplate } from "./treeLevelDefinitionFactory";

describe("constructTreeLevelDefinition", () => {
	let viewDefinitionLoader: ViewDefinitionLoader;
	let metaLoader: (name: string) => Promise<LocalizedMetaEntity>;

	beforeEach(() => {
		viewDefinitionLoader = async (viewId: ViewIdentifier) => {
			return {
				entityName: `entity-of-${viewId}`,
				fetchXml: `<fetch><entity name="entity-of-${viewId}"></entity></fetch>`,
				cellTemplates: [
					{ column: "name", width: viewId.toString().length * 10 },
					{ column: "mail", width: viewId.toString().length * 10 },
				],
			};
		};
		metaLoader = async (name: string) => {
			const meta = new LocalizedMetaEntity(name, "id", "name", 0, 0);
			meta.displayNames.set("name", "Name");
			meta.displayNames.set("mail", "Email");
			meta.displayNames.set("entity-of-mainViewId", "EntityOfMainView");
			meta.displayNames.set("entity-of-parentEntityViewId", "EntityOfParentEntityView");
			meta.displayNames.set("entity-of-parentParentEntityViewId", "EntityOfParentParentEntityView");
			meta.displayNames.set("entity-of-anotherEntityViewId", "EntityOfAnotherEntityView");
			meta.displayNames.set("entity-of-childEntityViewId", "EntityOfChildEntityView");
			meta.displayNames.set("entity-of-childChildEntityViewId", "EntityOfChildChildEntityView");
			return meta;
		};
	});

	it("converts a tree definition json to a TreeLevelDefinition structure, loads views using viewDefinitionLoader and creates templates and fetches from them", async () => {
		const treeLevelDefinitionJson: TreeConfiguration = {
			parents: [
				{
					property: "parentEntityId",
					viewId: "parentEntityViewId",
					parents: [
						{
							property: "parentParentEntityId",
							viewId: "parentParentEntityViewId",
						},
					],
				},
				{
					property: "parentAnotherId",
					viewId: "anotherEntityViewId",
				},
			],
			child: {
				property: "parentMainId",
				viewId: "childEntityViewId",
				child: {
					property: "parentChildId",
					viewId: "childChildEntityViewId",
				},
			},
			recursive: "parentMainId",
		};

		const treeLevelDefinition = await constructTreeLevelDefinition("mainViewId", treeLevelDefinitionJson, viewDefinitionLoader, metaLoader);

		expect(treeLevelDefinition.fetch.entity.name).toBe("entity-of-mainViewId");
		expect(treeLevelDefinition.fetch.entity.meta.name).toBe("entity-of-mainViewId");
		expectCorrectTemplates(treeLevelDefinition.templates, "EntityOfMainView", 100);
		expectCorrectColumns(treeLevelDefinition.templates as HierarchyRowTemplate[]); // fixme cast
		expect(treeLevelDefinition.recursiveLevel?.recursivePropertyName).toBe("parentMainId");

		const parentLevels = treeLevelDefinition.parentLevels;
		expect(parentLevels.length).toBe(2);
		expect(parentLevels[0].referencePropertyName).toBe("parentEntityId");
		expect(parentLevels[0].levelDefinition.fetch.entity.name).toBe("entity-of-parentEntityViewId");
		expect(parentLevels[0].levelDefinition.fetch.entity.meta.name).toBe("entity-of-parentEntityViewId");
		expectCorrectTemplates(parentLevels[0].levelDefinition.templates, "EntityOfParentEntityView", 180);
		expectCorrectColumns(parentLevels[0].levelDefinition.templates as HierarchyRowTemplate[]); // fixme cast
		expect(parentLevels[0].levelDefinition.parentLevels.length).toBe(1);
		expect(parentLevels[0].levelDefinition.parentLevels[0].referencePropertyName).toBe("parentParentEntityId");
		expect(parentLevels[0].levelDefinition.parentLevels[0].levelDefinition.fetch.entity.name).toBe("entity-of-parentParentEntityViewId");
		expect(parentLevels[0].levelDefinition.parentLevels[0].levelDefinition.fetch.entity.meta.name).toBe("entity-of-parentParentEntityViewId");
		expectCorrectTemplates(parentLevels[0].levelDefinition.parentLevels[0].levelDefinition.templates, "EntityOfParentParentEntityView", 240);
		expectCorrectColumns(parentLevels[0].levelDefinition.parentLevels[0].levelDefinition.templates as HierarchyRowTemplate[]); // fixme cast

		expect(parentLevels[1].referencePropertyName).toBe("parentAnotherId");
		expect(parentLevels[1].levelDefinition.fetch.entity.name).toBe("entity-of-anotherEntityViewId");
		expect(parentLevels[1].levelDefinition.fetch.entity.meta.name).toBe("entity-of-anotherEntityViewId");
		expectCorrectTemplates(parentLevels[1].levelDefinition.templates, "EntityOfAnotherEntityView", 190);
		expectCorrectColumns(parentLevels[1].levelDefinition.templates as HierarchyRowTemplate[]); // fixme cast

		const childLevel = treeLevelDefinition.childLevel;
		expect(childLevel?.referencePropertyName).toBe("parentMainId");
		expect(childLevel?.levelDefinition.fetch.entity.name).toBe("entity-of-childEntityViewId");
		expect(childLevel?.levelDefinition.fetch.entity.meta.name).toBe("entity-of-childEntityViewId");
		expectCorrectTemplates(childLevel?.levelDefinition.templates, "EntityOfChildEntityView", 170);
		expectCorrectColumns(childLevel?.levelDefinition.templates as HierarchyRowTemplate[]); // fixme cast
		expect(childLevel?.levelDefinition.childLevel?.referencePropertyName).toBe("parentChildId");
		expect(childLevel?.levelDefinition.childLevel?.levelDefinition.fetch.entity.name).toBe("entity-of-childChildEntityViewId");
		expect(childLevel?.levelDefinition.childLevel?.levelDefinition.fetch.entity.meta.name).toBe("entity-of-childChildEntityViewId");
		expectCorrectTemplates(childLevel?.levelDefinition.childLevel?.levelDefinition.templates, "EntityOfChildChildEntityView", 220);
		expectCorrectColumns(childLevel?.levelDefinition.childLevel?.levelDefinition.templates as HierarchyRowTemplate[]); // fixme cast
	});

	it("throws an error if the json does not conform to a schema", async () => {
		await expect(async () =>
			constructTreeLevelDefinition("mainViewId", { unknown: "property" } as TreeConfiguration, viewDefinitionLoader, metaLoader)
		).rejects.toThrow("Data is invalid: must NOT have additional properties.");
	});

	it("tags the main fetch with a special tag so that we know we need to use dataset for that fetch instead of making a request", async () => {
		const treeLevelDefinition = await constructTreeLevelDefinition("mainViewId", {}, viewDefinitionLoader, metaLoader);
		expect(treeLevelDefinition.fetch.tag).toBe("this is main fetch");
	});
});

function expectCorrectTemplates(templates: RowTemplate[] | undefined, name: string, width: number) {
	expect(templates?.length).toBe(1);
	expect(templates?.[0].name).toBe(name);
	expect(templates?.[0].size.width()).toBe(width);
	expect(templates?.[0].size.height()).toBe(40);
	expect(templates?.[0].cellTemplates.length).toBe(1);
	expect(templates?.[0].cellTemplates[0].dataMember).toBe("name");
	expect(templates?.[0].cellTemplates[0].position.left()).toBe(0);
	expect(templates?.[0].cellTemplates[0].size.width()).toBe(width);
	expect(templates?.[0].cellTemplates[0].size.height()).toBe(40);
	expect(templates?.[0].cellTemplates[0].style?.verticalAlignment).toBe(ContentAlignment.Center);
	expect(templates?.[0].cellTemplates[0].anchor).toBe(ListCellAnchor.Left);
}

function expectCorrectColumns(templates: HierarchyRowTemplate[] | undefined) {
	expect(templates?.length).toBe(1);
	expect(templates?.[0].primaryCellTemplate?.dataMember).toBe("name");
	expect(templates?.[0].primaryCellTemplate?.name).toBe("Name");
	expect(templates?.[0].hierarchyCellTemplates.length).toBe(2);
	expect(templates?.[0].hierarchyCellTemplates[0].dataMember).toBe("name");
	expect(templates?.[0].hierarchyCellTemplates[0].name).toBe("Name");
	expect(templates?.[0].hierarchyCellTemplates[1].dataMember).toBe("mail");
	expect(templates?.[0].hierarchyCellTemplates[1].name).toBe("Email");
}
