import { describe, expect, it } from "vitest";
import { generateOgSvg } from "#/routes/api/og/$postId/index";

describe("Dynamic OG SVG Generator", () => {
	it("generates a valid 1200x630 SVG document", () => {
		const svg = generateOgSvg({
			title: "Building High Performance Distributed Systems",
			category: "Engineering",
			author: "Charlee Tan",
			date: "Nov 8, 2026",
		});

		expect(svg).toContain('<?xml version="1.0" encoding="UTF-8"?>');
		expect(svg).toContain('<svg width="1200" height="630" viewBox="0 0 1200 630"');
		expect(svg).toContain("</svg>");
		expect(svg).toContain("ENGINEERING");
		expect(svg).toContain("Charlee Tan");
		expect(svg).toContain("Published on Nov 8, 2026");
	});

	it("properly escapes XML special characters to prevent SVG breakage or injection", () => {
		const svg = generateOgSvg({
			title: "Microservices <vs> Monoliths & 'Best' \"Practices\"",
			category: "Dev & Ops",
			author: "Tom & Jerry",
		});

		// Characters should be XML entity encoded
		expect(svg).not.toContain("<vs>");
		expect(svg).toContain("&lt;vs&gt;");
		expect(svg).toContain("&amp;");
		expect(svg).toContain("&apos;Best&apos;");
		expect(svg).toContain("&quot;Practices&quot;");
	});

	it("applies sensible defaults when optional fields are omitted", () => {
		const svg = generateOgSvg({
			title: "Minimal Article",
		});

		expect(svg).toContain("Minimal Article");
		expect(svg).toContain("ARTICLE");
		expect(svg).toContain("Charlee Tan");
	});

	it("wraps long titles into SVG tspan rows without overflow", () => {
		const svg = generateOgSvg({
			title:
				"Architecting Resilient Real-Time Microservices with Redis, PostgreSQL, and Modern Full-Stack Distributed Cache Pipelines",
		});

		// Expect multiple tspan elements for wrapping
		const tspanCount = (svg.match(/<tspan /g) || []).length;
		expect(tspanCount).toBeGreaterThanOrEqual(2);
	});
});
