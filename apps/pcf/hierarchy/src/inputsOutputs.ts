export interface Inputs {
	/**
	 * Main level dataset.
	 * @oftype DataSet
	 * @required
	 */
	data: ComponentFramework.PropertyTypes.DataSet;

	/**
	 * Tree definition json.
	 * @oftype SingleLine.TextArea
	 * @required
	 */
	treeDefinition: ComponentFramework.PropertyTypes.StringProperty;

	/**
	 * Height of the control in pixels.
	 * @oftype Whole.None
	 * @required
	 */
	height: ComponentFramework.PropertyTypes.WholeNumberProperty;

	/**
	 *  Expand loaded nodes.
	 *  @oftype TwoOptions
	 *  @required
	 */
	expandLoadedNodes: ComponentFramework.PropertyTypes.TwoOptionsProperty;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface Outputs {}
