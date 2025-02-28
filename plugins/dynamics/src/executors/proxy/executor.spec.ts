import { logger } from "@nx/devkit";
import http from "http";
import * as ProxyLib from "http-mitm-proxy";
import executor from "./executor";
import { ProxyMock } from "./proxy.mock";
import { ProxyExecutorSchema } from "./schema";

describe("Proxy Executor", () => {
	let proxyMock: ProxyMock;
	let options: ProxyExecutorSchema;

	beforeEach(() => {
		proxyMock = new ProxyMock();
		jest.spyOn(ProxyLib, "Proxy").mockReturnValue(proxyMock);
		options = {
			webResourcePath: "resco_MobileCRM/WebClient",
		};
		jest.spyOn(logger, "info").mockImplementation();
		jest.spyOn(logger, "warn").mockImplementation();
		jest.spyOn(logger, "error").mockImplementation(e => {
			throw e;
		});
	});

	it("will say on which port the proxy is listening and to which localhost port the requests are being proxied", async () => {
		options.proxyPort = 1111;
		options.port = 2222;
		executor(options);
		await tick();
		expect(logger.info).toHaveBeenCalledWith("Proxy listening on port 127.0.0.1:1111 and forwarding to http://localhost:2222");
	});

	it("if listen fails, logs the error and returns success: false", async () => {
		jest.mocked(logger.error).mockImplementation();
		proxyMock.emulateListenError();
		const { success } = await executor(options);
		expect(logger.info).not.toHaveBeenCalled();
		expect(logger.error).toHaveBeenCalledWith(new Error("listen error"));
		expect(success).toBe(false);
	});

	it("will create a Proxy and start listening on port 3333 by default", () => {
		executor(options);
		expect(proxyMock.listen).toHaveBeenCalledWith({ host: "127.0.0.1", port: 3333, sslCaDir: expect.any(String) }, expect.any(Function));
	});

	it("can listen on a custom configured port", () => {
		options.proxyPort = 1234;
		executor(options);
		expect(proxyMock.listen).toHaveBeenCalledWith({ host: "127.0.0.1", port: 1234, sslCaDir: expect.any(String) }, expect.any(Function));
	});

	it("uses Proxy.wildcard so that wildcard certificates are generated", () => {
		executor(options);
		expect(proxyMock.use).toHaveBeenCalledWith(ProxyLib.Proxy.wildcard);
	});

	it("logs proxy errors", () => {
		const error = new Error("proxy error");
		executor(options);
		proxyMock.onErrorHandlers.every(it => it(null, error));
		expect(logger.warn).toHaveBeenCalledWith(error);
	});

	it("modifies the request to dynamics app webresources to point to the local server at port 4200 by default", () => {
		const ctx = createContext("resco.crm4.dynamics.com", "/some_path/webresources/resco_MobileCRM/WebClient/images/123.png");
		const callback = jest.fn();

		executor(options);
		proxyMock.onRequestHandler(ctx, callback);

		expect(callback).toHaveBeenCalled();
		expect(ctx.isSSL).toBe(false);
		expect(ctx.proxyToServerRequestOptions?.host).toBe("localhost");
		expect(ctx.proxyToServerRequestOptions?.port).toBe(4200);
		expect(ctx.proxyToServerRequestOptions?.path).toBe("/images/123.png");
		expect(ctx.proxyToServerRequestOptions?.agent).toBe(proxyMock.httpAgent);
		expect(ctx.proxyToServerRequestOptions?.headers["host"]).toBe("localhost");
		expect(ctx.proxyToServerRequestOptions?.headers["cache-control"]).toBe("no-cache");
	});

	it("local server port can be configured", () => {
		options.port = 4444;
		const ctx = createContext("resco.crm4.dynamics.com", "/some_path/webresources/resco_MobileCRM/WebClient/images/123.png");
		const callback = jest.fn();

		executor(options);
		proxyMock.onRequestHandler(ctx, callback);

		expect(callback).toHaveBeenCalled();
		expect(ctx.isSSL).toBe(false);
		expect(ctx.proxyToServerRequestOptions?.host).toBe("localhost");
		expect(ctx.proxyToServerRequestOptions?.port).toBe(4444);
		expect(ctx.proxyToServerRequestOptions?.path).toBe("/images/123.png");
		expect(ctx.proxyToServerRequestOptions?.agent).toBe(proxyMock.httpAgent);
		expect(ctx.proxyToServerRequestOptions?.headers["host"]).toBe("localhost");
		expect(ctx.proxyToServerRequestOptions?.headers["cache-control"]).toBe("no-cache");
	});

	it("does not modify request to any host other than dynamics", () => {
		options.port = 4444;
		const ctx = createContext("resco.crm4.somethingelse.com", "/some_path/webresources/resco_MobileCRM/WebClient/images/123.png");
		const callback = jest.fn();

		executor(options);
		proxyMock.onRequestHandler(ctx, callback);

		expect(callback).toHaveBeenCalled();
		expect(ctx.isSSL).toBe(true);
		expect(ctx.proxyToServerRequestOptions?.host).toBe("resco.crm4.somethingelse.com");
		expect(ctx.proxyToServerRequestOptions?.port).toBe(443);
		expect(ctx.proxyToServerRequestOptions?.path).toBe("/some_path/webresources/resco_MobileCRM/WebClient/images/123.png");
		expect(ctx.proxyToServerRequestOptions?.agent).toBe(proxyMock.httpsAgent);
		expect(ctx.proxyToServerRequestOptions?.headers["host"]).toBe("resco.crm4.somethingelse.com");
		expect(ctx.proxyToServerRequestOptions?.headers["cache-control"]).toBeUndefined();
	});

	it("does not modify request to webresources of app other then configured via webResourcePath", () => {
		options.port = 4444;
		const ctx = createContext("resco.crm4.dynamics.com", "/some_path/webresources/resco_MobileCRM/Other/images/123.png");
		const callback = jest.fn();

		executor(options);
		proxyMock.onRequestHandler(ctx, callback);

		expect(callback).toHaveBeenCalled();
		expect(ctx.isSSL).toBe(true);
		expect(ctx.proxyToServerRequestOptions?.host).toBe("resco.crm4.dynamics.com");
		expect(ctx.proxyToServerRequestOptions?.port).toBe(443);
		expect(ctx.proxyToServerRequestOptions?.path).toBe("/some_path/webresources/resco_MobileCRM/Other/images/123.png");
		expect(ctx.proxyToServerRequestOptions?.agent).toBe(proxyMock.httpsAgent);
		expect(ctx.proxyToServerRequestOptions?.headers["host"]).toBe("resco.crm4.dynamics.com");
		expect(ctx.proxyToServerRequestOptions?.headers["cache-control"]).toBeUndefined();
	});

	function createContext(host: string, path: string) {
		const headers: { [key: string]: string } = { host };
		const ctx: ProxyLib.IContext = {
			isSSL: true,
			proxyToServerRequestOptions: {
				method: "GET",
				path,
				host,
				port: 443,
				headers,
				agent: proxyMock.httpsAgent as http.Agent,
			},
		} as ProxyLib.IContext;
		return ctx;
	}
});

async function tick(timeToWaitMs = 0): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, timeToWaitMs));
}
