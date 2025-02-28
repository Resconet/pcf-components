const nxPreset = require("@nx/jest/preset").default;

const customOptions = {
	clearMocks: true,
	resetMocks: true,
	restoreMocks: true,
	moduleNameMapper: {
		...nxPreset.moduleNameMapper,
		"\\.(css|scss|less|jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$": "jest-transform-stub",
	},
	reporters:
		process.env["CI"] === "1" ? ["default", ["jest-junit", { outputDirectory: "reports", outputName: `test-${Date.now()}.xml` }]] : ["default"],
	// this solves the issue with jest having trouble with @interactjs library, see
	// https://stackoverflow.com/questions/58613492/how-to-resolve-cannot-use-import-statement-outside-a-module-from-jest-when-run
	transformIgnorePatterns: ["/node_modules/(?!@interactjs)"],
};

module.exports = {
	...nxPreset,
	...customOptions,
};
