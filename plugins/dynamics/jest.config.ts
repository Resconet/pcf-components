/* eslint-disable */
export default {
	displayName: "dynamics",
	preset: "../../jest.preset.js",
	transform: {
		"^.+\\.[tj]s$": ["ts-jest", { tsconfig: "<rootDir>/tsconfig.spec.json" }],
	},
	moduleFileExtensions: ["ts", "js", "html"],
	coverageDirectory: "../../coverage/plugins/dynamics",
	setupFiles: ["whatwg-fetch"],
};
