import { logger } from "@nx/devkit";
import { createServer } from "http";

export type Credentials = {
	url: string;
	cookie: string;
};

export async function requestCredentials() {
	return new Promise<Credentials>((resolve, reject) => {
		const server = createServer((req, res) => {
			let body = "";

			req.on("data", (chunk: { toString: () => string }) => {
				body += chunk.toString();
			});

			req.on("end", () => {
				try {
					const credentials: Credentials = JSON.parse(body);
					logger.info("Credentials received.");
					resolve(credentials);
				} catch (e) {
					const error = e as Error;
					error.message = `Invalid credentials: ${error.message}`;
					reject(e);
				} finally {
					res.end();
					server.close();
				}
			});
		});

		server.listen(54321);
		logger.log(" ");
		logger.log(
			"\n\x1b[94m🌶️  Waiting for credentials. Please open your browser, sign in to Dynamics, and click on the 'Login' button in the 🌶️  extension.\x1b[0m"
		);
	});
}
