import { describe, expect, it } from "vitest";
import {
	calculateReadingTime,
	DEFAULT_WORDS_PER_MINUTE,
	extractHeadingsFromTiptap,
	extractPlainTextFromTiptap,
	injectHeadingIdsIntoHtml,
	slugify,
} from "#/lib/reading-time";

describe("Reading Time & Table of Contents (TOC)", () => {
	describe("slugify", () => {
		it("converts mixed casing and spaces into a clean kebab-case slug", () => {
			expect(slugify("System Architecture & Design")).toBe(
				"system-architecture-design",
			);
			expect(slugify("  Hello   World  ")).toBe("hello-world");
			expect(slugify("React 19: What's New?")).toBe("react-19-whats-new");
		});
	});

	describe("calculateReadingTime", () => {
		it("exports configurable DEFAULT_WORDS_PER_MINUTE", () => {
			expect(DEFAULT_WORDS_PER_MINUTE).toBe(200);
		});

		it("returns 1 min read for empty or short content", () => {
			expect(calculateReadingTime(null)).toEqual({
				minutes: 1,
				wordCount: 0,
				text: "1 min read",
			});
			expect(calculateReadingTime("Hello world")).toEqual({
				minutes: 1,
				wordCount: 2,
				text: "1 min read",
			});
		});

		it("calculates accurate reading time with default 200 WPM", () => {
			const words400 = Array(400).fill("word").join(" ");
			const result = calculateReadingTime(words400);
			expect(result.wordCount).toBe(400);
			expect(result.minutes).toBe(2);
			expect(result.text).toBe("2 min read");
		});

		it("allows developer to override reading pace WPM", () => {
			const words300 = Array(300).fill("technical").join(" ");

			// At 100 WPM, 300 words is 3 minutes
			const slowResult = calculateReadingTime(words300, 100);
			expect(slowResult.minutes).toBe(3);
			expect(slowResult.text).toBe("3 min read");

			// At 300 WPM, 300 words is 1 minute
			const fastResult = calculateReadingTime(words300, 300);
			expect(fastResult.minutes).toBe(1);
			expect(fastResult.text).toBe("1 min read");
		});

		it("parses Tiptap JSONContent structure properly", () => {
			const tiptapContent = {
				type: "doc",
				content: [
					{
						type: "paragraph",
						content: [{ type: "text", text: "Introduction to distributed systems." }],
					},
					{
						type: "paragraph",
						content: [{ type: "text", text: "Cache layers eliminate write contention." }],
					},
				],
			};

			const text = extractPlainTextFromTiptap(tiptapContent);
			expect(text).toBe(
				"Introduction to distributed systems. Cache layers eliminate write contention.",
			);
			const result = calculateReadingTime(tiptapContent);
			expect(result.wordCount).toBe(9);
			expect(result.minutes).toBe(1);
		});
	});

	describe("extractHeadingsFromTiptap & injectHeadingIdsIntoHtml", () => {
		const tiptapContent = {
			type: "doc",
			content: [
				{
					type: "heading",
					attrs: { level: 2 },
					content: [{ type: "text", text: "Architecture Overview" }],
				},
				{
					type: "paragraph",
					content: [{ type: "text", text: "Some explanation here." }],
				},
				{
					type: "heading",
					attrs: { level: 3 },
					content: [{ type: "text", text: "Redis Layer" }],
				},
				{
					type: "heading",
					attrs: { level: 2 },
					content: [{ type: "text", text: "Architecture Overview" }], // Duplicate heading to test unique slugging
				},
			],
		};

		it("extracts H2 and H3 headings with hierarchical levels and unique slugs", () => {
			const headings = extractHeadingsFromTiptap(tiptapContent);
			expect(headings).toHaveLength(3);

			expect(headings[0]).toEqual({
				id: "architecture-overview",
				text: "Architecture Overview",
				level: 2,
			});

			expect(headings[1]).toEqual({
				id: "redis-layer",
				text: "Redis Layer",
				level: 3,
			});

			expect(headings[2]).toEqual({
				id: "architecture-overview-1",
				text: "Architecture Overview",
				level: 2,
			});
		});

		it("injects anchor IDs into matching HTML tags", () => {
			const headings = extractHeadingsFromTiptap(tiptapContent);
			const rawHtml =
				'<h2>Architecture Overview</h2><p>Content</p><h3>Redis Layer</h3><h2>Architecture Overview</h2>';
			const injected = injectHeadingIdsIntoHtml(rawHtml, headings);

			expect(injected).toContain('<h2 id="architecture-overview">Architecture Overview</h2>');
			expect(injected).toContain('<h3 id="redis-layer">Redis Layer</h3>');
			expect(injected).toContain(
				'<h2 id="architecture-overview-1">Architecture Overview</h2>',
			);
		});
	});
});
