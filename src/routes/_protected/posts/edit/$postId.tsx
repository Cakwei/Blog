import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
	EditorProvider,
	useEditorSavingState,
} from "#/components/tiptap-templates/simple/editor-context";
import { SimpleEditor } from "#/components/tiptap-templates/simple/simple-editor";
import { Button } from "#/components/ui/button";
import {
	Combobox,
	ComboboxChip,
	ComboboxChips,
	ComboboxChipsInput,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxItem,
	ComboboxList,
	ComboboxValue,
	useComboboxAnchor,
} from "#/components/ui/combobox";
import {
	DraftAutosaveStatus,
	DraftRecoveryBanner,
} from "#/components/ui/draftRecovery";
import ImageUploader from "#/components/ui/fileUpload";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { prisma } from "#/db";
import { CATEGORIES } from "#/lib/const";
import {
	clearLocalDraft,
	deleteRedisDraftServerFn,
	getLocalDraft,
	getRedisDraftServerFn,
	type PostDraft,
	saveLocalDraft,
	saveRedisDraftServerFn,
} from "#/lib/draft-autosave";
import type { IResponse } from "#/lib/types";
import { getSessionFn, logger } from "#/lib/utils";

export {
	EditorProvider,
	EditorSavingContext,
	useEditorSavingState,
} from "#/components/tiptap-templates/simple/editor-context";

const getPostForEdit = createServerFn({ method: "GET" })
	.validator((postId: string) => {
		if (!postId || typeof postId !== "string")
			throw new Error("Invalid post ID");
		return postId;
	})
	.handler(async ({ data: postId }) => {
		const session = await getSessionFn();
		if (!session?.user?.id) throw new Error("Unauthorized session");

		const parsedId = parseInt(postId, 10);
		if (isNaN(parsedId) || parsedId <= 0)
			throw new Error("Invalid post ID format");

		const post = await prisma.post.findUnique({
			where: { id: parsedId },
			include: {
				categories: true, // Fixed: use relation plural name matching schema
			},
		});

		if (!post) throw new Error("Post not found");

		if (post.userId !== session.user.id) {
			throw new Error(
				"Forbidden: You do not have permission to edit this post",
			);
		}

		return post;
	});

const editPostQueryOptions = (postId: string) =>
	queryOptions({
		queryKey: ["editPost", postId],
		queryFn: () => getPostForEdit({ data: postId }),
		staleTime: 15000,
		gcTime: 15000,
		refetchInterval: 15000,
	});

export const Route = createFileRoute("/_protected/posts/edit/$postId")({
	loader: async ({ context, params }) => {
		await context.queryClient.ensureQueryData(
			editPostQueryOptions(params.postId),
		);
	},
	component: EditPostRoutePage,
});

const uploadImgToS3ServerFn = createServerFn({ method: "POST" })
	.validator(
		(data: { fileName: string; fileType: string; base64Data: string }) => {
			if (!data.fileName || !data.fileType || !data.base64Data) {
				throw new Error("Missing image upload payload data");
			}
			if (!data.fileType.startsWith("image/")) {
				throw new Error("Invalid file type. Only images are permitted.");
			}
			return data;
		},
	)
	.handler(async ({ data }) => {
		try {
			const session = await getSessionFn();
			if (!session?.user?.id) {
				return {
					success: false,
					url: "",
					message: "Unauthorized upload session",
				};
			}

			const { Upload } = await import("@aws-sdk/lib-storage");
			const { s3Client } = await import("#/lib/s3");

			const uuid = crypto.randomUUID();
			const cleanFileName = data.fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
			const s3Key = `${uuid}-${cleanFileName}`;

			const base64Content = data.base64Data.includes(",")
				? data.base64Data.split(",")[1]
				: data.base64Data;

			if (!base64Content) {
				throw new Error("Corrupted base64 payload data");
			}

			const buffer = Buffer.from(base64Content, "base64");

			if (buffer.length > 5 * 1024 * 1024) {
				throw new Error("File payload exceeds strict 5MB server limit.");
			}

			const uploader = new Upload({
				client: s3Client,
				params: {
					Bucket: "blog",
					Key: s3Key,
					Body: buffer,
					ContentType: data.fileType,
				},
				queueSize: 4,
				partSize: 5 * 1024 * 1024,
			});

			await uploader.done();
			return {
				success: true,
				url: `https://s3.cakwei.dev/blog/${s3Key}`,
				message: "Successfully uploaded image",
			};
		} catch (error: any) {
			logger("error", "S3 Server Upload Error:", error);
			return {
				success: false,
				url: "",
				message: error?.message || "Failed to upload image to S3",
			};
		}
	});

