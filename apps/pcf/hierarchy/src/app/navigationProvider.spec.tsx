import { act, render, screen } from "@testing-library/react";
import { NavigationProvider, useNavigation } from "./navigationProvider";

describe("navigationProvider", () => {
	it("should navigate to correct form", () => {
		const navigation = withNavigation();
		render(
			<NavigationProvider navigation={navigation}>
				<TestComponent />
			</NavigationProvider>
		);

		act(() => {
			screen.getByRole("button").click();
		});

		expect(navigation.openForm).toHaveBeenCalledWith({ entityName: "entity-name", entityId: "entity-id" });
	});
});

const TestComponent = () => {
	const { navigate } = useNavigation();

	return <button onClick={() => navigate("entity-name", "entity-id")}>Navigate to home</button>;
};

const withNavigation = (): ComponentFramework.Navigation => {
	return {
		openForm: vi.fn(),
	} as unknown as ComponentFramework.Navigation;
};
