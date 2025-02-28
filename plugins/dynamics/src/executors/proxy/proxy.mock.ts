import http from "http";
import { Proxy, type OnRequestParams } from "http-mitm-proxy";
import https from "https";

export class ProxyMock extends Proxy {
	override use = jest.fn();

	onRequestHandler: OnRequestParams = () => undefined;

	override onRequest(callback: OnRequestParams) {
		this.onRequestHandler = callback;
		return this;
	}

	override listen = jest.fn().mockImplementation((options, callback) => {
		setTimeout(callback());
	});

	override httpAgent: http.Agent = new http.Agent();
	override httpsAgent: https.Agent = new https.Agent();

	emulateListenError() {
		this.listen.mockImplementation((options, callback) => {
			setTimeout(callback(new Error("listen error")));
		});
	}
}
