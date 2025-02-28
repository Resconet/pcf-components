import { readFile } from "fs/promises";
import { extname, resolve } from "path";

const WEB_RESOURCE_TYPE: Record<string, number> = {
	html: 1,
	css: 2,
	js: 3,
	xml: 4,
	png: 5,
	jpg: 6,
	gif: 7,
	xap: 8,
	xsl: 9,
	ico: 10,
	svg: 11,
	resx: 12,
};

export type WebResource = {
	name: string;
	webresourceid: string;
};

export async function listWebResources(baseUrl: string, webResourcePath: string, cookie: string): Promise<WebResource[]> {
	const resources = [];
	let url = new URL(`api/data/v9.0/webresourceset?$select=name,webresourceid`, baseUrl).href + `&$filter=startswith(name,'${webResourcePath}/')`;
	let hasMore = true;

	while (hasMore) {
		const response = await fetch(url, {
			method: "GET",
			headers: { "Content-Type": "application/json", prefer: "odata.maxpagesize=1000", cookie: cookie },
		});

		checkResponse(response, "get list of web resources");

		const json = await response.json();
		if (json) {
			resources.push(...json.value);
		}

		if (json["@odata.nextLink"]) {
			url = json["@odata.nextLink"];
		} else {
			hasMore = false;
		}
	}

	return resources;
}

export async function createWebResource(
	baseUrl: string,
	webResourcePath: string,
	distFolderPath: string,
	relativeFilePath: string,
	cookie: string
): Promise<string> {
	const base64 = await readDistFile(distFolderPath, relativeFilePath);
	const webresourcetype = WEB_RESOURCE_TYPE[extname(relativeFilePath).substring(1)];

	if (!webresourcetype) {
		throw new Error(`Unsupported file type: ${relativeFilePath}`);
	}

	const body = JSON.stringify({
		name: `${webResourcePath}/${relativeFilePath}`,
		content: base64,
		webresourcetype,
	});

	const response = await fetch(new URL(`api/data/v9.0/webresourceset`, baseUrl), {
		method: "POST",
		headers: { "Content-Type": "application/json", cookie: cookie, accept: "application/json", prefer: "return=representation" },
		body,
	});

	checkResponse(response, "create web resource");

	const { webresourceid } = await response.json();

	return webresourceid;
}

export async function updateWebResource(
	baseUrl: string,
	webResourceId: string,
	distFolderPath: string,
	relativeFilePath: string,
	cookie: string
): Promise<void> {
	const base64 = await readDistFile(distFolderPath, relativeFilePath);

	const body = JSON.stringify({
		content: base64,
	});

	const response = await fetch(new URL(`api/data/v9.0/webresourceset(${webResourceId})`, baseUrl), {
		method: "PATCH",
		headers: { "Content-Type": "application/json", cookie: cookie },
		body,
	});

	checkResponse(response, "update web resource");
}

export async function publishWebResources(baseUrl: string, cookie: string, ids: string[]): Promise<void> {
	const response = await fetch(new URL(`api/data/v9.0/PublishXml`, baseUrl), {
		// eslint-disable-next-line @typescript-eslint/naming-convention
		body: JSON.stringify({ ParameterXml: createParameterXml(ids) }),
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			cookie: cookie,
		},
	});

	checkResponse(response, "publish web resources");
}

export function createParameterXml(ids: string[]): string {
	const webResourceTags = ids.map(id => `<webresource>{${id}}</webresource>`);
	return `<importexportxml><webresources>${webResourceTags.join("")}</webresources></importexportxml>`;
}

async function readDistFile(distFolderPath: string, relativeFilePath: string): Promise<string> {
	const filePath = resolve(distFolderPath, relativeFilePath);
	const contents = await readFile(filePath);
	return contents.toString("base64");
}

function checkResponse(result: Response, what: string): void {
	if (result.status === 401) {
		throw new Error("Unauthorized");
	}

	if (!result.ok) {
		throw new Error(`Failed to ${what}: ${result.status} ${result.statusText}`);
	}
}
