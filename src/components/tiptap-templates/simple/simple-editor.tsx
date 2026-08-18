import { createServerFn } from "@tanstack/react-start";
import { Highlight } from "@tiptap/extension-highlight";
import { Image } from "@tiptap/extension-image";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { Subscript } from "@tiptap/extension-subscript";
import { Superscript } from "@tiptap/extension-superscript";
import { TextAlign } from "@tiptap/extension-text-align";
import { Typography } from "@tiptap/extension-typography";
import { Selection } from "@tiptap/extensions";
import { EditorContent, EditorContext, useEditor } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import {
	type Dispatch,
	type SetStateAction,
	useEffect,
	useRef,
	useState,
} from "react";
import { HorizontalRule } from "#/components/tiptap-node/horizontal-rule-node/horizontal-rule-node-extension";
import { ImageUploadNode } from "#/components/tiptap-node/image-upload-node/image-upload-node-extension";
import { Button } from "#/components/tiptap-ui-primitive/button";
import { Spacer } from "#/components/tiptap-ui-primitive/spacer";
import {
	Toolbar,
	ToolbarGroup,
	ToolbarSeparator,
} from "#/components/tiptap-ui-primitive/toolbar";
import { useEditorSavingState } from "#/routes/_protected/posts/edit/$postId";
import "#/components/tiptap-node/blockquote-node/blockquote-node.scss";
import "#/components/tiptap-node/code-block-node/code-block-node.scss";
import "#/components/tiptap-node/horizontal-rule-node/horizontal-rule-node.scss";
import "#/components/tiptap-node/list-node/list-node.scss";
import "#/components/tiptap-node/image-node/image-node.scss";
import "#/components/tiptap-node/heading-node/heading-node.scss";
import "#/components/tiptap-node/paragraph-node/paragraph-node.scss";
import { ArrowLeftIcon } from "#/components/tiptap-icons/arrow-left-icon";
import { LinkIcon } from "#/components/tiptap-icons/link-icon";
import { BlockquoteButton } from "#/components/tiptap-ui/blockquote-button";
import { CodeBlockButton } from "#/components/tiptap-ui/code-block-button";
import { HeadingDropdownMenu } from "#/components/tiptap-ui/heading-dropdown-menu";
import { ImageUploadButton } from "#/components/tiptap-ui/image-upload-button";
import {
	LinkButton,
	LinkContent,
	LinkPopover,
} from "#/components/tiptap-ui/link-popover";
import { ListDropdownMenu } from "#/components/tiptap-ui/list-dropdown-menu";
import { MarkButton } from "#/components/tiptap-ui/mark-button";
import { TextAlignButton } from "#/components/tiptap-ui/text-align-button";
import { UndoRedoButton } from "#/components/tiptap-ui/undo-redo-button";
import { useCursorVisibility } from "#/hooks/use-cursor-visibility";
import { useIsBreakpoint } from "#/hooks/use-is-breakpoint";
import { useWindowSize } from "#/hooks/use-window-size";
import { MAX_FILE_SIZE } from "#/lib/tiptap-utils";
import "#/components/tiptap-templates/simple/simple-editor.scss";
import "#/index.css";

const getDraftStorageKey = () => {
	const match = window.location.pathname.match(
		/\/posts\/(?:edit\/([^/]+)|create)/,
	);
	const postId = match?.[1];
	return postId ? `tiptapDraftContent-${postId}` : "tiptapDraftContent";
};

export const uploadEditorImageServerFn = createServerFn({ method: "POST" })
	.validator(
		(data: { fileName: string; fileType: string; base64Data: string }) => data,
	)
	.handler(async ({ data }) => {
		try {
			const { Upload } = await import("@aws-sdk/lib-storage");
			const { s3Client } = await import("#/lib/s3");

			const uuid = crypto.randomUUID();
			const cleanFileName = data.fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
			const s3Key = `editor/${uuid}-${cleanFileName}`;

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
			};
		} catch (error: any) {
			console.error("Editor Image S3 Upload Error:", error);
			return {
				success: false,
				url: "",
				message: error?.message || "Failed to upload image.",
			};
		}
	});

