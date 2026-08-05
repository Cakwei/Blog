import { useForm } from "@tanstack/react-form";
import {
	ClientOnly,
	createFileRoute,
	Link,
	useNavigate,
} from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import type { Editor } from "@tiptap/core";
import {
	createContext,
	type ReactNode,
	useContext,
	useState,
} from "react";
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
import { getSessionFn } from "#/lib/utils";

export const Route = createFileRoute("/_protected/posts/create/")({
	component: NewPostPage,
});

// Server Function handling S3 Image Upload securely on the backend (Node environment)
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

			// Convert base64 string to Buffer for server-side S3 upload processing
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
			console.error("S3 Server Upload Error:", error);
			return {
				success: false,
				url: "",
				message: error?.message || "Failed to upload image to S3",
			};
		}
	});

// Server Function handling database insertion safely on the backend
const saveFileToDB = createServerFn({ method: "POST" })
	.validator(
		(data: {
			title: string;
			jsonContent: any;
			blogImg: string;
			tags: Array<string>;
		}) => data,
	)
	.handler(async ({ data }) => {
		try {
			if (!data.title || !data.jsonContent || !data.blogImg) {
				return {
					success: false,
					message: "Required fields are missing",
					data: {},
				};
			}

			const session = await getSessionFn();
			if (!session) {
				return { success: false, message: "Unauthorized session", data: {} };
			}

			await prisma.post.create({
				data: {
					title: data.title,
					excerpt: "",
					date: new Date().toISOString(),
					userId: session.user.id,
					category: data.tags ? data.tags.join(",") : "",
					image: data.blogImg,
					content: data.jsonContent,
				},
			});

			return {
				success: true,
				message: "Successfully uploaded blog to DB",
				data: {},
			};
		} catch (error) {
			console.error("Database save error:", error);
			return {
				success: false,
				message: "An error occurred while saving to database",
				data: {},
			};
		}
	});

function NewPostPage() {
	return (
		<EditorProvider>
			<div className="bg-(--bg) min-h-screen w-full px-4 py-8 md:px-8 lg:px-12 text-white isolate">
				<NewPostForm />
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

// Helper to convert File to base64 string for server transfer
async function fileToBase64(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.readAsDataURL(file);
		reader.onload = () => resolve(reader.result as string);
		reader.onerror = (error) => reject(error);
	});
}

