import type { Editor } from "@tiptap/core";
import { createContext, type ReactNode, useContext, useState } from "react";
import type { IEditorSavingContext } from "#/lib/types";

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
