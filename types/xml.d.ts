declare module "*.xml?raw" {
	const content: string;
	export default content;
}

declare module "*.xml" {
	const content: string;
	export default content;
}
