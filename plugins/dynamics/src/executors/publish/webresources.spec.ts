import fetchMock from "fetch-mock";
import fsPromises from "fs/promises";
import { createWebResource, listWebResources, publishWebResources, updateWebResource } from "./webresources";

describe("listWebResources", () => {
	it("throws exception if unauthorized", async () => {
		mockWebApi();
		await expect(listWebResources("https://test.api", "resco_MobileCRM/WebClient", "bad-cookie")).rejects.toStrictEqual(new Error("Unauthorized"));
	});

	it("returns the list of web resources", async () => {
		mockWebApi();
		const result = await listWebResources("https://test.api", "resco_MobileCRM/WebClient", "good-cookie");
		expect(result).toStrictEqual([
			{ name: "resource1", webresourceid: "f6a83d2e-5bb5-4d46-9682-5c630afc3e20" },
			{ name: "resource2", webresourceid: "f6a83d2e-5bb5-4d46-9682-5c630afc3e21" },
		]);
	});

	it("throws exception if the request fails", async () => {
		mockWebApi(500);
		await expect(listWebResources("https://test.api", "resco_MobileCRM/WebClient", "good-cookie")).rejects.toStrictEqual(
			new Error("Failed to get list of web resources: 500 Internal Server Error")
		);
	});
});

describe("updateWebResource", () => {
	beforeEach(() => {
		mockFiles();
	});

	it("throws exception if unauthorized", async () => {
		mockWebApi();
		await expect(
			updateWebResource("https://test.api", "f6a83d2e-5bb5-4d46-9682-5c630afc3e20", "/path/to/dist", "file.svg", "bad-cookie")
		).rejects.toStrictEqual(new Error("Unauthorized"));
	});

	it("posts the file to the api", async () => {
		const requestBody = mockWebApi();
		await updateWebResource("https://test.api", "f6a83d2e-5bb5-4d46-9682-5c630afc3e20", "/path/to/dist", "file.svg", "good-cookie");
		expect(requestBody["content"]).toBe(Buffer.from("file content").toString("base64"));
	});

	it("throws exception if the request fails", async () => {
		mockWebApi(500);
		await expect(
			updateWebResource("https://test.api", "f6a83d2e-5bb5-4d46-9682-5c630afc3e20", "/path/to/dist", "file.svg", "good-cookie")
		).rejects.toStrictEqual(new Error("Failed to update web resource: 500 Internal Server Error"));
	});
});

describe("createWebResource", () => {
	beforeEach(() => {
		mockFiles();
	});

	it("throws exception if unauthorized", async () => {
		mockWebApi();
		await expect(createWebResource("https://test.api", "resco_MobileCRM/WebClient", "/path/to/dist", "file.svg", "bad-cookie")).rejects.toStrictEqual(
			new Error("Unauthorized")
		);
	});

	it("throws exception if the file extension is not supported", async () => {
		await expect(
			createWebResource("https://test.api", "resco_MobileCRM/WebClient", "/path/to/dist", "file.xxx", "good-cookie")
		).rejects.toStrictEqual(new Error("Unsupported file type: file.xxx"));
	});

	it("posts the file to the api", async () => {
		const requestBody = mockWebApi();
		await createWebResource("https://test.api", "resco_MobileCRM/WebClient", "/path/to/dist", "file.svg", "good-cookie");
		expect(requestBody["content"]).toBe(Buffer.from("file content").toString("base64"));
		expect(requestBody["name"]).toBe("resco_MobileCRM/WebClient/file.svg");
	});

	it("posts the file to the api which is not in the root folder", async () => {
		const requestBody = mockWebApi();
		await createWebResource("https://test.api", "resco_MobileCRM/WebClient", "/path/to/dist", "subfolder/file.svg", "good-cookie");
		expect(requestBody["content"]).toBe(Buffer.from("subfolder file content").toString("base64"));
		expect(requestBody["name"]).toBe("resco_MobileCRM/WebClient/subfolder/file.svg");
		expect(requestBody["webresourcetype"]).toBe(11);
	});

	it("returns the id of newly created resource", async () => {
		mockWebApi();
		const newId = await createWebResource("https://test.api", "resco_MobileCRM/WebClient", "/path/to/dist", "file.svg", "good-cookie");
		expect(newId).toBe("some-id");
	});

	it("throws exception if the request fails", async () => {
		mockWebApi(500);
		await expect(
			createWebResource("https://test.api", "resco_MobileCRM/WebClient", "/path/to/dist", "file.svg", "good-cookie")
		).rejects.toStrictEqual(new Error("Failed to create web resource: 500 Internal Server Error"));
	});
});

