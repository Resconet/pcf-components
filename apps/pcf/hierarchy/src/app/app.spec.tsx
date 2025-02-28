import { CellTemplate, StaticObservableSource, type ObservableSource, type RowTemplate } from "@resconet/resco-observables";
import { universalEntity } from "@resconet/testing-crm";
import { TemplatedTreeItem } from "@resconet/tree-data";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { observable } from "knockout";
import { DataSourceConsumer } from "./app";
import { HierarchyRowTemplate } from "./treeLevelDefinitionFactory";

global.ResizeObserver = vi.fn().mockImplementation(() => ({
	observe: vi.fn(),
	unobserve: vi.fn(),
	disconnect: vi.fn(),
}));

describe("App", () => {
	it("renders all items from data source", async () => {
		render(
			<DataSourceConsumer
				expandLoadedNodes={{ raw: true } as ComponentFramework.PropertyTypes.TwoOptionsProperty}
				width={500}
				height={{ raw: 100 } as ComponentFramework.PropertyTypes.WholeNumberProperty}
				dataSource={withDataSource("item 1", "item 2", "item 3")}
			/>
		);
		expect((await screen.findAllByText("Entity item 1"))[0]).toBeInTheDocument();
		expect((await screen.findAllByText("Entity item 2"))[0]).toBeInTheDocument();
		expect((await screen.findAllByText("Entity item 3"))[0]).toBeInTheDocument();
	});
});

function withDataSource(...itemIds: string[]): ObservableSource<TemplatedTreeItem> {
	const source = new StaticObservableSource<TemplatedTreeItem>();
	source.items$.push(...itemIds.map(itemName => item(itemName)));
	return source;
}

function item(id = "some", expanded = false, visible = true): TemplatedTreeItem {
	const entity = universalEntity(id);
	const cell = new CellTemplate("name");
	const template = new HierarchyRowTemplate("Some Entity", [cell], cell);
	template.cellTemplates.push(cell);
	return new TemplatedTreeItem(
		entity,
		observable<RowTemplate>(template),
		new StaticObservableSource(),
		observable(expanded),
		observable(visible),
		[],
		true
	);
}
