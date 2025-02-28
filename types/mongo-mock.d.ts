declare module "mongo-mock" {
	import type { MongoClient as IMongoClient } from "mongodb";

	export class MongoClient extends IMongoClient {
		static connect(uri: string, callback: (err: unknown, client: MongoClient) => void): void;
		toJSON(): unknown;
	}

	export default {
		max_delay: number,
	};
}
