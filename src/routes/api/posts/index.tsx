// routes/hello.ts

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { prisma } from "#/db";
import { MESSAGE } from "#/lib/const";
import { authMiddleware } from "#/lib/middleware";
import { logger, parseBody, safeParseInt } from "#/lib/utils";

const createPostSchema = z.object({
	title: z.string().min(1, "Title is required"),
	jsonContent: z.any(),
	tags: z.array(z.string()).optional(),
	fileName: z.string().min(1, "File name is required"),
	fileType: z.string().min(1, "File type is required"),
	base64Data: z.string().min(1, "Base64 image data is required"),
});

export const Route = createFileRoute("/api/posts/")({
	server: {
		handlers: ({ createHandlers }) =>
			createHandlers({
				GET: {
					//  middleware: [authMiddleware],
					handler: async ({ request }) => {
						try {
							const url = new URL(request.url);
							const search = url.searchParams.get("search") || "";
							const limit = safeParseInt(url.searchParams.get("limit")) || 10;
							const page = safeParseInt(url.searchParams.get("page")) || 1;
							const skip = (page - 1) * limit;

							const posts = await prisma.post.findMany({
								take: limit,
								skip: skip,
								where: {
									title: { contains: search },
								},
								select: {
									id: true,
									categories: true,
									content: true,
									date: true,
									isFeatured: true,
									excerpt: true,
									image: true,
									published: true,
									title: true,
									userId: true,
									user: {
										select: {
											displayUsername: true,
										},
									},
								},
							});

							logger("debug", "vile", posts);

							return Response.json({
								success: true,
								data: posts,
								message: MESSAGE.FETCH_SUCCESS,
							});
						} catch (error) {
							logger("debug", "api/posts/index", error);
							return Response.json({
								success: false,
								data: {},
								message: MESSAGE.SERVER_ERROR,
							});
						}
					},
				},
				POST: {
					middleware: [authMiddleware],
					handler: async ({ request, context }) => {
						try {
							const body = await parseBody(request);

							// Validate and parse body using Zod
							const result = createPostSchema.safeParse(body);

							if (!result.success) {
								const errorMessage = result.error.issues
									.map((issue) => `${issue.path.join(".")}: ${issue.message}`)
									.join(", ");

								return Response.json(
									{
										success: false,
										message: errorMessage || "Validation failed",
									},
									{ status: 400 },
								);
							}

							const {
								title,
								jsonContent,
								tags,
								fileName,
								fileType,
								base64Data,
							} = result.data;

							const session = context.session;

							// Upload Image to S3
							const { Upload } = await import("@aws-sdk/lib-storage");
							const { s3Client } = await import("#/lib/s3");

							const uuid = crypto.randomUUID();
							const cleanFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
							const s3Key = `${uuid}-${cleanFileName}`;

							const base64Content = base64Data.includes(",")
								? base64Data.split(",")[1]
								: base64Data;
							const buffer = Buffer.from(base64Content, "base64");

							const uploader = new Upload({
								client: s3Client,
								params: {
									Bucket: "blog",
									Key: s3Key,
									Body: buffer,
									ContentType: fileType,
								},
								queueSize: 4,
								partSize: 5 * 1024 * 1024,
							});

							await uploader.done();
							const imageUrl = `https://s3.cakwei.dev/blog/${s3Key}`;

							// Handle multiple categories mapping
							const categoryList =
								tags && tags.length > 0 ? tags : ["Engineering"];

							const categoryRecords = await Promise.all(
								categoryList.map(async (catName: string) => {
									const categorySlug = catName
										.toLowerCase()
										.replace(/[^a-z0-9]+/g, "-")
										.replace(/(^-|-$)/g, "");

									return prisma.category.upsert({
										where: { slug: categorySlug },
										update: {},
										create: {
											name: catName,
											slug: categorySlug,
										},
									});
								}),
							);

							// Save post to database with multiple category connections
							const slug = title
								.toLowerCase()
								.replace(/[^a-z0-9]+/g, "-")
								.replace(/(^-|-$)/g, "");

							await prisma.post.create({
								data: {
									title,
									slug: `${slug}-${Date.now()}`,
									excerpt: "A deep dive into article contents.",
									date: new Date(),
									image: imageUrl,
									content: jsonContent,
									published: true,
									isFeatured: false,
									views: 0,
									user: {
										connect: { id: session.user.id },
									},
									categories: {
										connect: categoryRecords.map((cat) => ({ id: cat.id })),
									},
								},
							});

							return Response.json({
								success: true,
								message: "Successfully published post",
							});
						} catch (error: any) {
							logger("error", "Post Creation API Error:", error);
							return Response.json(
								{
									success: false,
									message:
										error?.message || "An internal server error occurred",
								},
								{ status: 500 },
							);
						}
					},
				},
			}),
	},
});
