import DOMPurify from "dompurify";
import { describe, expect, it } from "vitest";

const MAX_SEARCH_LENGTH = 50;

function validateAndSanitizeSearchQuery(input: unknown): {
	valid: boolean;
	sanitized: string;
	error?: string;
} {
	if (typeof input !== "string") {
		return { valid: false, sanitized: "", error: "Invalid search input format" };
	}

	const cleanQuery = input.trim();
	if (!cleanQuery) {
		return { valid: true, sanitized: "" };
	}

	if (cleanQuery.length > MAX_SEARCH_LENGTH) {
		return {
			valid: false,
			sanitized: "",
			error: `Search must be ${MAX_SEARCH_LENGTH} characters or less.`,
		};
	}

	const sanitized = DOMPurify.sanitize(cleanQuery);
	return { valid: true, sanitized };
}

describe("Search Bar Sanitization & Validation", () => {
	it("accepts valid search queries within length limits", () => {
		const result = validateAndSanitizeSearchQuery("TypeScript Architecture");
		expect(result.valid).toBe(true);
		expect(result.sanitized).toBe("TypeScript Architecture");
		expect(result.error).toBeUndefined();
	});

	it("trims whitespace from queries", () => {
		const result = validateAndSanitizeSearchQuery("   React 19 Hooks   ");
		expect(result.valid).toBe(true);
		expect(result.sanitized).toBe("React 19 Hooks");
	});

	it("rejects non-string input formats", () => {
		expect(validateAndSanitizeSearchQuery(12345).valid).toBe(false);
		expect(validateAndSanitizeSearchQuery(null).valid).toBe(false);
		expect(validateAndSanitizeSearchQuery({ query: "test" }).valid).toBe(false);
	});

	it("rejects queries exceeding MAX_SEARCH_LENGTH (50 chars)", () => {
		const longQuery = "a".repeat(51);
		const result = validateAndSanitizeSearchQuery(longQuery);
		expect(result.valid).toBe(false);
		expect(result.error).toBe("Search must be 50 characters or less.");
	});

	it("sanitizes dangerous XSS script tags and event handlers", () => {
		const xssAttempt = '<script>alert("XSS")</script>Hello World';
		const result = validateAndSanitizeSearchQuery(xssAttempt);
		expect(result.valid).toBe(true);
		expect(result.sanitized).not.toContain("<script>");
		expect(result.sanitized).not.toContain("</script>");
		expect(result.sanitized).toContain("Hello World");
	});

	it("sanitizes HTML injection vectors in search queries", () => {
		const injection = '<img src=x onerror="alert(1)">Security';
		const result = validateAndSanitizeSearchQuery(injection);
		expect(result.valid).toBe(true);
		expect(result.sanitized).not.toContain("onerror");
	});
});
