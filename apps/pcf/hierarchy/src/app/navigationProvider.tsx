import { createContext, useCallback, useContext } from "react";

type NavigationContextType = {
	navigate: (entityName: string, entityId: string) => Promise<void>;
};

const NavigationContext = createContext<NavigationContextType>({
	navigate: async () => {
		throw new Error("The hook 'useNavigation' must be used within a IconProvider");
	},
});

type NavigationProviderProps = {
	children: React.ReactNode;
	navigation: ComponentFramework.Navigation;
};

export function NavigationProvider({ children, navigation }: NavigationProviderProps) {
	const navigate = useCallback(
		async (entityName: string, entityId: string) => {
			await navigation.openForm({ entityName, entityId });
		},
		[navigation]
	);

	return <NavigationContext.Provider value={{ navigate }}>{children}</NavigationContext.Provider>;
}

export function useNavigation() {
	return useContext(NavigationContext);
}
