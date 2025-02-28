import { validateJson } from "@resconet/common";
import { deserializeFetchXml } from "@resconet/crm-data";
import { CellTemplateDefinition, LocalizedMetaEntity, ViewDefinition, ViewDefinitionLoader } from "@resconet/power-service";
import { ContentAlignment, ListCellAnchor, ListCellStyle } from "@resconet/resco-data";
import { CellTemplate, RowTemplate } from "@resconet/resco-observables";
import { TreeLevelDefinition, TreeLevelReference, TreeRecursiveReference, type TreeLevelDefinitionOptions } from "@resconet/tree-data";
import type { TreeConfiguration, TreeLevelConfiguration } from "./treeConfiguration";
import JSON_SCHEMA from "./treeConfigurationSchema.json";

export class HierarchyRowTemplate extends RowTemplate {
	constructor(
		entityNameLocalized: string,
		public readonly hierarchyCellTemplates: readonly CellTemplate[],
		public readonly primaryCellTemplate: CellTemplate
	) {
		super();
		this.name = entityNameLocalized;
	}
}

export async function constructTreeLevelDefinition(
	mainViewId: string,
	treeDefinitionJson: TreeConfiguration,
	viewDefinitionLoader: ViewDefinitionLoader,
	metaLoader: (name: string, attributeNames?: string[]) => Promise<LocalizedMetaEntity>
): Promise<TreeLevelDefinition> {
	validateJson(JSON_SCHEMA, treeDefinitionJson);

	const definition = await constructLevelAndParentsAndChildren(mainViewId, treeDefinitionJson, viewDefinitionLoader, metaLoader);
	definition.fetch.tag = "this is main fetch";

	return definition;
}

async function constructLevelAndParentsAndChildren(
	viewId: string,
	treeDefinitionJson: TreeConfiguration,
	viewDefinitionLoader: ViewDefinitionLoader,
	metaLoader: (name: string, attributeNames?: string[]) => Promise<LocalizedMetaEntity>
): Promise<TreeLevelDefinition> {
	const viewDefinition = await viewDefinitionLoader(viewId);

	const rowTemplate = await createRowTemplate(viewDefinition, metaLoader);
	const fetch = await createFetch(viewDefinition, metaLoader);

	const recursiveReference = createRecursiveReference(treeDefinitionJson);
	const parentReferences = await constructParentLevels(treeDefinitionJson, viewDefinitionLoader, metaLoader);
	const childReference = await constructChildLevel(treeDefinitionJson, viewDefinitionLoader, metaLoader);

	const options: TreeLevelDefinitionOptions = {
		allowCreate: true,
		allowOpen: true,
	};

	return new TreeLevelDefinition([rowTemplate], fetch, undefined, parentReferences, childReference, recursiveReference, options);
}

async function createFetch(viewDefinition: ViewDefinition, metaLoader: (name: string, attributeNames?: string[]) => Promise<LocalizedMetaEntity>) {
	const fetch = deserializeFetchXml(viewDefinition.fetchXml);
	fetch.entity.meta = await metaLoader(fetch.entity.name);
	return fetch;
}

async function createRowTemplate(
	viewDefinition: ViewDefinition,
	metaLoader: (name: string, attributeNames?: string[]) => Promise<LocalizedMetaEntity>
) {
	const metaEntity = await metaLoader(
		viewDefinition.entityName,
		viewDefinition.cellTemplates.map(cell => cell.column)
	);

	const cellTemplates = viewDefinition.cellTemplates.map(def => createCellTemplate(def, metaEntity));
	const primaryCellDef = viewDefinition.cellTemplates.find(cell => cell.column === metaEntity.primaryFieldName) ?? viewDefinition.cellTemplates[0];
	const primaryCellTemplate = createCellTemplate(primaryCellDef, metaEntity);
	const entityNameLocalized = metaEntity.displayNames.get(viewDefinition.entityName) ?? viewDefinition.entityName;

	const totalWidth = primaryCellDef.width;

	const rowTemplate = new HierarchyRowTemplate(entityNameLocalized, cellTemplates, primaryCellTemplate);
	rowTemplate.size.width(totalWidth);
	rowTemplate.size.height(40);
	rowTemplate.cellTemplates.push(primaryCellTemplate);
	return rowTemplate;
}

function createRecursiveReference(treeDefinitionJson: TreeConfiguration) {
	const recursivePropertyName = treeDefinitionJson.recursive;
	const recursiveReference = recursivePropertyName ? new TreeRecursiveReference(recursivePropertyName) : undefined;
	return recursiveReference;
}

async function constructParentLevels(
	treeDefinitionJson: TreeConfiguration,
	viewDefinitionLoader: ViewDefinitionLoader,
	metaLoader: (name: string) => Promise<LocalizedMetaEntity>
) {
	const parents = treeDefinitionJson.parents ?? [];
	const parentReferences = await Promise.all(
		parents.map(async parentLevel => await constructParentLevel(parentLevel, viewDefinitionLoader, metaLoader))
	);
	return parentReferences;
}

async function constructParentLevel(
	parentLevel: TreeLevelConfiguration,
	viewDefinitionLoader: ViewDefinitionLoader,
	metaLoader: (name: string) => Promise<LocalizedMetaEntity>
) {
	const parentLevelProperty = parentLevel.property;
	const parentLevelDefinition = await constructLevelAndParentsAndChildren(parentLevel.viewId, parentLevel, viewDefinitionLoader, metaLoader);
	return new TreeLevelReference(parentLevelProperty, parentLevelDefinition);
}

async function constructChildLevel(
	treeDefinitionJson: TreeConfiguration,
	viewDefinitionLoader: ViewDefinitionLoader,
	metaLoader: (name: string) => Promise<LocalizedMetaEntity>
) {
	const childJson = treeDefinitionJson.child;
	const childProperty = childJson?.property;
	const childDefinition = childJson
		? await constructLevelAndParentsAndChildren(childJson.viewId, childJson, viewDefinitionLoader, metaLoader)
		: undefined;
	const childReference = childDefinition && childProperty ? new TreeLevelReference(childProperty, childDefinition) : undefined;
	return childReference;
}

function createCellTemplate(cellTemplateDefinition: CellTemplateDefinition, metaEntity: LocalizedMetaEntity) {
	const cellTemplate = new CellTemplate(cellTemplateDefinition.column);
	cellTemplate.position.left(0);
	cellTemplate.size.width(cellTemplateDefinition.width);
	cellTemplate.size.height(40);
	cellTemplate.style = new ListCellStyle();
	cellTemplate.style.verticalAlignment = ContentAlignment.Center;
	cellTemplate.anchor = ListCellAnchor.Left;
	cellTemplate.name = metaEntity.displayNames.get(cellTemplateDefinition.column);
	return cellTemplate;
}