export const handleImageUpload = async (
	file: File,
	onProgress?: (event: { progress: number }) => void,
	abortSignal?: AbortSignal,
): Promise<string> => {
	const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

	if (!file) throw new Error("No file provided");
	if (file.size > MAX_FILE_SIZE) {
		throw new Error(
			`File size exceeds maximum allowed (${MAX_FILE_SIZE / (1024 * 1024)}MB)`,
		);
	}

	const base64Data = await new Promise<string>((resolve, reject) => {
		const reader = new FileReader();

		reader.onprogress = (event) => {
			if (event.lengthComputable && onProgress) {
				const progress = Math.round((event.loaded / event.total) * 50);
				onProgress({ progress });
			}
		};

		reader.onload = () => {
			if (onProgress) onProgress({ progress: 50 });
			resolve(reader.result as string);
		};

		reader.onerror = () => reject(new Error("Error reading local image file"));

		if (abortSignal?.aborted) {
			return reject(new Error("Upload cancelled"));
		}

		abortSignal?.addEventListener("abort", () => {
			reader.abort();
			reject(new Error("Upload cancelled"));
		});

		reader.readAsDataURL(file);
	});

	if (abortSignal?.aborted) throw new Error("Upload cancelled");
	if (onProgress) onProgress({ progress: 75 });

	const result = await uploadEditorImageServerFn({
		data: {
			fileName: file.name,
			fileType: file.type,
			base64Data,
		},
	});

	if (!result.success || !result.url) {
		throw new Error(result.message || "Failed to upload image to S3");
	}

	if (onProgress) onProgress({ progress: 100 });
	return result.url;
};

const MainToolbarContent = ({
	onLinkClick,
	isMobile,
}: {
	onLinkClick: () => void;
	isMobile: boolean;
}) => {
	return (
		<>
			<Spacer />

			<ToolbarGroup>
				<UndoRedoButton action="undo" />
				<UndoRedoButton action="redo" />
			</ToolbarGroup>

			<ToolbarSeparator />

			<ToolbarGroup>
				<HeadingDropdownMenu modal={false} levels={[1, 2, 3, 4]} />
				<ListDropdownMenu
					modal={false}
					types={["bulletList", "orderedList", "taskList"]}
				/>
				<BlockquoteButton />
				<CodeBlockButton />
			</ToolbarGroup>

			<ToolbarSeparator />

			<ToolbarGroup>
				<MarkButton type="bold" />
				<MarkButton type="italic" />
				<MarkButton type="strike" />
				<MarkButton type="code" />
				<MarkButton type="underline" />
				{!isMobile ? <LinkPopover /> : <LinkButton onClick={onLinkClick} />}
			</ToolbarGroup>

			<ToolbarSeparator />

			<ToolbarGroup>
				<MarkButton type="superscript" />
				<MarkButton type="subscript" />
			</ToolbarGroup>

			<ToolbarSeparator />

			<ToolbarGroup>
				<TextAlignButton align="left" />
				<TextAlignButton align="center" />
				<TextAlignButton align="right" />
				<TextAlignButton align="justify" />
			</ToolbarGroup>

			<ToolbarSeparator />

			<ToolbarGroup>
				<ImageUploadButton text="Add" />
			</ToolbarGroup>

			<Spacer />

			{isMobile && <ToolbarSeparator />}
		</>
	);
};

const MobileToolbarContent = ({
	type,
	onBack,
}: {
	type: "link";
	onBack: () => void;
}) => (
	<>
		<ToolbarGroup>
			<Button variant="ghost" onClick={onBack}>
				<ArrowLeftIcon className="tiptap-button-icon" />
				<LinkIcon className="tiptap-button-icon" />
			</Button>
		</ToolbarGroup>

		<ToolbarSeparator />
		<LinkContent />
	</>
);

interface SimpleEditorProps {
	setData: Dispatch<SetStateAction<any>>;
}

