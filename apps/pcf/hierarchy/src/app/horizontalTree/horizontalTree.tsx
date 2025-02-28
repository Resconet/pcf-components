import { Box } from "@mui/material";
import { TemplatedTreeItem } from "@resconet/tree-data";
import { Tree } from "react-organizational-chart";
import { HorizontalTreeNodes } from "./horizontalTreeNodes";

type HorizontalTreeProps = {
	items: TemplatedTreeItem[];
	selectedItem?: TemplatedTreeItem;
};

export function HorizontalTree({ items, selectedItem }: HorizontalTreeProps) {
	return (
		<Box sx={{ width: "10000px", display: "flex", alignItems: "center", justifyContent: "center" }}>
			<Tree lineWidth="2px" label={"Chart"} lineColor="#bdbaba" lineBorderRadius="6px">
				<HorizontalTreeNodes selectedItem={selectedItem} nodes={items} />
			</Tree>
		</Box>
	);
}
