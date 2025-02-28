// From https://github.com/facebook/jest/issues/9264#issuecomment-1053662344
// Use this if you need to set specific timezone in your spec.
// Example use (this needs to be at the top of the spec file, the path is relative to the lib root):
/**
 * @jest-environment ../../jest.environment.timezone.ts
 * @jest-environment-options {"timezone": "UTC+9"}
 */

import type { EnvironmentContext, JestEnvironmentConfig } from "@jest/environment";
import { TestEnvironment } from "jest-environment-jsdom";

export default class TimeZoneEnvironment extends TestEnvironment {
	constructor(config: JestEnvironmentConfig, context: EnvironmentContext) {
		super(config, context);

		const timeZoneFromOptions = config.projectConfig.testEnvironmentOptions["timezone"] as string;

		if (timeZoneFromOptions) {
			process.env.TZ = timeZoneFromOptions;
		}
	}
}
