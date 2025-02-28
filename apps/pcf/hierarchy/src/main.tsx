import { name, namespace, registerPcfComponent } from "@resconet/component";
import * as ReactDOM from "react-dom/client";
import { App } from "./app/app";
import { mockDataInHarness } from "./harnessMocks";
import type { Inputs, Outputs } from "./inputsOutputs";

@namespace("RescoPcf")
@name("Hierarchy")
export class Hierarchy implements ComponentFramework.StandardControl<Inputs, Outputs> {
	root: ReactDOM.Root | undefined;
	/**
	 * Used to initialize the control instance. Controls can kick off remote server calls and other initialization actions here.
	 * Data-set values are not initialized here, use updateView.
	 * @param context The entire property bag available to control via Context Object; It contains values as set up by the customizer mapped to property names defined in the manifest, as well as utility functions.
	 * @param notifyOutputChanged A callback method to alert the framework that the control has new outputs ready to be retrieved asynchronously.
	 * @param state A piece of data that persists in one session for a single user. Can be set at any point in a controls life cycle by calling 'setControlState' in the Mode interface.
	 * @param container If a control is marked control-type='standard', it will receive an empty div element within which it can render its content.
	 */
	public init(
		context: ComponentFramework.Context<Inputs>,
		notifyOutputChanged: () => void,
		state: ComponentFramework.Dictionary,
		container: HTMLDivElement
	): void {
		mockDataInHarness(context);
		context.mode.trackContainerResize(true);
		const root = ReactDOM.createRoot(container);
		this.root = root;
		root.render(
			<App
				width={context.mode.allocatedWidth}
				height={context.parameters.height}
				expandLoadedNodes={context.parameters.expandLoadedNodes}
				treeDefinition={context.parameters.treeDefinition}
				dataSet={context.parameters.data}
				webAPI={context.webAPI}
				utils={context.utils}
				navigation={context.navigation}
			/>
		);
	}

	/**
	 * Called when any value in the property bag has changed. This includes field values, data-sets, global values such as container height and width, offline status, control metadata values such as label, visible, etc.
	 * @param context The entire property bag available to control via Context Object; It contains values as set up by the customizer mapped to names defined in the manifest, as well as utility functions
	 */
	public updateView(context: ComponentFramework.Context<Inputs>): void {
		mockDataInHarness(context);
		this.root?.render(
			<App
				width={context.mode.allocatedWidth}
				height={context.parameters.height}
				expandLoadedNodes={context.parameters.expandLoadedNodes}
				treeDefinition={context.parameters.treeDefinition}
				dataSet={context.parameters.data}
				webAPI={context.webAPI}
				utils={context.utils}
				navigation={context.navigation}
			/>
		);
	}

	/**
	 * It is called by the framework prior to a control receiving new data.
	 * @returns an object based on nomenclature defined in manifest, expecting object[s] for property marked as “bound” or “output”
	 */
	public getOutputs(): Outputs {
		return {};
	}

	/**
	 * Called when the control is to be removed from the DOM tree. Controls should use this call for cleanup.
	 * i.e. cancelling any pending remote calls, removing listeners, etc.
	 */
	public destroy(): void {
		// Add code to cleanup control if necessary
	}
}

registerPcfComponent(Hierarchy);
