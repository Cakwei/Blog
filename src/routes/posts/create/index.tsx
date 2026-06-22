// #/routes/posts/create.tsx
import { createFileRoute, Link } from "@tanstack/react-router";
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
	const { isSaving } = useEditorSavingState();

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
					<Button>Save my blog</Button>
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
});

export const EditorProvider = ({ children }: { children: ReactNode }) => {
	const [isSaving, setIsSaving] = useState(false);

	return (
		<EditorSavingContext.Provider value={{ isSaving, setIsSaving }}>
			{children}
		</EditorSavingContext.Provider>
	);
};

export const useEditorSavingState = () => useContext(EditorSavingContext);
