import type { JsonValue } from "@prisma/client/runtime/client";
import type { Editor } from "@tiptap/core";
import type { Dispatch, SetStateAction } from "react";
export type AuthFormData = {
	fullName?: string;
	username?: string;
	email: string;
	password: string;
};

export interface PostFormProps {
	initialPost?: Post;
	onSubmit: (input: PostInput) => Promise<void>;
	onDelete?: () => Promise<void>;
	submitLabel: string;
}

export type IResponse = {
	success: boolean;
	data: any;
	message: string;
	totalPages?: number;
	currentPage?: number;
	totalCount?: string;
};
export type PostStatus = "draft" | "published";

export interface Post {
	id: number;
	title: string;
	excerpt: string;
	content?: string | JsonValue | undefined | null;
	image: string;
	category: string;
	date: Date; // ISO string, e.g. "2026-06-20"
	status?: PostStatus; // defaults to "published" if omitted, for compat with public posts
}

// Shape submitted by the editor form. Omits server-assigned fields.
export type PostInput = Omit<Post, "id" | "date"> & {
	date?: string;
};

export interface IEditorSavingContext {
	isSaving: boolean;
	setIsSaving: (saving: boolean) => void;
	//downloadFile: (editor: Editor) => Promise<void>;
	editor: Editor | null;
	setEditor: Dispatch<SetStateAction<Editor | null>>;
	initialContent: any;
	// blogHeroImgUrl: string | null;
	// setBlogHeroImgUrl: Dispatch<SetStateAction<string | null>>;
}
