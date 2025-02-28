import { Box, CircularProgress, Paper, Stack } from "@mui/material";
import type { ObservableSource } from "@resconet/resco-observables";
import type { TemplatedTreeItem } from "@resconet/tree-data";
import { Tree as OurTree } from "@resconet/tree-react";
import { useEffect, useRef, useState } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { ReactZoomPanPinchRef, TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import { useDataSource } from "../hooks/useDataSource";
import styles from "./app.module.scss";
import { HorizontalTree } from "./horizontalTree/horizontalTree";
import { NavigationProvider } from "./navigationProvider";
import { useDataSourceFactory } from "./useDataSourceFactory";
import { UtilityProvider } from "@resconet/power-ui";

export interface AppProps {
	readonly expandLoadedNodes: ComponentFramework.PropertyTypes.TwoOptionsProperty;
	readonly width: number;
	readonly height: ComponentFramework.PropertyTypes.WholeNumberProperty;
	readonly dataSet: ComponentFramework.PropertyTypes.DataSet;
	readonly treeDefinition: ComponentFramework.PropertyTypes.StringProperty;
	readonly webAPI: ComponentFramework.WebApi;
	readonly utils: ComponentFramework.Utility;
	readonly navigation: ComponentFramework.Navigation;
}

export function App({ dataSet, width, height, expandLoadedNodes, treeDefinition, webAPI, utils, navigation }: AppProps) {
	const dataSource = useDataSourceFactory(dataSet, treeDefinition, webAPI, utils);

	return dataSource ? (
		<UtilityProvider utils={utils}>
			<NavigationProvider navigation={navigation}>
				<DataSourceConsumer width={width} height={height} expandLoadedNodes={expandLoadedNodes} dataSource={dataSource} />
			</NavigationProvider>
		</UtilityProvider>
	) : (
		<CircularProgress />
	);
}

type DataSourceConsumerProps = {
	dataSource: ObservableSource<TemplatedTreeItem>;
	expandLoadedNodes: ComponentFramework.PropertyTypes.TwoOptionsProperty;
	width: number;
	height: ComponentFramework.PropertyTypes.WholeNumberProperty;
};

export function DataSourceConsumer({ dataSource, expandLoadedNodes, height, width }: DataSourceConsumerProps) {
	const { items } = useDataSource(dataSource);
	const zoomRef = useRef<ReactZoomPanPinchRef>(null);
	const [selectedItem, setSelectedItem] = useState<TemplatedTreeItem | undefined>();
	const [initialZoomed, setInitialZoomed] = useState(false);

	useEffect(() => {
		// Clear the selected item after 2 seconds during which the item is highlighted
		const timeout = setTimeout(() => {
			setSelectedItem(undefined);
		}, 2000);

		return () => clearTimeout(timeout);
	}, [selectedItem]);

	useEffect(() => {
		if (expandLoadedNodes.raw) {
			expandItems(items);
		}

		if (zoomRef.current && items.length > 0 && !initialZoomed) {
			centerToItem(items[0], zoomRef.current);
			setInitialZoomed(true);
		}
	}, [expandLoadedNodes.raw, initialZoomed, items]);

	return (
		<Paper sx={{ margin: 1 }}>
			<Stack direction="row" height={height.raw + "px"} width={width + "px"}>
				<PanelGroup autoSaveId="example" direction="horizontal">
					<Panel style={{ overflow: "auto" }}>
						<OurTree
							root
							onItemClick={templateItem => {
								setSelectedItem(templateItem);
								if (zoomRef.current) {
									centerToItem(templateItem, zoomRef.current);
								}
							}}
							dataSource={dataSource}
						/>
					</Panel>
					<PanelResizeHandle className={styles["divider"]} />
					<Panel>
						<Box sx={{ backgroundColor: "#EFEFEF", height: "100%" }}>
							<TransformWrapper
								limitToBounds={false}
								ref={zoomRef}
								centerOnInit
								alignmentAnimation={{ disabled: true }}
								centerZoomedOut={false}
								minScale={0.0001}
								wheel={{ step: 0.02 }}
								doubleClick={{ disabled: true }}
							>
								<TransformComponent
									wrapperStyle={{
										maxHeight: "100%",
										minHeight: "100%",
										maxWidth: "100%",
										minWidth: "100%",
									}}
								>
									<HorizontalTree selectedItem={selectedItem} items={items} />
								</TransformComponent>
							</TransformWrapper>
						</Box>
					</Panel>
				</PanelGroup>
			</Stack>
		</Paper>
	);
}

function centerToItem(item: TemplatedTreeItem, zoomRef: ReactZoomPanPinchRef) {
	setTimeout(() => {
		zoomRef.zoomToElement(item.entity.id, zoomRef.state.scale);
	});
}

function expandItems(items: TemplatedTreeItem[]) {
	items.forEach(item => {
		if (item.children.loaded$() && item.children.items$().length > 0) {
			item.expanded$(true);
			expandItems(item.children.items$());
		}
	});
}
