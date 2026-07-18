import { Upload } from "@aws-sdk/lib-storage";
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

import "#/index.css";
import { s3Client } from "#/lib/s3";
import { useEditorSavingState } from "#/routes/_protected/posts/create";

/**
 * Handles image upload with progress tracking and abort capability.
 * Automatically switches between dynamic local previews (Development)
 * and real network server uploads (Production).
 * * @param file The file to upload
 * @param onProgress Optional callback for tracking upload progress
 * @param abortSignal Optional AbortSignal for cancelling the upload
 * @returns Promise resolving to the URL of the uploaded image
 */
// OLD handleImageUpload
/*export const handleImageUpload = async (
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

	// 2. Base64 Conversion with Progress Tracking & Cancel Support
	return new Promise((resolve, reject) => {
		// Handle immediate termination if already cancelled
		if (abortSignal?.aborted) {
			return reject(new Error("Upload cancelled"));
		}

		const reader = new FileReader();

		// Track processing progress for the Tiptap loader UI
		reader.onprogress = (event) => {
			if (event.lengthComputable) {
				const progress = Math.round((event.loaded / event.total) * 100);
				onProgress?.({ progress });
			}
		};

		// Fire success callback when base64 generation completes
		reader.onload = (event) => {
			if (abortSignal?.aborted) {
				return reject(new Error("Upload cancelled"));
			}
			if (event.target?.result) {
				resolve(event.target.result as string);
			} else {
				reject(new Error("Failed to convert image to Base64"));
			}
		};

		// Intercept internal local reading errors
		reader.onerror = () => {
			reject(new Error("Error reading local image file"));
		};

		// Listen to Tiptap's UI abort signal to stop reading the file
		abortSignal?.addEventListener("abort", () => {
			reader.abort();
			reject(new Error("Upload cancelled"));
		});

		// Trigger the binary string reader engine
		reader.readAsDataURL(file);
	});
};
*/

export const handleImageUpload = async (
	file: File,
	onProgress?: (event: { progress: number }) => void,
	abortSignal?: AbortSignal,
): Promise<string> => {
	const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
	const BUCKET_NAME = "blog";

	// 1. Structural File Validation
	if (!file) throw new Error("No file provided");
	if (file.size > MAX_FILE_SIZE) {
		throw new Error(
			`File size exceeds maximum allowed (${MAX_FILE_SIZE / (1024 * 1024)}MB)`,
		);
	}

	// 2. Generate Unique S3 Key using crypto.randomUUID()
	const uuid = crypto.randomUUID();
	const cleanFileName = file.name.replace(/\s+/g, "-");
	const s3Key = `${uuid}-${cleanFileName}`;

	try {
		// 3. Initialize the Managed Upload Instance
		const uploader = new Upload({
			client: s3Client,
			params: {
				Bucket: BUCKET_NAME,
				Key: s3Key,
				Body: file,
				ContentType: file.type,
			},
			// Configuration optimized for both small and large assets
			queueSize: 4,
			partSize: 5 * 1024 * 1024, // 5MB parts
		});

		// 4. Attach the Lib-Storage Progress Listener
		uploader.on("httpUploadProgress", (progress) => {
			if (progress.loaded && progress.total) {
				const percentage = Math.round((progress.loaded / progress.total) * 100);
				onProgress?.({ progress: percentage });
			}
		});

		// 5. Handle Tiptap UI Deletion / Abort Events Mid-Stream
		if (abortSignal) {
			if (abortSignal.aborted) {
				uploader.abort();
				throw new Error("Upload cancelled");
			}

			abortSignal.addEventListener("abort", () => {
				uploader.abort();
			});
		}

		// 6. Execute and Wait for Resolution
		await uploader.done();

		// 7. Return URL to Tiptap image node src attribute
		return `https://s3.cakwei.dev/${BUCKET_NAME}/${s3Key}`;
	} catch (error: any) {
		if (error.name === "AbortError" || abortSignal?.aborted) {
			throw new Error("Upload cancelled");
		}
		throw new Error(`AWS S3 Upload Failed: ${error.message}`);
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
				{!isMobile
					? /* 	<ColorHighlightPopover />
						 */ null
					: /*<ColorHighlightPopoverButton onClick={onHighlighterClick} >*/ null}
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
	const { setEditor } = useEditorSavingState();

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
					directions: ["top", "bottom", "left", "right"], // can be any direction or diagonal combination
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
		// content,
		onCreate: () => {
			setEditor(editor);
		},
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