export function SimpleEditor({ setData }: SimpleEditorProps) {
	const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const isMobile = useIsBreakpoint();
	const { height } = useWindowSize();
	const [mobileView, setMobileView] = useState<"main" | "link">("main");
	const toolbarRef = useRef<HTMLDivElement>(null);

	const { setEditor, setIsSaving, initialContent } = useEditorSavingState();

	const getResolvedInitialContent = () => {
		try {
			const rawDraft = typeof window === 'undefined'? null : localStorage.getItem(getDraftStorageKey());
			if (rawDraft) {
				const parsedDraft = JSON.parse(rawDraft);
				if (parsedDraft && typeof parsedDraft === "object") {
					return parsedDraft;
				}
			}
		} catch (e) {
			console.error("Failed to parse local draft", e);
		}

		if (!initialContent) return "";
		return typeof initialContent === "string"
			? JSON.parse(initialContent)
			: initialContent;
	};

	const editor = useEditor({
		immediatelyRender: false,
		editorProps: {
			attributes: {
				autocomplete: "off",
				autocorrect: "off",
				autocapitalize: "off",
				"aria-label": "Main content area, start typing to enter text.",
				class: "simple-editor",
			},
		},
		extensions: [
			StarterKit.configure({
				horizontalRule: false,
				link: {
					openOnClick: false,
					enableClickSelection: true,
				},
			}),
			HorizontalRule,
			TextAlign.configure({ types: ["heading", "paragraph"] }),
			TaskList,
			TaskItem.configure({ nested: true }),
			Highlight.configure({ multicolor: true }),
			Image.configure({
				resize: {
					enabled: true,
					directions: ["top", "bottom", "left", "right"],
					minWidth: 50,
					minHeight: 50,
					alwaysPreserveAspectRatio: true,
				},
				allowBase64: true,
			}),
			Typography,
			Superscript,
			Subscript,
			Selection,
			ImageUploadNode.configure({
				accept: "image/*",
				maxSize: MAX_FILE_SIZE,
				limit: 3,
				upload: handleImageUpload,
				onError: (error) => console.error("Upload failed:", error),
			}),
		],
		content: getResolvedInitialContent(),
		onMount: ({ editor }) => setEditor(editor),
		onCreate: ({ editor }) => setEditor(editor),
		onUpdate: ({ editor }) => {
			if (saveTimeoutRef.current) {
				clearTimeout(saveTimeoutRef.current);
			}

			setIsSaving(true);

			saveTimeoutRef.current = setTimeout(() => {
				const json = editor.getJSON();
				try {
					localStorage.setItem(getDraftStorageKey(), JSON.stringify(json));
				} catch (e) {
					console.error("Failed to save draft to localStorage", e);
				}
				setData(json);
				setIsSaving(false);
			}, 350);
		},
	});

	const rect = useCursorVisibility({
		editor,
		overlayHeight: toolbarRef.current?.getBoundingClientRect().height ?? 0,
	});

	useEffect(() => {
		if (!isMobile && mobileView !== "main") {
			setMobileView("main");
		}
	}, [isMobile, mobileView]);

	return (
		<EditorContext.Provider value={{ editor }}>
			<Toolbar
				ref={toolbarRef}
				className="rounded-md"
				style={{
					...(isMobile
						? {
								bottom: `calc(100% - ${height - rect.y}px)`,
								position: "relative",
								width: "100%",
								zIndex: 10,
							}
						: { position: "relative", width: "100%", zIndex: 10 }),
				}}
			>
				{mobileView === "main" ? (
					<MainToolbarContent
						onLinkClick={() => setMobileView("link")}
						isMobile={isMobile}
					/>
				) : (
					<MobileToolbarContent
						type="link"
						onBack={() => setMobileView("main")}
					/>
				)}
			</Toolbar>

			<EditorContent
				editor={editor}
				role="presentation"
				className="simple-editor-content"
			/>
		</EditorContext.Provider>
	);
}
