import { Highlight } from "@tiptap/extension-highlight";
import { Image } from "@tiptap/extension-image";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { Subscript } from "@tiptap/extension-subscript";
import { Superscript } from "@tiptap/extension-superscript";
import { TextAlign } from "@tiptap/extension-text-align";
import { Typography } from "@tiptap/extension-typography";
import { Selection } from "@tiptap/extensions";
import { EditorContent, EditorContext, useEditor } from "@tiptap/react";
// --- Tiptap Core Extensions ---
import { StarterKit } from "@tiptap/starter-kit";
import {
	type Dispatch,
	type SetStateAction,
	useEffect,
	useRef,
	useState,
} from "react";
import { HorizontalRule } from "#/components/tiptap-node/horizontal-rule-node/horizontal-rule-node-extension";
// --- Tiptap Node ---
import { ImageUploadNode } from "#/components/tiptap-node/image-upload-node/image-upload-node-extension";
// --- UI Primitives ---
import { Button } from "#/components/tiptap-ui-primitive/button";
import { Spacer } from "#/components/tiptap-ui-primitive/spacer";
import {
	Toolbar,
	ToolbarGroup,
	ToolbarSeparator,
} from "#/components/tiptap-ui-primitive/toolbar";
import "#/components/tiptap-node/blockquote-node/blockquote-node.scss";
import "#/components/tiptap-node/code-block-node/code-block-node.scss";
import "#/components/tiptap-node/horizontal-rule-node/horizontal-rule-node.scss";
import "#/components/tiptap-node/list-node/list-node.scss";
import "#/components/tiptap-node/image-node/image-node.scss";
import "#/components/tiptap-node/heading-node/heading-node.scss";
import "#/components/tiptap-node/paragraph-node/paragraph-node.scss";

// --- Icons ---
import { ArrowLeftIcon } from "#/components/tiptap-icons/arrow-left-icon";
import { HighlighterIcon } from "#/components/tiptap-icons/highlighter-icon";
import { LinkIcon } from "#/components/tiptap-icons/link-icon";
// --- Components ---
import { ThemeToggle } from "#/components/tiptap-templates/simple/theme-toggle";
import { BlockquoteButton } from "#/components/tiptap-ui/blockquote-button";
import { CodeBlockButton } from "#/components/tiptap-ui/code-block-button";
import {
	ColorHighlightPopover,
	ColorHighlightPopoverButton,
	ColorHighlightPopoverContent,
} from "#/components/tiptap-ui/color-highlight-popover";
// --- Tiptap UI ---
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
// --- Hooks ---
import { useIsBreakpoint } from "#/hooks/use-is-breakpoint";
import { useWindowSize } from "#/hooks/use-window-size";

// --- Lib ---
import { MAX_FILE_SIZE } from "#/lib/tiptap-utils";

// --- Styles ---
import "#/components/tiptap-templates/simple/simple-editor.scss";

import content from "#/components/tiptap-templates/simple/data/content.json";
import "#/index.css";
import { useEditorSavingState } from "#/routes/posts/create";

/**
 * Handles image upload with progress tracking and abort capability.
 * Automatically switches between dynamic local previews (Development)
 * and real network server uploads (Production).
 * * @param file The file to upload
 * @param onProgress Optional callback for tracking upload progress
 * @param abortSignal Optional AbortSignal for cancelling the upload
 * @returns Promise resolving to the URL of the uploaded image
 */
