import type { ObservableSource } from "@resconet/resco-observables";
import type { TemplatedTreeItem } from "@resconet/tree-data";
import { useObservable } from "@resconet/tree-react";

export function useDataSource(dataSource: ObservableSource<TemplatedTreeItem>) {
	const isLoading = useObservable(dataSource.loading$);
	const items = useObservable(dataSource.items$);
	const error = useObservable(dataSource.error$);

	return {
		isLoading,
		items,
		error,
	};
}
