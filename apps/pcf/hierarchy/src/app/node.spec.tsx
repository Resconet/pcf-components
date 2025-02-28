import { CellTemplate, RowTemplate, StaticObservableSource } from "@resconet/resco-observables";
import { universalEntity } from "@resconet/testing-crm";
import { TemplatedTreeItem } from "@resconet/tree-data";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { observable } from "knockout";
import { Node } from "./node";
import { HierarchyRowTemplate } from "./treeLevelDefinitionFactory";

describe("Node", () => {
	it("renders all columns of an item in content part", async () => {
		const item = withItem();
		render(<Node item={item} />);
		expect((await screen.findByTestId("content")).textContent).toContain("John Doe");
		expect((await screen.findByTestId("content")).textContent).toContain("john.doe@john.com");
	});

	it("renders localized column names of an item in content part", async () => {
		const item = withItem();
		render(<Node item={item} />);
		expect((await screen.findByTestId("content")).textContent).toContain("Name:");
		expect((await screen.findByTestId("content")).textContent).toContain("Email:");
	});

	it("renders primary name in the header", async () => {
		const item = withItem();
		render(<Node item={item} />);
		expect((await screen.findByTestId("header")).textContent).toContain("John Doe");
	});

	it("renders localized primary column name in the header", async () => {
		const item = withItem();
		render(<Node item={item} />);
		expect((await screen.findByTestId("header")).textContent).toContain("Name");
	});

	it("has localized entity name in the header", async () => {
		const item = withItem();
		render(<Node item={item} />);
		expect((await screen.findByTestId("header")).textContent).toContain("SomeEntity");
	});
});

function withItem(id = "some", expanded = false, visible = true): TemplatedTreeItem {
	const entity = universalEntity({
		id,
		name: "John Doe",
		email: "john.doe@john.com",
	});
	const cellA = new CellTemplate("name");
	cellA.name = "Name";
	const cellC = new CellTemplate("email");
	cellC.name = "Email";
	const template = new HierarchyRowTemplate("SomeEntity", [cellA, cellC], cellA);
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
