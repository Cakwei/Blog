import { describe, expect, it } from "vitest";
import { POST_VIEW_DWELL_TIME_MS } from "#/lib/reading-time";

describe("Post View Dwell Time Constant", () => {
	it("exports a configurable positive dwell time threshold in milliseconds", () => {
		expect(typeof POST_VIEW_DWELL_TIME_MS).toBe("number");
		expect(POST_VIEW_DWELL_TIME_MS).toBeGreaterThan(0);
		// Default configured to 5,000ms (5 seconds)
		expect(POST_VIEW_DWELL_TIME_MS).toBe(5000);
	});
});
