import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import type { Editor } from "@tiptap/core";
import { createContext, type ReactNode, useContext, useState } from "react";
import { toast } from "sonner";
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
import ImageUploader from "#/components/ui/fileUpload";
import { Label } from "#/components/ui/label";
import { prisma } from "#/db";
import { CATEGORIES } from "#/lib/const";
import type { IEditorSavingContext, IResponse } from "#/lib/types";
import { getSessionFn, logger } from "#/lib/utils";

// 1. Fetch existing post data securely with ownership check
const getPostForEdit = createServerFn({ method: "GET" })
	.validator((postId: string) => postId)
	.handler(async ({ data: postId }) => {
		const session = await getSessionFn();
		if (!session?.user?.id) throw new Error("Unauthorized session");

		const parsedId = parseInt(postId, 10);
		if (isNaN(parsedId)) throw new Error("Invalid post ID format");

		const post = await prisma.post.findUnique({
			where: { id: parsedId },
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
	});

export const Route = createFileRoute("/_protected/posts/edit/$postId")({
	loader: async ({ context, params }) => {
		await context.queryClient.ensureQueryData(
			editPostQueryOptions(params.postId),
		);
	},
	component: EditPostRoutePage,
});

// Handling S3 image upload
const uploadImgToS3ServerFn = createServerFn({ method: "POST" })
	.validator(
		(data: { fileName: string; fileType: string; base64Data: string }) => data,
	)
	.handler(async ({ data }) => {
		try {
			const { Upload } = await import("@aws-sdk/lib-storage");
			const { s3Client } = await import("#/lib/s3");

			const uuid = crypto.randomUUID();
			const cleanFileName = data.fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
			const s3Key = `${uuid}-${cleanFileName}`;

			const base64Content = data.base64Data.includes(",")
				? data.base64Data.split(",")[1]
				: data.base64Data;
			const buffer = Buffer.from(base64Content, "base64");

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

// handle database updates
const updatePostInDB = createServerFn({ method: "POST" })
	.validator(
		(data: {
			postId: number;
			title: string;
			excerpt?: string;
			jsonContent: any;
			blogImg: string;
			tags: Array<string>;
		}) => data,
	)
	.handler(async ({ data }) => {
		try {
			if (!data.postId || !data.jsonContent || !data.blogImg || !data.title) {
				return {
					success: false,
					message: "Required fields are missing",
					data: {},
				};
			}

			const session = await getSessionFn();
			if (!session?.user?.id) {
				return { success: false, message: "Unauthorized session", data: {} };
			}

			const existingPost = await prisma.post.findUnique({
				where: { id: data.postId },
			});

			if (!existingPost || existingPost.userId !== session.user.id) {
				return { success: false, message: "Unauthorized action", data: {} };
			}

			await prisma.post.update({
				where: { id: data.postId },
				data: {
					title: data.title,
					excerpt: data.excerpt || "",
					category: data.tags ? data.tags.join(",") : "",
					image: data.blogImg,
					content: data.jsonContent,
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
			<div className="bg-(--bg) min-h-screen w-full px-4 py-8 md:px-8 lg:px-12 text-(--text) isolate">
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
		post.category ? post.category.split(",") : [],
	);
	const [blogHeroImg, setBlogHeroImg] = useState<File | null>(null);
	const [existingImgUrl] = useState<string>(post.image || "");
	const [editorData, setEditorData] = useState<any>(null);
	const { isSaving, editor } = useEditorSavingState();

	return (
		<div className="max-w-4xl mx-auto space-y-6">
			<Link
				to="/posts"
				className="group text-sm font-medium text-(--text-secondary) hover:text-(--text) transition-colors inline-flex items-center gap-1.5"
			>
				<span className="hover:underline text-(--text)">
					{"← Back to your posts"}
				</span>
			</Link>

			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-(--border) mb-8">
				<div>
					<h1 className="text-3xl font-extrabold tracking-tight text-(--text)">
						Edit Post
					</h1>
					<p className="text-sm text-(--text-secondary) mt-1">
						Update your article content and configurations.
					</p>
				</div>
				<Button
					disabled={isSaving}
					className="bg-(--link) hover:bg-(--link)/80 text-(--text) font-semibold transition-all shadow-sm rounded-md px-5 py-2.5 h-auto cursor-pointer"
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

								try {
									localStorage.removeItem(`tiptapDraftContent-${postId}`);
								} catch (e) {
									logger("error", "Failed to clear local storage draft", e);
								}
								queryClient.invalidateQueries({ queryKey: ["editPost"] });
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
					{isSaving ? "Saving..." : "Update post"}
				</Button>
			</div>

			<div className="space-y-6 bg-(--bg-secondary) border border-(--border) rounded-2xl p-6 shadow-xl backdrop-blur-sm">
				{/* Title Input */}
				<div className="flex flex-col gap-2">
					<Label className="text-sm font-semibold tracking-wide text-(--text)">
						Post Title
					</Label>
					<input
						type="text"
						value={title}
						onChange={(e) => setTitle(e.target.value)}
						placeholder="What is your blog post about?"
						className="w-full bg-(--bg) border border-(--border) focus:border-(--link) focus:ring-1 focus:ring-(--link) rounded-md px-4 py-3 text-(--text) placeholder:text-(--text-secondary) transition-all outline-none text-base"
					/>
				</div>

				{/* Hero Image Section */}
				<div className="flex flex-col gap-2">
					<Label className="text-sm font-semibold tracking-wide text-(--text)">
						Hero Cover Image
					</Label>
					{existingImgUrl && !blogHeroImg && (
						<div className="mb-2 relative w-full h-48 rounded-xl overflow-hidden border border-(--border)">
							<img
								src={existingImgUrl}
								alt="Current hero"
								className="w-full h-full object-cover"
							/>
						</div>
					)}
					<div className="w-full">
						<ImageUploader onImageReadyForS3={(file) => setBlogHeroImg(file)} />
					</div>
				</div>

				{/* Tags Combobox */}
				<div className="flex flex-col gap-2">
					<Label className="text-sm font-semibold tracking-wide text-(--text)">
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
							className="w-full bg-(--bg) border border-(--border) focus-within:border-(--link) rounded-md px-3 py-2 min-h-[46px] transition-all"
						>
							<ComboboxValue>
								{(values) => (
									<div className="flex flex-wrap gap-1.5 items-center">
										{(values as Array<string>).map((val: string) => (
											<ComboboxChip
												key={val}
												className="bg-(--bg-secondary) text-(--text) border-(--border) rounded-lg text-xs"
											>
												{val}
											</ComboboxChip>
										))}
										<ComboboxChipsInput
											className="text-(--text) bg-transparent placeholder:text-(--text-secondary) outline-none text-sm ml-1 py-1"
											placeholder={
												tags.length > 0 ? "" : "Select up to 5 tags..."
											}
										/>
									</div>
								)}
							</ComboboxValue>
						</ComboboxChips>
						<ComboboxContent
							anchor={anchor}
							className="bg-(--bg-secondary) border border-(--border) text-(--text) rounded-xl shadow-2xl overflow-hidden z-50"
						>
							<ComboboxEmpty className="py-3 text-center text-sm text-(--text-secondary)">
								No tags found.
							</ComboboxEmpty>
							<ComboboxList className="p-1">
								{(item) => (
									<ComboboxItem
										key={item}
										value={item}
										className="hover:bg-(--bg) text-(--text-secondary) hover:text-(--text) rounded-lg px-3 py-2 text-sm cursor-pointer transition-colors"
									>
										{item}
									</ComboboxItem>
								)}
							</ComboboxList>
						</ComboboxContent>
					</Combobox>
				</div>
			</div>

			{/* Editor Workspace Panel */}
			<div className="w-full mt-6 bg-(--bg-secondary) border border-(--border) rounded-2xl p-6 shadow-xl backdrop-blur-sm">
				<Label className="text-sm font-semibold tracking-wide text-(--text) mb-3 block">
					Post Content
				</Label>
				<div className="w-full rounded-xl overflow-hidden border border-(--border) bg-(--bg)/40">
					<SimpleEditor
						setData={(data) => {
							logger("debug", "yuta:3", data);
							setEditorData(data);
							try {
								localStorage.setItem(
									`tiptapDraftContent-${postId}`,
									JSON.stringify(data),
								);
							} catch (e) {
								logger("error", "Failed to save local draft", e);
							}
						}}
					/>
				</div>
			</div>
		</div>
	);
}

const EditorSavingContext = createContext<IEditorSavingContext>({
	isSaving: false,
	setIsSaving: () => {},
	editor: null,
	setEditor: () => {},
	initialContent: null,
});
export const EditorProvider = ({
	children,
	initialContent,
}: {
	children: ReactNode;
	initialContent: any;
}) => {
	const [isSaving, setIsSaving] = useState(false);
	const [editor, setEditor] = useState<Editor | null>(null);

	return (
		<EditorSavingContext.Provider
			value={{ isSaving, setIsSaving, editor, setEditor, initialContent }}
		>
			{children}
		</EditorSavingContext.Provider>
	);
};

export const useEditorSavingState = () => useContext(EditorSavingContext);
