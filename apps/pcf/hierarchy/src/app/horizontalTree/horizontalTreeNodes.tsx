import { TemplatedTreeItem } from "@resconet/tree-data";
import { useObservable } from "@resconet/tree-react";
import { TreeNode } from "react-organizational-chart";
import { Node } from "../node";

type HorizontalTreeNodesProps = {
	nodes: TemplatedTreeItem[];
	selectedItem?: TemplatedTreeItem;
};

export function HorizontalTreeNodes({ nodes, selectedItem }: HorizontalTreeNodesProps) {
	return nodes.map(node => <HorizontalTreeNode key={node.entity.id} node={node} selectedItem={selectedItem} />);
}

type HorizontalTreeNodeProps = {
	node: TemplatedTreeItem;
	selectedItem?: TemplatedTreeItem;
};

function HorizontalTreeNode({ node, selectedItem }: HorizontalTreeNodeProps) {
	const expanded = useObservable(node.expanded$);
	const children = useObservable(node.children.items$);

	return (
		<TreeNode label={<Node item={node} isSelected={selectedItem?.entity.id === node.entity.id} />}>
			{(expanded && <HorizontalTreeNodes selectedItem={selectedItem} nodes={children} />) || null}
		</TreeNode>
	);
}
