import { Inputs } from "./inputsOutputs";

export function mockDataInHarness(context: ComponentFramework.Context<Inputs>) {
	if (inHarness(context)) {
		mockView(context);
		Object.assign(context.utils, mockUtility());
	}
}

export function inHarness(context: ComponentFramework.Context<Inputs>) {
	return context.userSettings.userId === "{00000000-0000-0000-0000-000000000000}";
}

function mockView(context: ComponentFramework.Context<Inputs>) {
	Object.assign(context.webAPI, mockWebApi(context));
}

function mockUtility(): Partial<ComponentFramework.Utility> {
	// eslint-disable-next-line @typescript-eslint/naming-convention
	const getAttributes = (attributeNames: string[] | undefined) => attributeNames?.map(name => ({ LogicalName: name, DisplayName: name }));
	return {
		getEntityMetadata: async (entityName, attributeNames) => {
			// eslint-disable-next-line @typescript-eslint/naming-convention
			return { PrimaryIdAttribute: "some-id", PrimaryNameAttribute: "name", Attributes: { getAll: () => getAttributes(attributeNames) } };
		},
	} as Partial<ComponentFramework.Utility>;
}

function mockWebApi(context: ComponentFramework.Context<Inputs>): Partial<ComponentFramework.WebApi> {
	return {
		retrieveRecord: async (entityType, id) => {
			return {
				name: id,
				fetchxml: `<fetch><entity name="${entityType}"></entity></fetch>`,
				returnedtypecode: entityType,
				/* eslint-disable @typescript-eslint/naming-convention */
				layoutjson: JSON.stringify({
					Name: "resultset",
					Object: 1,
					Rows: [
						{
							Name: "result",
							Id: "accountid",
							Cells: context.parameters.data.columns.map(column => ({
								Name: column.name,
								Width: 100,
								CellType: "",
							})),
							LayoutStyle: "",
						},
					],
					CustomControlDescriptions: [],
					Jump: "name",
					Select: true,
					Icon: true,
					Preview: true,
					IconRenderer: "",
				}),
				/* eslint-enable @typescript-eslint/naming-convention */
			};
		},
	};
}
