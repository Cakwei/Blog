import { describe, expect, it } from "vitest";
import { cn, parseBody, safeParseInt } from "#/lib/utils";

describe("safeParseInt", () => {
	it("parses valid positive integer strings", () => {
		expect(safeParseInt("1")).toBe(1);
		expect(safeParseInt("42")).toBe(42);
		expect(safeParseInt("9999")).toBe(9999);
	});

	it("trims surrounding whitespace from numeric strings", () => {
		expect(safeParseInt("  10  ")).toBe(10);
		expect(safeParseInt("\t25\n")).toBe(25);
	});

	it("rejects 0 to enforce strictly positive IDs or limits", () => {
		expect(safeParseInt("0")).toBe(0);
	});

	it("rejects negative numbers", () => {
		expect(safeParseInt("-5")).toBe(0);
	});

	it("rejects strings containing alphabetic or special characters", () => {
		expect(safeParseInt("12abc")).toBe(0);
		expect(safeParseInt("abc")).toBe(0);
		expect(safeParseInt("12.34")).toBe(0);
		expect(safeParseInt("1e5")).toBe(0);
		expect(safeParseInt("$100")).toBe(0);
	});

	it("returns 0 for null, undefined, or empty strings", () => {
		expect(safeParseInt("")).toBe(0);
		expect(safeParseInt("   ")).toBe(0);
		expect(safeParseInt(null)).toBe(0);
	});
});

describe("cn (classnames merge)", () => {
	it("merges multiple class names into a single string", () => {
		expect(cn("px-4", "py-2", "text-sm")).toBe("px-4 py-2 text-sm");
	});

	it("handles conditional falsy expressions", () => {
		const isHidden = false;
		const isPrimary = true;
		expect(cn("base-class", isHidden && "hidden", isPrimary && "text-white")).toBe(
			"base-class text-white",
		);
	});

	it("resolves Tailwind class conflicts in favor of latter classes", () => {
		expect(cn("bg-red-500", "bg-blue-500")).toBe("bg-blue-500");
		expect(cn("p-4", "p-8")).toBe("p-8");
	});

	it("handles arrays and nested objects cleanly", () => {
		expect(cn(["btn", "btn-large"], { "is-active": true, disabled: false })).toBe(
			"btn btn-large is-active",
		);
	});
});

describe("parseBody", () => {
	it("parses valid JSON from a Request instance", async () => {
		const payload = { title: "Test Post", count: 10 };
		const request = new Request("http://localhost:3000/api/test", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload),
		});

		const result = await parseBody(request);
		expect(result).toEqual(payload);
	});

	it("returns null on malformed JSON without throwing", async () => {
		const request = new Request("http://localhost:3000/api/test", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: "{ malformed json :::",
		});

		const result = await parseBody(request);
		expect(result).toBeNull();
	});

	it("returns null for empty request body", async () => {
		const request = new Request("http://localhost:3000/api/test", {
			method: "GET",
		});

		const result = await parseBody(request);
		expect(result).toBeNull();
	});
});