describe("publishWebResources", () => {
	beforeEach(() => {
		mockFiles();
	});

	it("throws exception if unauthorized", async () => {
		mockWebApi();
		await expect(publishWebResources("https://test.api", "bad-cookie", ["id-1", "id-2"])).rejects.toStrictEqual(new Error("Unauthorized"));
	});

	it("calls the publish api with specific publish XML", async () => {
		const requestBody = mockWebApi();
		await publishWebResources("https://test.api", "good-cookie", ["id-1", "id-2"]);
		expect(requestBody).toStrictEqual({
			// eslint-disable-next-line @typescript-eslint/naming-convention
			ParameterXml:
				"<importexportxml><webresources><webresource>{id-1}</webresource><webresource>{id-2}</webresource></webresources></importexportxml>",
		});
	});

	it("throws exception if the request fails", async () => {
		mockWebApi(500);
		await expect(publishWebResources("https://test.api", "good-cookie", ["id-1", "id-2"])).rejects.toStrictEqual(
			new Error("Failed to publish web resources: 500 Internal Server Error")
		);
	});
});

function mockFiles() {
	jest.spyOn(fsPromises, "readFile").mockImplementation(async path => {
		if (path === "/path/to/dist/file.svg" || path === "/path/to/dist/file.xxx") {
			return Buffer.from("file content");
		} else if (path === "/path/to/dist/subfolder/file.svg") {
			return Buffer.from("subfolder file content");
		} else {
			const error: NodeJS.ErrnoException = new Error("ENOENT");
			error.code = "ENOENT";
			throw error;
		}
	});
}

function mockWebApi(withStatus = 200): { [key: string]: unknown } {
	const sandbox = fetchMock.sandbox();
	sandbox.config.overwriteRoutes = false;
	const result: { [key: string]: unknown } = {};

	sandbox.get(
		{
			url: "https://test.api/api/data/v9.0/webresourceset?$select=name,webresourceid&$filter=startswith(name,'resco_MobileCRM/WebClient/')",
			headers: {
				// eslint-disable-next-line @typescript-eslint/naming-convention
				Cookie: "good-cookie",
			},
		},
		() => {
			return {
				status: withStatus,
				body: JSON.stringify({
					value: [{ name: "resource1", webresourceid: "f6a83d2e-5bb5-4d46-9682-5c630afc3e20" }],
					"@odata.nextLink": "https://test.api/api/data/v9.0/some-next-link",
				}),
			};
		}
	);

	sandbox.get(
		{
			url: "https://test.api/api/data/v9.0/some-next-link",
			headers: {
				// eslint-disable-next-line @typescript-eslint/naming-convention
				Cookie: "good-cookie",
			},
		},
		() => {
			return {
				status: withStatus,
				body: JSON.stringify({
					value: [{ name: "resource2", webresourceid: "f6a83d2e-5bb5-4d46-9682-5c630afc3e21" }],
				}),
			};
		}
	);

	sandbox.patch(
		{
			url: "https://test.api/api/data/v9.0/webresourceset(f6a83d2e-5bb5-4d46-9682-5c630afc3e20)",
			headers: {
				// eslint-disable-next-line @typescript-eslint/naming-convention
				Cookie: "good-cookie",
			},
		},
		(_, options: RequestInit) => {
			const requestData = JSON.parse(options.body as string);
			Object.assign(result, requestData);

			return {
				status: withStatus,
			};
		}
	);
	sandbox.post(
		{
			url: "https://test.api/api/data/v9.0/webresourceset",
			headers: {
				// eslint-disable-next-line @typescript-eslint/naming-convention
				Cookie: "good-cookie",
			},
		},
		(_, options: RequestInit) => {
			const requestData = JSON.parse(options.body as string);
			Object.assign(result, requestData);

			return {
				status: withStatus,
				body: JSON.stringify({ webresourceid: "some-id" }),
			};
		}
	);

	sandbox.post(
		{
			url: "https://test.api/api/data/v9.0/PublishXml",
			headers: {
				// eslint-disable-next-line @typescript-eslint/naming-convention
				Cookie: "good-cookie",
			},
		},
		(_, options: RequestInit) => {
			const requestData = JSON.parse(options.body as string);
			Object.assign(result, requestData);

			return {
				status: withStatus,
			};
		}
	);

	sandbox.get("begin:https://test.api/", 401);
	sandbox.patch("begin:https://test.api/", 401);
	sandbox.post("begin:https://test.api/", 401);

	sandbox.mock("*", 404);

	jest.spyOn(globalThis, "fetch").mockImplementation(sandbox as typeof fetch);
	return result;
}
