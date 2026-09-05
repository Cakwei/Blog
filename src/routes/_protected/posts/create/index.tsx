import { useForm } from "@tanstack/react-form";
import {
	ClientOnly,
	createFileRoute,
	Link,
	useNavigate,
} from "@tanstack/react-router";
import type { Editor } from "@tiptap/core";
import axios from "axios";
import { Sparkles } from "lucide-react";
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
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { CATEGORIES } from "#/lib/const";
import type { IEditorSavingContext, IResponse } from "#/lib/types";
import { getHeadersCookieFn, logger } from "#/lib/utils";

export const Route = createFileRoute("/_protected/posts/create/")({
	component: NewPostPage,
});

function NewPostPage() {
	return (
		<EditorProvider>
			<div className="min-h-screen text-(--text) bg-(--bg) selection:bg-(--link)/20 selection:text-(--link) relative overflow-hidden">
				{/* Atmospheric Ambient Glow Background */}
				<div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] bg-gradient-to-b from-(--link)/10 via-(--link)/5 to-transparent blur-[120px] pointer-events-none -z-10" />

				<div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
					<NewPostForm />
				</div>
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

function NewPostForm() {
	const navigate = useNavigate();
	const anchor = useComboboxAnchor();
	const [data, setData] = useState<any>();
	const [blogHeroImg, setBlogHeroImg] = useState<File | null>(null);
	const { isSaving } = useEditorSavingState();

	const form = useForm({
		defaultValues: {
			title: "",
			tags: [] as Array<string>,
		},
		onSubmit: async ({ value }) => {
			if (!blogHeroImg) {
				toast.error("Please upload a hero background image.", {
					position: "top-center",
				});
				return;
			}

			if (!data) {
				toast.error("Blog content cannot be empty.", {
					position: "top-center",
				});
				return;
			}

			try {
				toast.loading("Publishing blog...", {
					id: "save-blog",
					position: "top-center",
				});

				validateFile(blogHeroImg);
				const base64Data = await fileToBase64(blogHeroImg);
				const cookie = await getHeadersCookieFn();
				// Send streamlined request to the single API endpoint handling S3 upload & DB storage sequentially
				const response = await axios.post<IResponse>(
					"/api/posts",
					{
						title: value.title,
						jsonContent: data,
						tags: value.tags,
						fileName: blogHeroImg.name,
						fileType: blogHeroImg.type,
						base64Data,
					},
					{
						withCredentials: true,
						headers: { cookie: cookie },
					},
				);

				const result = response.data;

				if (!result.success) {
					throw new Error(result.message || "Failed to publish post.");
				}

				try {
					localStorage.removeItem("tiptapDraftContent");
				} catch (e) {
					logger("error", "Failed to clear local storage draft", e);
				}

				toast.success("Blog successfully published!", {
					id: "save-blog",
					position: "top-center",
				});
				navigate({ to: "/posts" });
			} catch (error: any) {
				logger("error", error);
				toast.error(
					error?.response?.data?.message ||
						error?.message ||
						"An error occurred publishing your blog.",
					{ id: "save-blog", position: "top-center" },
				);
			}
		},
	});

	return (
		<div className="space-y-8">
			<Link
				data-testid="backToPostsBtn"
				to="/posts"
				className="flex items-center group text-xs transition-colors"
			>
				<span className="text-(--text-secondary) group-hover:text-(--link)">
					← Back to your posts
				</span>
			</Link>

			<form
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					form.handleSubmit();
				}}
				className="space-y-8"
			>
				{/* Header Section with Modern Action Bar */}
				<div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b border-(--border)/60 pb-8">
					<div className="space-y-2">
						<div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-(--link)/10 border border-(--link)/20 text-(--link) text-[11px] font-bold uppercase tracking-widest">
							<Sparkles className="w-3 h-3" /> Editor Studio
						</div>
						<h1
							data-testid="createPostsHeading"
							className="text-3xl sm:text-4xl font-black tracking-tight text-(--text)"
						>
							Create New Post.
						</h1>
						<p className="text-(--text-secondary) text-xs sm:text-sm">
							Draft, tag, and format your article with rich media components.
						</p>
					</div>
					<Button
						type="submit"
						disabled={isSaving}
						className="h-9 px-6 bg-(--link) hover:bg-(--link)/90 text-white font-semibold text-xs rounded-md shadow-lg shadow-(--link)/20 transition-all cursor-pointer"
					>
						{isSaving ? "Publishing..." : "Publish Post"}
					</Button>
				</div>

				{/* Form Controls Container */}
				<div className="space-y-6 bg-(--bg-secondary)/40 border border-(--border) rounded-3xl p-6 sm:p-8 backdrop-blur-2xl shadow-2xl">
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
							<div className="flex flex-col gap-2.5">
								<Label className="text-xs font-bold uppercase tracking-wider text-(--text)">
									Post Title
								</Label>
								<Input
									type="text"
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
									onBlur={field.handleBlur}
									placeholder="What is your blog post about?"
									className="w-full bg-(--bg) border border-(--border) focus:border-(--link) placeholder:text-xs py-1.5 focus:ring-1 focus:ring-(--link)/50 rounded-md px-4 text-xs text-(--text) placeholder:text-(--text-secondary) transition-all outline-none"
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
					<div className="flex flex-col gap-2.5">
						<Label className="text-xs font-bold uppercase tracking-wider text-(--text)">
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
							<div className="flex flex-col gap-2.5">
								<Label className="text-xs font-bold uppercase tracking-wider text-(--text)">
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
										className="w-full bg-(--bg) border border-(--border) focus-within:border-(--link) rounded-md px-3.5 py-2.5 transition-all"
									>
										<ComboboxValue>
											{(values) => (
												<div className="flex flex-wrap gap-1.5 items-center">
													{(values as Array<string>).map((value: string) => (
														<ComboboxChip
															key={value}
															className="bg-(--link)/15 border border-(--link)/30 text-(--link) rounded-xl text-xs font-semibold px-2.5 py-1"
														>
															{value}
														</ComboboxChip>
													))}
													<ComboboxChipsInput
														className="text-(--text) bg-transparent placeholder:text-(--text-secondary) outline-none text-xs ml-1 flex-1"
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
						)}
					</form.Field>
				</div>
			</form>

			{/* Editor Workspace Panel */}
			<div className="w-full bg-(--bg-secondary)/40 border border-(--border) rounded-3xl p-6 sm:p-8 backdrop-blur-2xl shadow-2xl space-y-3">
				<Label className="text-xs font-bold uppercase tracking-wider text-(--text) block">
					Post Content
				</Label>
				<div className="w-full rounded-2xl overflow-hidden border border-(--border) bg-(--bg)">
					<ClientOnly
						fallback={
							<div className="w-full h-64 flex items-center justify-center text-(--text-secondary) text-xs">
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
