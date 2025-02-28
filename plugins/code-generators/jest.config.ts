/* eslint-disable */
export default {
	displayName: "plugins-code-generators",
	preset: "../../jest.preset.js",
	transform: {
		"^.+\\.[tj]s$": ["ts-jest", { tsconfig: "<rootDir>/tsconfig.spec.json" }],
	},
	moduleFileExtensions: ["ts", "js", "html"],
	coverageDirectory: "../../coverage/plugins/code-generators",
};
