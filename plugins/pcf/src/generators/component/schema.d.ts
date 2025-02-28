import type { Schema as ReactSchema } from "@nx/react/src/generators/application/schema";

type ComponentType = "standard" | "virtual-react" | "virtual-react-fluent";

export interface ComponentGeneratorSchema extends ReactSchema {
	componentName: string;
	type: ComponentType;
	namespace: string;
	prefix: string;
	publisher: string;
	requiredFeatures?: string[];
	optionalFeatures?: string[];
}
