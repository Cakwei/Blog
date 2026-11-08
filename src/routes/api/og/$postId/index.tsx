import { createFileRoute } from "@tanstack/react-router";
import { prisma } from "#/db";
import { redis } from "#/lib/redis";

/**
 * Escapes special XML characters to prevent SVG syntax breakage
 */
function escapeXml(unsafe: string): string {
	return unsafe
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}

/**
 * Wraps text into multiple SVG <tspan> lines to prevent overflow
 */
function wrapSvgText(
	text: string,
	maxCharsPerLine: number,
	maxLines: number,
): string[] {
	const words = text.split(/\s+/);
	const lines: string[] = [];
	let currentLine = "";

	for (let i = 0; i < words.length; i++) {
		const word = words[i];
		const testLine = (currentLine + " " + word).trim();
		if (testLine.length <= maxCharsPerLine) {
			currentLine = testLine;
		} else {
			if (currentLine) lines.push(currentLine);
			currentLine = word;
			if (lines.length === maxLines - 1) {
				for (let j = i + 1; j < words.length; j++) {
					const nextWord = words[j];
					if ((currentLine + " " + nextWord).length <= maxCharsPerLine - 3) {
						currentLine += " " + nextWord;
					} else {
						currentLine += "...";
						break;
					}
				}
				break;
			}
		}
	}
	if (currentLine && lines.length < maxLines) {
		lines.push(currentLine);
	}
	return lines;
}

/**
 * Generates an ultra-clean 1200x630 SVG image card for OpenGraph & Twitter shares
 */
export function generateOgSvg({
	title,
	category = "Article",
	author = "Charlee Tan",
	date = "2026",
}: {
	title: string;
	category?: string;
	author?: string;
	date?: string;
}): string {
	const safeCategory = escapeXml(category.toUpperCase());
	const safeAuthor = escapeXml(author);
	const safeDate = escapeXml(date);

	// Wrap raw title first so XML entities do not inflate line measurement
	const titleLines = wrapSvgText(title, 35, 3);
	const tspanLines = titleLines
		.map(
			(line, idx) =>
				`<tspan x="80" dy="${idx === 0 ? 0 : 70}">${escapeXml(line)}</tspan>`,
		)
		.join("");

	return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" viewBox="0 0 1200 630" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0a0a0a"/>
      <stop offset="100%" stop-color="#121212"/>
    </linearGradient>
    <linearGradient id="accentGlow" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="#8b5cf6" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bgGrad)"/>
  <rect width="1200" height="630" fill="url(#accentGlow)"/>

  <!-- Outer Border -->
  <rect x="24" y="24" width="1152" height="582" rx="20" stroke="#262626" stroke-width="2"/>

  <!-- Top Metadata: Category Badge -->
  <g transform="translate(80, 80)">
    <rect width="${Math.max(120, safeCategory.length * 11 + 32)}" height="34" rx="17" fill="#1e1e1e" stroke="#333333"/>
    <text x="16" y="22" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="12" font-weight="700" letter-spacing="1.5" fill="#ededed">${safeCategory}</text>
  </g>

  <!-- Site Title Brand Watermark -->
  <text x="1120" y="102" text-anchor="end" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="16" font-weight="600" fill="#737373" letter-spacing="0.5">Charlee's Blog</text>

  <!-- Main Article Title -->
  <text x="80" y="250" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="54" font-weight="800" fill="#ffffff" letter-spacing="-1.5">
    ${tspanLines}
  </text>

  <!-- Divider Line -->
  <line x1="80" y1="480" x2="1120" y2="480" stroke="#262626" stroke-width="1.5"/>

  <!-- Bottom Footer: Author & Date -->
  <g transform="translate(80, 520)">
    <!-- Author Avatar Placeholder Icon -->
    <circle cx="20" cy="18" r="18" fill="#262626" stroke="#404040"/>
    <text x="20" y="24" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="15" font-weight="700" fill="#ededed">${safeAuthor[0] || "C"}</text>

    <!-- Author Name -->
    <text x="52" y="18" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="18" font-weight="600" fill="#ededed">${safeAuthor}</text>
    <text x="52" y="38" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="13" font-weight="400" fill="#8a8a8a">Published on ${safeDate}</text>
  </g>

  <g transform="translate(1120, 538)">
    <text text-anchor="end" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="14" font-weight="500" fill="#525252">Read article →</text>
  </g>
</svg>`;
}

export const Route = createFileRoute("/api/og/$postId/")({
	server: {
		handlers: ({ createHandlers }) =>
			createHandlers({
				GET: {
					handler: async ({ params }) => {
						const postId = parseInt(params.postId, 10);
						if (isNaN(postId) || postId <= 0) {
							return new Response("Invalid Post ID", { status: 400 });
						}

						// Cache-aside using Redis with 7-day TTL
						const svg = await redis.getOrSet(
							`og:svg:${postId}`,
							async () => {
								const post = await prisma.post.findUnique({
									where: { id: postId },
									include: {
										categories: true,
										user: {
											select: {
												name: true,
												displayUsername: true,
											},
										},
									},
								});

								if (!post || !post.published) {
									return generateOgSvg({
										title: "Article Not Found",
										category: "Blog",
									});
								}

								const primaryCategory =
									post.categories && post.categories.length > 0
										? post.categories[0].name
										: "Article";

								const authorName =
									post.user?.displayUsername || post.user?.name || "Charlee Tan";

								const formattedDate = new Date(post.date).toLocaleDateString(
									"en-US",
									{
										month: "short",
										day: "numeric",
										year: "numeric",
									},
								);

								return generateOgSvg({
									title: post.title,
									category: primaryCategory,
									author: authorName,
									date: formattedDate,
								});
							},
							604800, // 7 days in seconds
						);

						return new Response(svg, {
							headers: {
								"Content-Type": "image/svg+xml; charset=utf-8",
								"Cache-Control":
									"public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
							},
						});
					},
				},
			}),
	},
});
