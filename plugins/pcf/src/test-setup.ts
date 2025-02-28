// From https://github.com/nrwl/nx/blob/master/scripts/unit-test-setup.js
// This is needed because of this https://github.com/nrwl/nx/issues/23435

process.env["NX_DAEMON"] = "false";

/**
 * When `createProjectGraphAsync` is called during tests,
 * if its not mocked, it will return the Nx repo's project
 * graph. We don't want any unit tests to depend on the structure
 * of the Nx repo, so we mock it to return an empty project graph.
 */
jest.doMock("@nx/devkit", () => ({
	...jest.requireActual("@nx/devkit"),
	createProjectGraphAsync: async () => {
		return {
			nodes: {},
			dependencies: {},
		};
	},
}));
