import { Avatar, Box, Card, CardContent, CardHeader, Chip, Divider, Stack, Typography, type SxProps, type Theme } from "@mui/material";
import { teal } from "@mui/material/colors";
import { TemplatedTreeItem } from "@resconet/tree-data";
import { useObservable } from "@resconet/tree-react";
import { pureComputed } from "knockout";
import { useNavigation } from "./navigationProvider";
import styles from "./node.module.scss";
import type { HierarchyRowTemplate } from "./treeLevelDefinitionFactory";
import { useEntityColor } from "@resconet/power-ui";

type NodeProps = {
	item: TemplatedTreeItem;
	isSelected?: boolean;
};

export function Node({ item, isSelected }: NodeProps) {
	const template = useObservable(item.template) as HierarchyRowTemplate; // fixme cast
	const childItems = useObservable(item.children.items$);
	const childrenLoaded = useObservable(item.children.loaded$);
	const hasVisibleChildren = useObservable(pureComputed(() => hasAtLeastOneVisible(childItems)));
	const isChevronVisible = !childrenLoaded || hasVisibleChildren;
	const expanded = useObservable(item.expanded$);

	const primaryName = item.entity.getTextValue(template.primaryCellTemplate.dataMember, true) as string;
	const primaryCellNameLocalized = template.primaryCellTemplate.name;
	const entityNameLocalized = template.name;
	const { navigate } = useNavigation();
	const { entityColor } = useEntityColor(item.entity.entityName);

	return (
		<div className={styles["wrapper"]}>
			<Stack direction="column" spacing={1}>
				<Card
					style={{
						cursor: isChevronVisible ? "pointer" : "unset",
					}}
					onClick={() => {
						if (item.children.loaded$() && item.children.items$().length > 0) {
							item.expanded$(!item.expanded$());
						}
					}}
					id={item.entity.id}
					className={(isSelected ? styles["highlight"] : undefined) + " " + styles["paper"]}
				>
					<CardHeader
						data-testid="header"
						sx={{
							overflow: "hidden",
							"& .MuiCardHeader-content": {
								overflow: "hidden",
							},
						}}
						avatar={
							<Avatar sx={{ bgcolor: teal[200] }} aria-label={primaryName}>
								{primaryName[0]}
							</Avatar>
						}
						title={primaryCellNameLocalized + ":"}
						titleTypographyProps={{ fontSize: "14px", color: "#808080", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}
						subheader={primaryName}
						subheaderTypographyProps={{
							onClick: e => {
								e.stopPropagation();
								e.preventDefault();
								const entityName = item.entity.entityName;
								const entityId = item.entity.id;
								navigate(entityName, entityId);
							},
							component: "a",
							className: styles["link"],
							fontSize: "16px",
							color: "#0044E1DE",
							textOverflow: "ellipsis",
							overflow: "hidden",
							whiteSpace: "nowrap",
						}}
						action={<Chip label={entityNameLocalized} sx={{ color: getContrastColor(entityColor), backgroundColor: entityColor }} />}
					></CardHeader>
					<Divider />
					<CardContent data-testid="content">
						<Stack direction="column" spacing={1}>
							{template.hierarchyCellTemplates.map(
								cell =>
									cell && <NodeRow key={cell.dataMember} label={cell.name ?? ""} value={item.entity.getTextValue(cell.dataMember, true) as string} />
							)}
						</Stack>
					</CardContent>
				</Card>
				{childrenLoaded && childItems.length > 0 && !expanded && <Box>+ {childItems.length}</Box>}
			</Stack>
		</div>
	);
}

type NodeRowProps = {
	label: string;
	value: string;
};

const ELLIPSIS: SxProps<Theme> = {
	textOverflow: "ellipsis",
	whiteSpace: "nowrap",
	overflow: "hidden",
};

function NodeRow({ label, value }: NodeRowProps) {
	return (
		<Stack direction="row" spacing={1} alignItems="center">
			<Typography variant="body2" sx={{ fontSize: "14px", flex: 1, color: "#808080", ...ELLIPSIS }}>
				{label}:
			</Typography>
			<Typography variant="body1" sx={{ fontSize: "16px", flex: 2, color: "rgba(0, 0, 0, 0.87)", ...ELLIPSIS }}>
				{value}
			</Typography>
		</Stack>
	);
}

function hasAtLeastOneVisible(items: TemplatedTreeItem[]) {
	return items.some(item => item.visible$());
}

function getContrastColor(color: string) {
	const r = parseInt(color.substring(4, color.indexOf(",")), 10);
	const g = parseInt(color.substring(color.indexOf(",") + 1, color.lastIndexOf(",")), 10);
	const b = parseInt(color.substring(color.lastIndexOf(",") + 1, color.length - 1), 10);
	const yiq = (r * 299 + g * 587 + b * 114) / 1000;
	return yiq >= 128 ? "black" : "white";
}
