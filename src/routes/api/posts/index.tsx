// routes/hello.ts

import { createFileRoute } from "@tanstack/react-router";
import { prisma } from "#/db";
import { MESSAGE } from "#/lib/const";
import { logger, safeParseInt } from "#/lib/utils";

export const Route = createFileRoute("/api/posts/")({
	server: {
		handlers: ({ createHandlers }) =>
			createHandlers({
				GET: {
					//middleware: [authMiddleware],
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
									category: true,
									content: true,
									date: true,
									excerpt: true,
									image: true,
									title: true,
									userId: true,
									user: {
										select: {
											displayUsername: true,
										},
									},
								},
							});

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
			}),
	},
});
