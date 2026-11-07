import { describe, expect, it } from "vitest";
import { z } from "zod";

const ALLOWED_MIME_TYPES = [
	"image/jpeg",
	"image/png",
	"image/webp",
	"image/gif",
] as const;

const createPostSchema = z.object({
	title: z.string().min(1, "Title is required").max(200, "Title too long"),
	excerpt: z.string().max(500, "Excerpt too long").optional(),
	jsonContent: z.any(),
	tags: z.array(z.string().trim().min(1)).optional(),
	fileName: z.string().min(1, "File name is required").max(255),
	fileType: z.string().refine(
		(type) => ALLOWED_MIME_TYPES.includes(type as any),
		"Only JPEG, PNG, WebP, or GIF image files are allowed",
	),
	base64Data: z
		.string()
		.min(1, "Base64 image data is required")
		.max(8 * 1024 * 1024, "Image payload exceeds 8MB base64 limit"),
});

describe("API Post Creation Validation Schema", () => {
	const validPayload = {
		title: "Valid Post Title",
		excerpt: "A brief excerpt describing the article.",
		jsonContent: { type: "doc", content: [{ type: "paragraph", text: "Hello" }] },
		tags: ["TypeScript", "Architecture"],
		fileName: "cover-image.png",
		fileType: "image/png",
		base64Data: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
	};

	it("accepts a fully compliant payload", () => {
		const parsed = createPostSchema.safeParse(validPayload);
		expect(parsed.success).toBe(true);
	});

	it("rejects an empty title", () => {
		const invalid = { ...validPayload, title: "" };
		const parsed = createPostSchema.safeParse(invalid);
		expect(parsed.success).toBe(false);
		if (!parsed.success) {
			expect(parsed.error.issues[0].message).toBe("Title is required");
		}
	});

	it("rejects a title exceeding 200 characters", () => {
		const invalid = { ...validPayload, title: "A".repeat(201) };
		const parsed = createPostSchema.safeParse(invalid);
		expect(parsed.success).toBe(false);
		if (!parsed.success) {
			expect(parsed.error.issues[0].message).toBe("Title too long");
		}
	});

	it("rejects unauthorized MIME types like SVG or PDF", () => {
		const svgPayload = { ...validPayload, fileType: "image/svg+xml" };
		const pdfPayload = { ...validPayload, fileType: "application/pdf" };
		const exePayload = { ...validPayload, fileType: "application/x-msdownload" };

		expect(createPostSchema.safeParse(svgPayload).success).toBe(false);
		expect(createPostSchema.safeParse(pdfPayload).success).toBe(false);
		expect(createPostSchema.safeParse(exePayload).success).toBe(false);
	});

	it("accepts all allowed image MIME types", () => {
		for (const mime of ALLOWED_MIME_TYPES) {
			const payload = { ...validPayload, fileType: mime };
			expect(createPostSchema.safeParse(payload).success).toBe(true);
		}
	});

	it("rejects base64 payloads exceeding 8MB size limit", () => {
		const oversizedBase64 = "A".repeat(8 * 1024 * 1024 + 1);
		const oversizedPayload = { ...validPayload, base64Data: oversizedBase64 };
		const parsed = createPostSchema.safeParse(oversizedPayload);
		expect(parsed.success).toBe(false);
		if (!parsed.success) {
			expect(parsed.error.issues[0].message).toBe("Image payload exceeds 8MB base64 limit");
		}
	});
});
