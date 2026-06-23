// #/routes/posts/create.tsx
import { createFileRoute, Link } from "@tanstack/react-router";
import type { Editor } from "@tiptap/core";
import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useState,
} from "react";
import { SimpleEditor } from "#/components/tiptap-templates/simple/simple-editor";
import { Button } from "#/components/ui/button";
import type { EditorSavingContenxt } from "#/lib/types";
export const Route = createFileRoute("/posts/create/")({
	component: NewPostPage,
});

function NewPostPage() {
	return (
		<EditorProvider>
			<NewPostForm />
		</EditorProvider>
	);
}

function NewPostForm() {
	const [data, setData] = useState();
	const { isSaving, editor } = useEditorSavingState();

	async function downloadFile() {
		if (!editor) return;

		const jsonContent = editor.getJSON();
		const jsonString = JSON.stringify(jsonContent, null, 2);

		// 3. Create a Blob with the JSON data
		const blob = new Blob([jsonString], { type: "application/json" });

		// 4. Create a temporary download link
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");

		link.href = url;
		link.download = "tiptap-content.json";

		// 5. Trigger the download and clean up
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	}

	useEffect(() => {
		console.log("Layout reading state:", isSaving);
	}, [isSaving]);

	return (
		<div className="max-w-6xl mx-auto px-4 py-12 h-auto">
			<Link
				to="/posts"
				className="text-sm text-gray-500 hover:text-blue-600 transition-colors mb-5 inline-block"
			>
				← Back to your posts
			</Link>
			<div className="flex justify-between mb-5">
				<h1 className="text-3xl font-bold">New post</h1>
				{isSaving ? (
					<Button disabled>Saving...</Button>
				) : (
					<Button onClick={downloadFile}>Save my blog</Button>
				)}
			</div>

			<div className="w-full">
				<SimpleEditor setData={setData} />
			</div>
		</div>
	);
}

export const EditorSavingContext = createContext<EditorSavingContenxt>({
	isSaving: false,
	setIsSaving: () => {},
	///	downloadFile: async () => {},
	editor: null,
	setEditor: () => {},
});

export const EditorProvider = ({ children }: { children: ReactNode }) => {
	const [isSaving, setIsSaving] = useState(false);
	const [editor, setEditor] = useState<Editor | null>(null);

	return (
		<EditorSavingContext.Provider
			value={{ isSaving, setIsSaving, editor, setEditor }}
		>
			{children}
		</EditorSavingContext.Provider>
	);
};

export const useEditorSavingState = () => useContext(EditorSavingContext);
