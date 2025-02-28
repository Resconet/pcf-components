import { logger } from "@nx/devkit";
import { IContext, Proxy } from "http-mitm-proxy";
import { join } from "path";
import { ProxyExecutorSchema } from "./schema";

const DEFAULT_PROXY_PORT = 3333;
const DEFAULT_SERVER_PORT = 4200;

export default async function runExecutor(options: ProxyExecutorSchema) {
	const proxy = new Proxy();
	proxy.use(Proxy.gunzip);
	proxy.use(Proxy.wildcard);

	proxy.onError(function (_ctx, err) {
		logger.warn(err);
	});

	proxy.onRequest((ctx, callback) => {
		if (isRequestToOurApp(ctx)) {
			redirectToLocalhost(ctx);
		}

		callback();
	});

	const proxyPort = options.proxyPort ?? DEFAULT_PROXY_PORT;
	const serverPort = options.port ?? DEFAULT_SERVER_PORT;

	return await new Promise<{ success: boolean }>(resolve => {
		proxy.listen({ host: "127.0.0.1", port: proxyPort, sslCaDir: join(__dirname, "ca") }, error => {
			if (error) {
				logger.error(error);
				resolve({ success: false });
			} else {
				logger.info(`Proxy listening on port 127.0.0.1:${proxyPort} and forwarding to http://localhost:${serverPort}`);
			}
		});
	});

	function isRequestToOurApp(ctx: IContext): boolean {
		const requestOptions = ctx.proxyToServerRequestOptions;
		return requestOptions != null && requestOptions.host.endsWith(".dynamics.com") && requestOptions.path.includes(options.webResourcePath);
	}

	function redirectToLocalhost(ctx: IContext) {
		const requestOptions = ctx.proxyToServerRequestOptions;

		if (requestOptions == null) {
			throw new Error("Unexpected error: proxyToServerRequestOptions is null");
		}

		const fullPath = requestOptions.path;
		const webResourcePathIndex = fullPath.indexOf(options.webResourcePath);
		const appPathIndex = webResourcePathIndex + options.webResourcePath.length;
		const localPath = fullPath.substring(appPathIndex);

		ctx.isSSL = false;
		requestOptions.path = localPath;
		requestOptions.agent = proxy.httpAgent;
		requestOptions.host = "localhost";
		requestOptions.port = serverPort;
		requestOptions.headers["host"] = "localhost";
		requestOptions.headers["cache-control"] = "no-cache";
	}
}
