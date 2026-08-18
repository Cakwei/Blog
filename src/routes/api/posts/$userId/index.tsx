import { createFileRoute } from "@tanstack/react-router";
import { prisma } from "#/db";
import type { PostWhereInput } from "#/generated/prisma/models";
import { MESSAGE } from "#/lib/const";
import { authMiddleware } from "#/lib/middleware";
import { safeParseInt } from "#/lib/utils";

export const Route = createFileRoute("/api/posts/$userId/")({
	server: {
		handlers: ({ createHandlers }) =>
			createHandlers({
				GET: {
					middleware: [authMiddleware],
					handler: async ({ request, context, params }) => {
						const url = new URL(request.url);
						const session = context.session;
						const userId = params.userId;
						const page = safeParseInt(url.searchParams.get("page")) || 1;
						const search = url.searchParams.get("search") || "";
						const limit = safeParseInt(url.searchParams.get("limit")) || 10;
						const skip = (page - 1) * limit;

						const whereClause: PostWhereInput = {
							userId: session.user.id,
							title: {
								contains: search,
							},
						};

						console.log({
							boolean: userId !== session.user.id,
							userId,
							userId2: session.user.id,
						});

						if (userId !== session.user.id)
							return Response.json({
								success: false,
								data: {},
								message:
									"Logged in user ID and requested user ID is different, please login using the same account.",
							});

						const [posts, totalPosts] = await Promise.all([
							prisma.post.findMany({
								take: limit,
								skip: skip,
								where: whereClause,
								select: {
									id: true,
									categories: true,
									content: true,
									excerpt: true,
									date: true,
									image: true,
									published: true,
									slug: true,
									title: true,
									views: true,
								},
							}),
							prisma.post.count({ where: whereClause }),
						]);

						const totalPages = Math.ceil(totalPosts / limit);

						return Response.json({
							success: true,
							data: posts,
							totalPages,
							totalCount: totalPosts,
							currentPage: page,
							message: MESSAGE.FETCH_SUCCESS,
						});
					},
				},
			}),
	},
});
