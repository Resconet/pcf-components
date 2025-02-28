/* eslint-disable */
export default {
	displayName: "pcf",
	preset: "../../jest.preset.js",
	transform: {
		"^.+\\.[tj]s$": ["ts-jest", { tsconfig: "<rootDir>/tsconfig.spec.json" }],
	},
	moduleFileExtensions: ["ts", "js", "html"],
	coverageDirectory: "../../coverage/plugins/pcf",
	setupFilesAfterEnv: ["<rootDir>/src/test-setup.ts"],
};
