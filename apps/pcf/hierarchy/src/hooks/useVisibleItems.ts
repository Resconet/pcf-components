import type { TemplatedTreeItem } from "@resconet/tree-data";
import { pureComputed } from "knockout";
import { useEffect, useState } from "react";

export function useVisibleItems(items: TemplatedTreeItem[]) {
	const [visibleStates, setVisibleStates] = useState<{ [id: string]: boolean }>({});

	useEffect(() => {
		const visibilities = pureComputed(() => {
			return items.reduce<{ [id: string]: boolean }>((acc, item) => {
				acc[item.entity.id] = item.visible$();
				return acc;
			}, {});
		});

		setVisibleStates(visibilities());

		const sub = visibilities.subscribe(setVisibleStates);

		return () => sub.dispose();
	}, [items]);

	return items.filter(item => visibleStates[item.entity.id]);
}
