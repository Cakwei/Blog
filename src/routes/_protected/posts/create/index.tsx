import { useForm, useStore } from "@tanstack/react-form";
import {
	ClientOnly,
	createFileRoute,
	Link,
	useNavigate,
} from "@tanstack/react-router";
import axios from "axios";
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
import { logger } from "#/lib/utils";

export {
	EditorProvider,
	EditorSavingContext,
	useEditorSavingState,
} from "#/components/tiptap-templates/simple/editor-context";

export const Route = createFileRoute("/_protected/posts/create/")({
	component: NewPostPage,
});

function NewPostPage() {
	return (
		<EditorProvider>
			<div className="w-full max-w-4xl mx-auto">
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
	const { editor, isSaving } = useEditorSavingState();

	// Draft Autosave & Recovery State
	const [detectedDraft, setDetectedDraft] = useState<PostDraft | null>(null);
	const [autosaveStatus, setAutosaveStatus] = useState<
		"idle" | "saving" | "saved" | "unsaved"
	>("idle");
	const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

	const localDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const redisDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
					},
				);

				const result = response.data;

				if (!result.success) {
					throw new Error(result.message || "Failed to publish post.");
				}

				// Clean up draft upon successful publish
				clearLocalDraft("new");
				void deleteRedisDraftServerFn({ data: "new" });

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

	// Check for unsaved drafts on initial mount
	useEffect(() => {
		const local = getLocalDraft("new");
		if (
			local &&
			(local.title?.trim() ||
				(local.tags && local.tags.length > 0) ||
				(local.content && Object.keys(local.content).length > 0))
		) {
			setDetectedDraft(local);
			return;
		}

		void getRedisDraftServerFn({ data: "new" }).then((remote) => {
			if (
				remote &&
				(remote.title?.trim() ||
					(remote.tags && remote.tags.length > 0) ||
					(remote.content && Object.keys(remote.content).length > 0))
			) {
				setDetectedDraft(remote);
			}
		});
	}, []);

	const handleRestoreDraft = () => {
		if (!detectedDraft) return;

		if (detectedDraft.title) {
			form.setFieldValue("title", detectedDraft.title);
		}
		if (detectedDraft.tags) {
			form.setFieldValue("tags", detectedDraft.tags);
		}
		if (detectedDraft.content) {
			setData(detectedDraft.content);
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
		clearLocalDraft("new");
		void deleteRedisDraftServerFn({ data: "new" });
		setDetectedDraft(null);
		toast.info("Draft discarded.");
	};

	// Track values for autosaving
	const formTitle = useStore(form.store, (s) => s.values.title);
	const formTags = useStore(form.store, (s) => s.values.tags);

	useEffect(() => {
		const hasContent =
			(formTitle && formTitle.trim().length > 0) ||
			(formTags && formTags.length > 0) ||
			(data && Object.keys(data).length > 0);

		if (!hasContent) return;

		setAutosaveStatus("unsaved");

		if (localDebounceRef.current) clearTimeout(localDebounceRef.current);
		localDebounceRef.current = setTimeout(() => {
			setAutosaveStatus("saving");
			const saved = saveLocalDraft("new", {
				title: formTitle,
				tags: formTags,
				content: data,
			});
			setLastSavedAt(saved.updatedAt);
			setAutosaveStatus("saved");
		}, 1200);

		if (redisDebounceRef.current) clearTimeout(redisDebounceRef.current);
		redisDebounceRef.current = setTimeout(() => {
			void saveRedisDraftServerFn({
				data: {
					postId: "new",
					title: formTitle,
					tags: formTags,
					content: data,
				},
			});
		}, 20000);

		return () => {
			if (localDebounceRef.current) clearTimeout(localDebounceRef.current);
			if (redisDebounceRef.current) clearTimeout(redisDebounceRef.current);
		};
	}, [formTitle, formTags, data]);

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

			{/* Draft Recovery Banner */}
			<DraftRecoveryBanner
				draft={detectedDraft}
				onRestore={handleRestoreDraft}
				onDiscard={handleDiscardDraft}
			/>

			<form
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					form.handleSubmit();
				}}
				className="space-y-8"
			>
				{/* Header Section with Modern Action Bar */}
				<div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b border-(--border) pb-6">
					<div className="space-y-1.5">
						<div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-(--bg-secondary) border border-(--border) text-(--text-secondary) text-[11px] font-medium uppercase tracking-wider">
							Editor Studio
						</div>
						<h1
							data-testid="createPostsHeading"
							className="text-2xl sm:text-3xl font-bold tracking-tight text-(--text)"
						>
							Create New Post
						</h1>
						<p className="text-(--text-secondary) text-xs sm:text-sm">
							Draft, tag, and format your article with rich media components.
						</p>
					</div>

					<div className="flex items-center gap-4">
						<DraftAutosaveStatus
							status={autosaveStatus}
							lastSavedAt={lastSavedAt}
						/>
						<Button
							type="submit"
							disabled={isSaving}
							className="h-9 px-5 bg-(--text) hover:opacity-90 text-(--bg) font-medium text-xs rounded-lg transition-all cursor-pointer"
						>
							{isSaving ? "Publishing..." : "Publish Post"}
						</Button>
					</div>
				</div>

				{/* Form Controls Container */}
				<div className="space-y-6 bg-(--bg-secondary)/30 border border-(--border) rounded-xl p-5 sm:p-6">
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
			<div className="w-full bg-(--bg-secondary)/30 border border-(--border) rounded-xl p-5 sm:p-6 space-y-3">
				<Label className="text-xs font-medium uppercase tracking-wider text-(--text-muted) block">
					Post Content
				</Label>
				<div className="w-full rounded-lg overflow-hidden border border-(--border) bg-(--bg)">
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
