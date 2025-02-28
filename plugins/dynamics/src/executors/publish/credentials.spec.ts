import { logger } from "@nx/devkit";
import http, { IncomingMessage, RequestListener } from "http";
import { requestCredentials } from "./credentials";

describe("requestCredentials", () => {
	let serverCallback: RequestListener;
	let listenCallback: jest.Mock;
	beforeEach(() => {
		listenCallback = jest.fn();
		jest.spyOn(http, "createServer").mockImplementation(callback => {
			serverCallback = callback as RequestListener;
			return {
				listen: listenCallback,
				close: jest.fn(),
			} as unknown as http.Server<typeof IncomingMessage, typeof http.ServerResponse>;
		});

		jest.spyOn(logger, "log").mockImplementation();
		jest.spyOn(logger, "info").mockImplementation();
		jest.spyOn(logger, "warn").mockImplementation();
		jest.spyOn(logger, "error").mockImplementation(e => {
			throw e;
		});
	});

	it("will say that it is waiting for credentials", async () => {
		requestCredentials();
		await tick();
		expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("Waiting for credentials."));
	});

	it("create server and will be listening on port 54321", async () => {
		requestCredentials();
		await tick();
		expect(listenCallback).toHaveBeenCalledWith(54321);
	});

	it("will resolve with the credentials", async () => {
		const credentialsPromise = requestCredentials();
		serverCallback(
			{
				on: (event: string, callback: (chunk?: string) => void) => {
					if (event === "data") {
						callback('{"url":"https://example.com","cookie":"cookie"}');
					}
					if (event === "end") {
						callback();
					}
				},
			} as unknown as http.IncomingMessage,
			{ end: jest.fn() } as unknown as http.ServerResponse
		);
		const credentials = await credentialsPromise;
		expect(credentials).toEqual({ url: "https://example.com", cookie: "cookie" });
	});
});

async function tick(timeToWaitMs = 0): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, timeToWaitMs));
}