export const handleImageUpload = async (
	file: File,
	onProgress?: (event: { progress: number }) => void,
	abortSignal?: AbortSignal,
): Promise<string> => {
	// 1. Structural File Validation
	if (!file) {
		throw new Error("No file provided");
	}

	if (file.size > MAX_FILE_SIZE) {
		throw new Error(
			`File size exceeds maximum allowed (${MAX_FILE_SIZE / (1024 * 1024)}MB)`,
		);
	}

	// ==========================================
	// DEVELOPMENT ENVIRONMENT (Testing Locals)
	// ==========================================
	if (process.env.NODE_ENV === "development") {
		// Simulate network latency tracking for testing the Tiptap UI loader state
		for (let progress = 0; progress <= 100; progress += 20) {
			if (abortSignal?.aborted) {
				throw new Error("Upload cancelled");
			}
			await new Promise((resolve) => setTimeout(resolve, 150));
			onProgress?.({ progress });
		}

		// Returns a temporary pointer to your local computer memory
		return URL.createObjectURL(file);
	}

	// ==========================================
	// PRODUCTION ENVIRONMENT (Real Server API)
	// ==========================================
	const formData = new FormData();
	formData.append("file", file);

	try {
		const response = await fetch("/api/upload", {
			method: "POST",
			body: formData,
			signal: abortSignal, // Links Tiptap's UI abort button to the fetch trigger
		});

		if (!response.ok) {
			throw new Error("Failed to upload image to production server");
		}

		const data = await response.json();

		// NOTE: Change 'data.url' to match your backend response key
		// (e.g., data.secure_url, data.path, etc.)
		return data.url;
	} catch (error) {
		if (error instanceof Error && error.name === "AbortError") {
			throw new Error("Upload cancelled");
		}
		throw error;
	}
};

const MainToolbarContent = ({
	onHighlighterClick,
	onLinkClick,
	isMobile,
}: {
	onHighlighterClick: () => void;
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
				{!isMobile ? (
					<ColorHighlightPopover />
				) : (
					<ColorHighlightPopoverButton onClick={onHighlighterClick} />
				)}
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

			{/*<ToolbarGroup>
				<ThemeToggle />
			</ToolbarGroup>*/}
		</>
	);
};

const MobileToolbarContent = ({
	type,
	onBack,
}: {
	type: "highlighter" | "link";
	onBack: () => void;
}) => (
	<>
		<ToolbarGroup>
			<Button variant="ghost" onClick={onBack}>
				<ArrowLeftIcon className="tiptap-button-icon" />
				{type === "highlighter" ? (
					<HighlighterIcon className="tiptap-button-icon" />
				) : (
					<LinkIcon className="tiptap-button-icon" />
				)}
			</Button>
		</ToolbarGroup>

		<ToolbarSeparator />

		{type === "highlighter" ? (
			<ColorHighlightPopoverContent />
		) : (
			<LinkContent />
		)}
	</>
);

export function SimpleEditor({
	setData,
}: {
	setData: Dispatch<SetStateAction<any>>;
}) {
	const { setIsSaving } = useEditorSavingState();
	const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const isMobile = useIsBreakpoint();
	const { height } = useWindowSize();
	const [mobileView, setMobileView] = useState<"main" | "highlighter" | "link">(
		"main",
	);
	const toolbarRef = useRef<HTMLDivElement>(null);
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
			Image,
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
		// content,
		onUpdate: ({ editor }) => {
			// 2. Immediately clear any existing timer when user types
			if (saveTimeoutRef.current) {
				clearTimeout(saveTimeoutRef.current);
			}

			// 3. Immediately show "Saving..." feedback to the user
			setIsSaving(true);

			// 4. Set a new timer to execute after 1000ms of inactivity
			saveTimeoutRef.current = setTimeout(() => {
				const json = editor.getJSON();

				// 5. Trigger your actual save / TanStack mutation here
				setData(json);

				// 6. Turn off the saving state once saved
				setIsSaving(false);
			}, 350); // 1 second debounce window
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
		<div className="bg-white">
			<EditorContext.Provider value={{ editor }}>
				<Toolbar
					ref={toolbarRef}
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
							onHighlighterClick={() => setMobileView("highlighter")}
							onLinkClick={() => setMobileView("link")}
							isMobile={isMobile}
						/>
					) : (
						<MobileToolbarContent
							type={mobileView === "highlighter" ? "highlighter" : "link"}
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
		</div>
	);
}