function NewPostForm() {
	const navigate = useNavigate();
	const anchor = useComboboxAnchor();
	const [data, setData] = useState<any>();
	const [blogHeroImg, setBlogHeroImg] = useState<File | null>(null);
	const { isSaving, editor } = useEditorSavingState();

	const form = useForm({
		defaultValues: {
			title: "",
			tags: [] as Array<string>,
		},
		onSubmit: async ({ value }) => {
			console.log("sukuna", JSON.stringify(data), editor, "||||||", data);

			if (!blogHeroImg) {
				toast.error("Please upload a hero background image.");
				return;
			}

			if (!data) {
				toast.error("Blog content cannot be empty.");
				return;
			}

			try {
				toast.loading("Publishing blog...", { id: "save-blog" });

				validateFile(blogHeroImg);
				const base64Data = await fileToBase64(blogHeroImg);

				// Call server function to perform S3 upload securely on the backend
				const uploadResult = await uploadImgToS3ServerFn({
					data: {
						fileName: blogHeroImg.name,
						fileType: blogHeroImg.type,
						base64Data,
					},
				});

				if (!uploadResult.success || !uploadResult.url) {
					throw new Error(uploadResult.message || "Image upload failed.");
				}

				const rawContent = data; // editor.getJSON();

				const result: IResponse = await saveFileToDB({
					data: {
						title: value.title,
						jsonContent: rawContent,
						blogImg: uploadResult.url,
						tags: value.tags,
					},
				});

				if (!result.success) {
					throw new Error(result.message || "Failed to save post.");
				}

				try {
					localStorage.removeItem("tiptapDraftContent");
				} catch (e) {
					console.error("Failed to clear local storage draft", e);
				}

				toast.success("Blog successfully published!", { id: "save-blog" });
				navigate({ to: "/posts" });
			} catch (error: any) {
				console.error(error);
				toast.error(
					error?.message || "An error occurred publishing your blog.",
					{ id: "save-blog" },
				);
			}
		},
	});

	return (
		<div className="max-w-4xl mx-auto space-y-6">
			<Link
				to="/posts"
				className="group text-sm font-medium text-neutral-400 hover:text-white transition-colors inline-flex items-center gap-1.5"
			>
				<div className="text-(--text) flex group-hover:underline w-full">
					<span className="text-(--text)">{"← Back to your posts"}</span>
				</div>
			</Link>

			<form
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					form.handleSubmit();
				}}
			>
				{/* Header Section with Modern Action Bar */}
				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-neutral-800/80 mb-8">
					<div>
						<h1 className="text-3xl font-extrabold tracking-tight text-white">
							Create New Post
						</h1>
						<p className="text-sm text-neutral-400 mt-1">
							Draft and format your article with rich media sections.
						</p>
					</div>
					<Button
						type="submit"
						disabled={isSaving}
						className="bg-(--link) hover:bg-(--link)/80 text-(--text) font-semibold transition-all shadow-sm rounded-md px-5 py-2.5 h-auto cursor-pointer"
					>
						{isSaving ? "Saving..." : "Publish post"}
					</Button>
				</div>

				{/* Form Controls Container */}
				<div className="space-y-6 bg-neutral-900/40 border border-neutral-800/80 rounded-2xl p-6 shadow-xl backdrop-blur-sm">
					{/* Title Field */}
					<form.Field
						name="title"
						validators={{
							onChange: ({ value }) =>
								!value || value.length < 3
									? "Title must be at least 3 characters long"
									: undefined,
						}}
					>
						{(field) => (
							<div className="flex flex-col gap-2">
								<Label className="text-sm font-semibold tracking-wide text-neutral-200">
									Post Title
								</Label>
								<input
									type="text"
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
									onBlur={field.handleBlur}
									placeholder="What is your blog post about?"
									className="w-full bg-black/60 border border-neutral-800 focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500 rounded-md px-4 py-3 text-white placeholder:text-neutral-600 transition-all outline-none text-base"
								/>
								{field.state.meta.isTouched &&
								field.state.meta.errors.length > 0 ? (
									<em className="text-red-400 text-xs mt-0.5">
										{field.state.meta.errors.join(", ")}
									</em>
								) : null}
							</div>
						)}
					</form.Field>

					{/* Hero Image Section */}
					<div className="flex flex-col gap-2">
						<Label className="text-sm font-semibold tracking-wide text-neutral-200">
							Hero Cover Image
						</Label>
						<div className="w-full">
							<ImageUploader onImageReadyForS3={setBlogHeroImg} />
						</div>
					</div>

					{/* Tags Field */}
					<form.Field
						name="tags"
						validators={{
							onChange: ({ value }) =>
								value && value.length > 5
									? "Cannot select more than 5 tags"
									: undefined,
						}}
					>
						{(field) => (
							<div className="flex flex-col gap-2">
								<Label className="text-sm font-semibold tracking-wide text-neutral-200">
									Categories & Tags
								</Label>
								<Combobox
									multiple
									autoHighlight
									onValueChange={(values) =>
										field.handleChange(values as Array<string>)
									}
									items={CATEGORIES}
								>
									<ComboboxChips
										ref={anchor}
										className="w-full bg-black/60 border border-neutral-800 focus-within:border-neutral-500 rounded-md px-3 py-2 min-h-[46px] transition-all"
									>
										<ComboboxValue>
											{(values) => (
												<div className="flex flex-wrap gap-1.5 items-center">
													{(values as Array<string>).map((value: string) => (
														<ComboboxChip
															key={value}
															className="bg-neutral-800 text-white border-neutral-700 rounded-lg text-xs"
														>
															{value}
														</ComboboxChip>
													))}
													<ComboboxChipsInput
														className="text-white bg-transparent placeholder:text-neutral-600 outline-none text-sm ml-1 py-1"
														placeholder={
															field.state.value.length > 0
																? ""
																: "Select up to 5 tags..."
														}
													/>
												</div>
											)}
										</ComboboxValue>
									</ComboboxChips>
									<ComboboxContent
										anchor={anchor}
										className="bg-neutral-900 border border-neutral-800 text-white rounded-xl shadow-2xl overflow-hidden z-50"
									>
										<ComboboxEmpty className="py-3 text-center text-sm text-neutral-500">
											No tags found.
										</ComboboxEmpty>
										<ComboboxList className="p-1">
											{(item) => (
												<ComboboxItem
													key={item}
													value={item}
													className="hover:bg-neutral-800 text-neutral-300 hover:text-white rounded-lg px-3 py-2 text-sm cursor-pointer transition-colors"
												>
													{item}
												</ComboboxItem>
											)}
										</ComboboxList>
									</ComboboxContent>
								</Combobox>
							</div>
						)}
					</form.Field>
				</div>
			</form>

			{/* Editor Workspace Panel */}
			<div className="w-full mt-6 bg-neutral-900/40 border border-neutral-800/80 rounded-2xl p-6 shadow-xl backdrop-blur-sm">
				<Label className="text-sm font-semibold tracking-wide text-neutral-200 mb-3 block">
					Post Content
				</Label>
				<div className="w-full rounded-xl overflow-hidden border border-neutral-800/80 bg-black/40">
					<ClientOnly
						fallback={
							<div className="w-full h-64 flex items-center justify-center text-neutral-500 text-sm">
								Loading editor environment...
							</div>
						}
					>
						<SimpleEditor setData={setData} />
					</ClientOnly>
				</div>
			</div>
		</div>
	);
}

export const EditorSavingContext = createContext<IEditorSavingContext>({
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
	initialContent?: IEditorSavingContext["initialContent"];
}) => {
	const [isSaving, setIsSaving] = useState(false);
	const [editor, setEditor] = useState<Editor | null>(null);

	return (
		<EditorSavingContext.Provider
			value={{
				isSaving,
				setIsSaving,
				editor,
				setEditor,
				initialContent: initialContent || null,
			}}
		>
			{children}
		</EditorSavingContext.Provider>
	);
};

export const useEditorSavingState = () => useContext(EditorSavingContext);