const updatePostInDB = createServerFn({ method: "POST" })
	.validator(
		(data: {
			postId: number;
			title: string;
			excerpt?: string;
			jsonContent: any;
			blogImg: string;
			tags: Array<string>;
		}) => {
			if (!data.postId || !data.jsonContent || !data.blogImg || !data.title) {
				throw new Error("Required fields are missing for database update");
			}
			return data;
		},
	)
	.handler(async ({ data }) => {
		try {
			const session = await getSessionFn();
			if (!session?.user?.id) {
				return { success: false, message: "Unauthorized session", data: {} };
			}

			const existingPost = await prisma.post.findUnique({
				where: { id: data.postId },
			});

			if (!existingPost || existingPost.userId !== session.user.id) {
				return {
					success: false,
					message: "Unauthorized or resource not found",
					data: {},
				};
			}

			// Process tag upserts only if tags array has elements
			const categoryRecords =
				data.tags && data.tags.length > 0
					? await Promise.all(
							data.tags.map(async (catName: string) => {
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
						)
					: [];

			await prisma.post.update({
				where: { id: data.postId },
				data: {
					title: data.title.trim(),
					excerpt: data.excerpt ? data.excerpt.trim() : "",
					image: data.blogImg,
					content: data.jsonContent,
					categories: {
						set: categoryRecords.map((cat) => ({ id: cat.id })), // Clears categories if tags is empty array
					},
				},
			});

			return {
				success: true,
				message: "Successfully updated blog in DB",
				data: {},
			};
		} catch (error) {
			logger("error", "Database update error:", error);
			return {
				success: false,
				message: "An error occurred while updating the database",
				data: {},
			};
		}
	});

function EditPostRoutePage() {
	const { postId } = Route.useParams();
	const { data: post } = useSuspenseQuery(editPostQueryOptions(postId));

	return (
		<EditorProvider initialContent={post.content}>
			<div className="w-full max-w-4xl mx-auto">
				<EditPostForm postId={postId} />
			</div>
		</EditorProvider>
	);
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

function validateFile(file: File): void {
	if (!file.type.startsWith("image/")) {
		throw new Error("Only image files are allowed for the hero background.");
	}
	if (file.size > MAX_FILE_SIZE) {
		throw new Error("File size exceeds the maximum allowed limit of 5MB.");
	}
}

async function fileToBase64(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.readAsDataURL(file);
		reader.onload = () => resolve(reader.result as string);
		reader.onerror = (error) => reject(error);
	});
}

function EditPostForm({ postId }: { postId: string }) {
	const navigate = useNavigate();
	const anchor = useComboboxAnchor();
	const { data: post } = useSuspenseQuery(editPostQueryOptions(postId));
	const { queryClient } = Route.useRouteContext();
	const [title, setTitle] = useState(post.title || "");
	const [tags, setTags] = useState<Array<string>>(
		post.categories ? post.categories.map((c) => c.name) : [],
	);
	const [blogHeroImg, setBlogHeroImg] = useState<File | null>(null);
	const [existingImgUrl] = useState<string>(post.image || "");
	const [editorData, setEditorData] = useState<any>(null);
	const { isSaving, editor } = useEditorSavingState();

	// Draft Autosave & Recovery State
	const [detectedDraft, setDetectedDraft] = useState<PostDraft | null>(null);
	const [autosaveStatus, setAutosaveStatus] = useState<
		"idle" | "saving" | "saved" | "unsaved"
	>("idle");
	const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

	const localDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const redisDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// Detect unsaved draft on mount
	useEffect(() => {
		const local = getLocalDraft(postId);
		if (
			local &&
			(local.title?.trim() !== (post.title || "") ||
				JSON.stringify(local.tags) !==
					JSON.stringify(
						post.categories ? post.categories.map((c) => c.name) : [],
					) ||
				(local.content &&
					JSON.stringify(local.content) !== JSON.stringify(post.content)))
		) {
			setDetectedDraft(local);
			return;
		}

		void getRedisDraftServerFn({ data: postId }).then((remote) => {
			if (
				remote &&
				(remote.title?.trim() !== (post.title || "") ||
					JSON.stringify(remote.tags) !==
						JSON.stringify(
							post.categories ? post.categories.map((c) => c.name) : [],
						) ||
					(remote.content &&
						JSON.stringify(remote.content) !== JSON.stringify(post.content)))
			) {
				setDetectedDraft(remote);
			}
		});
	}, [postId, post.title, post.categories, post.content]);

	const handleRestoreDraft = () => {
		if (!detectedDraft) return;

		if (detectedDraft.title) setTitle(detectedDraft.title);
		if (detectedDraft.tags) setTags(detectedDraft.tags);
		if (detectedDraft.content) {
			setEditorData(detectedDraft.content);
			if (editor) {
				editor.commands.setContent(detectedDraft.content);
			}
		}
		setLastSavedAt(detectedDraft.updatedAt);
		setAutosaveStatus("saved");
		setDetectedDraft(null);
		toast.success("Draft restored from previous session!");
	};

	const handleDiscardDraft = () => {
		clearLocalDraft(postId);
		void deleteRedisDraftServerFn({ data: postId });
		setDetectedDraft(null);
		toast.info("Draft discarded.");
	};

	// Debounced autosave
	useEffect(() => {
		const currentContent = editorData || (editor && !editor.isEmpty ? editor.getJSON() : null);
		if (!currentContent && !title) return;

		setAutosaveStatus("unsaved");

		if (localDebounceRef.current) clearTimeout(localDebounceRef.current);
		localDebounceRef.current = setTimeout(() => {
			setAutosaveStatus("saving");
			const saved = saveLocalDraft(postId, {
				title,
				tags,
				content: currentContent,
			});
			setLastSavedAt(saved.updatedAt);
			setAutosaveStatus("saved");
		}, 1200);

		if (redisDebounceRef.current) clearTimeout(redisDebounceRef.current);
		redisDebounceRef.current = setTimeout(() => {
			void saveRedisDraftServerFn({
				data: {
					postId,
					title,
					tags,
					content: currentContent,
				},
			});
		}, 20000);

		return () => {
			if (localDebounceRef.current) clearTimeout(localDebounceRef.current);
			if (redisDebounceRef.current) clearTimeout(redisDebounceRef.current);
		};
	}, [title, tags, editorData, postId, editor]);

	return (
		<div className="space-y-8">
			<Link
				to="/posts"
				className="inline-flex items-center gap-2 text-xs font-semibold text-(--text-secondary) hover:text-(--link) transition-colors group"
			>
				<span className="text-(--text-secondary) hover:text-(--link)">
					← Back to your posts
				</span>
			</Link>

			{/* Draft Recovery Banner */}
			<DraftRecoveryBanner
				draft={detectedDraft}
				onRestore={handleRestoreDraft}
				onDiscard={handleDiscardDraft}
			/>

			<div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b border-(--border) pb-6">
				<div className="space-y-1.5">
					<div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-(--bg-secondary) border border-(--border) text-(--text-secondary) text-[11px] font-medium uppercase tracking-wider">
						Editor Studio
					</div>
					<h1
						data-testid="editPostTxt"
						className="text-2xl sm:text-3xl font-bold tracking-tight text-(--text)"
					>
						Edit Post
					</h1>
					<p className="text-(--text-secondary) text-xs sm:text-sm">
						Update your article content, configuration tags, and media assets.
					</p>
				</div>
				<div className="flex items-center gap-4">
					<DraftAutosaveStatus
						status={autosaveStatus}
						lastSavedAt={lastSavedAt}
					/>
					<Button
						disabled={isSaving}
						className="h-9 px-5 bg-(--text) hover:opacity-90 text-(--bg) font-medium text-xs rounded-lg transition-all cursor-pointer"
						onClick={() => {
						toast.promise(
							async () => {
								let blogHeroImgUrl = existingImgUrl;

								if (blogHeroImg) {
									validateFile(blogHeroImg);
									const base64Data = await fileToBase64(blogHeroImg);

									const uploadResult = await uploadImgToS3ServerFn({
										data: {
											fileName: blogHeroImg.name,
											fileType: blogHeroImg.type,
											base64Data,
										},
									});

									if (!uploadResult.success || !uploadResult.url) {
										throw new Error(
											uploadResult.message || "Image upload failed.",
										);
									}
									blogHeroImgUrl = uploadResult.url;
								}

								if (!blogHeroImgUrl) {
									throw new Error("Hero cover image is required.");
								}

								const rawContent = editorData || editor?.getJSON();
								if (!rawContent || (editor && editor.isEmpty)) {
									throw new Error("Blog content cannot be empty.");
								}

								const result: IResponse = await updatePostInDB({
									data: {
										postId: parseInt(postId, 10),
										title,
										jsonContent: rawContent,
										blogImg: blogHeroImgUrl,
										tags,
									},
								});

								if (!result.success) {
									throw new Error(result.message || "Failed to update post.");
								}

								// Clean up draft upon successful update
								clearLocalDraft(postId);
								void deleteRedisDraftServerFn({ data: postId });

								queryClient.invalidateQueries({
									queryKey: ["editPost", postId],
								});
								navigate({ to: "/posts" });
							},
							{
								position: "top-center",
								loading: "Updating post...",
								success: "Blog successfully updated!",
								error: (err) =>
									err?.message || "An error occurred updating the blog.",
							},
						);
					}}
				>
					{isSaving ? "Saving..." : "Update Post"}
				</Button>
				</div>
			</div>

			<div className="space-y-6 bg-(--bg-secondary)/30 border border-(--border) rounded-xl p-5 sm:p-6">
				<div className="flex flex-col gap-2.5">
					<Label className="text-xs font-bold uppercase tracking-wider text-(--text)">
						Post Title
					</Label>
					<Input
						type="text"
						value={title}
						onChange={(e) => setTitle(e.target.value)}
						placeholder="What is your blog post about?"
						className="w-full bg-(--bg) border border-border focus:border-(--link) focus:ring-1 focus:ring-(--link)/50 rounded-md px-4 py-1.5 text-xs placeholder:text-xs text-(--text) placeholder:text-(--text-secondary) transition-all outline-none"
					/>
				</div>

				<div className="flex flex-col gap-2.5">
					<Label className="text-xs font-bold uppercase tracking-wider text-(--text)">
						Hero Cover Image
					</Label>
					{existingImgUrl && !blogHeroImg && (
						<div className="relative w-full h-48 rounded-2xl overflow-hidden border border-(--border) shadow-inner group">
							<img
								src={existingImgUrl}
								alt="Current hero cover"
								className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
							/>
							<div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold">
								Current Active Hero Image
							</div>
						</div>
					)}
					<div className="w-full">
						<ImageUploader onImageReadyForS3={(file) => setBlogHeroImg(file)} />
					</div>
				</div>

				<div className="flex flex-col gap-2.5">
					<Label className="text-xs font-bold uppercase tracking-wider text-(--text)">
						Categories & Tags
					</Label>
					<Combobox
						multiple
						autoHighlight
						value={tags}
						onValueChange={(values) => setTags(values as Array<string>)}
						items={CATEGORIES}
					>
						<ComboboxChips
							ref={anchor}
							className="w-full bg-(--bg) border border-border focus-within:border-(--link) rounded-md px-3.5 py-1.5 transition-all"
						>
							<ComboboxValue>
								{(values) => (
									<div className="flex flex-wrap gap-1.5 items-center">
										{(values as Array<string>).map((val: string) => (
											<ComboboxChip
												key={val}
												className="bg-(--link)/15 border border-(--link)/30 text-(--link) rounded-xl text-xs font-semibold px-2.5 py-1"
											>
												{val}
											</ComboboxChip>
										))}
										<ComboboxChipsInput
											className="text-(--text) bg-transparent placeholder:text-(--text-secondary) outline-none text-xs ml-1 py-1 flex-1"
											placeholder={tags.length > 0 ? "" : "Select tags..."}
										/>
									</div>
								)}
							</ComboboxValue>
						</ComboboxChips>
						<ComboboxContent
							anchor={anchor}
							className="bg-(--bg-secondary) border border-(--border) text-(--text) rounded-2xl shadow-2xl overflow-hidden z-50 backdrop-blur-2xl p-2"
						>
							<ComboboxEmpty className="py-4 text-center text-xs text-(--text-secondary)">
								No tags found.
							</ComboboxEmpty>
							<ComboboxList className="space-y-1">
								{(item) => (
									<ComboboxItem
										key={item}
										value={item}
										className="hover:bg-(--link)/15 text-(--text-secondary) hover:text-(--link) rounded-xl px-3 py-2 text-xs font-medium cursor-pointer transition-colors"
									>
										{item}
									</ComboboxItem>
								)}
							</ComboboxList>
						</ComboboxContent>
					</Combobox>
				</div>
			</div>

			<div className="w-full bg-(--bg-secondary)/30 border border-(--border) rounded-xl p-5 sm:p-6 space-y-3">
				<Label className="text-xs font-medium uppercase tracking-wider text-(--text-muted) block">
					Post Content
				</Label>
				<div className="w-full rounded-lg overflow-hidden border border-(--border) bg-(--bg)">
					<SimpleEditor setData={setEditorData} />
				</div>
			</div>
		</div>
	);
}
