/**
 * Reading Time Calculation & Table of Contents (TOC) Extraction for Tiptap Content
 */

export interface TocItem {
	id: string;
	text: string;
	level: 2 | 3;
}

export interface ReadingTimeResult {
	minutes: number;
	wordCount: number;
	text: string;
}

/**
 * Converts any text into a URL-friendly, lowercase anchor slug
 */
export function slugify(text: string): string {
	return text
		.toLowerCase()
		.trim()
		.replace(/[^\w\s-]/g, "") // Remove non-word chars except hyphens
		.replace(/[\s_-]+/g, "-") // Collapse whitespace and underscores to hyphens
		.replace(/^-+|-+$/g, ""); // Trim leading/trailing hyphens
}

/**
 * Recursively extracts plain text from a Tiptap JSONContent node
 */
export function extractPlainTextFromTiptap(node: any): string {
	if (!node) return "";
	if (typeof node === "string") return node;

	let text = "";
	if (node.text) {
		text += node.text;
	}

	if (node.content && Array.isArray(node.content)) {
		for (const child of node.content) {
			text += ` ${extractPlainTextFromTiptap(child)}`;
		}
	}

	return text.trim();
}

/**
 * Default adult non-fiction reading pace in words per minute (WPM).
 * Standard publication benchmarks:
 * - Medium / Substack: 200–225 WPM
 * - Technical documentation: 180–200 WPM
 * Developers can adjust this constant globally or pass a custom WPM to calculateReadingTime().
 */
export const DEFAULT_WORDS_PER_MINUTE = 200;

/**
 * Calculates reading time in minutes based on configurable words per minute pace
 */
export function calculateReadingTime(
	content: any,
	wordsPerMinute = DEFAULT_WORDS_PER_MINUTE,
): ReadingTimeResult {
	const plainText = extractPlainTextFromTiptap(content);
	if (!plainText) {
		return { minutes: 1, wordCount: 0, text: "1 min read" };
	}

	const wpm = wordsPerMinute > 0 ? wordsPerMinute : DEFAULT_WORDS_PER_MINUTE;
	const words = plainText.split(/\s+/).filter(Boolean);
	const wordCount = words.length;
	const minutes = Math.max(1, Math.ceil(wordCount / wpm));

	return {
		minutes,
		wordCount,
		text: `${minutes} min read`,
	};
}

/**
 * Extracts H2 and H3 heading hierarchy from Tiptap JSON AST for TOC rendering
 */
export function extractHeadingsFromTiptap(content: any): TocItem[] {
	if (!content) return [];

	const items: TocItem[] = [];
	const seenSlugs = new Map<string, number>();

	function walk(node: any) {
		if (
			node.type === "heading" &&
			(node.attrs?.level === 2 || node.attrs?.level === 3)
		) {
			const headingText = extractPlainTextFromTiptap(node);
			if (headingText) {
				let baseSlug = slugify(headingText);
				if (!baseSlug) baseSlug = `section-${items.length + 1}`;

				// Ensure unique slug if multiple identical headings exist
				const count = seenSlugs.get(baseSlug) || 0;
				seenSlugs.set(baseSlug, count + 1);
				const id = count > 0 ? `${baseSlug}-${count}` : baseSlug;

				items.push({
					id,
					text: headingText,
					level: node.attrs.level,
				});
			}
		}

		if (node.content && Array.isArray(node.content)) {
			for (const child of node.content) {
				walk(child);
			}
		}
	}

	walk(content);
	return items;
}

/**
 * Injects matching `id="..."` attributes into rendered HTML <h2> and <h3> tags
 * to enable instant smooth anchor jumping.
 */
export function injectHeadingIdsIntoHtml(
	html: string,
	headings: TocItem[],
): string {
	if (!html || headings.length === 0) return html;

	let headingIndex = 0;
	// Matches <h2 ...> or <h3 ...>
	return html.replace(/<(h[23])(\s*[^>]*)>(.*?)<\/\1>/gi, (match, tag, attrs, innerHtml) => {
		if (headingIndex >= headings.length) return match;

		const target = headings[headingIndex];
		headingIndex += 1;

		// Check if id is already present
		if (/id=["'][^"']+["']/i.test(attrs)) {
			return match;
		}

		return `<${tag} id="${target.id}"${attrs}>${innerHtml}</${tag}>`;
	});
}
