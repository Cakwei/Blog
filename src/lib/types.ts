export type AuthFormData = {
	email: string;
	password: string;
};

export interface PostFormProps {
	initialPost?: Post;
	onSubmit: (input: PostInput) => Promise<void>;
	onDelete?: () => Promise<void>;
	submitLabel: string;
}

export type PostStatus = "draft" | "published";

export interface Post {
	id: string;
	title: string;
	excerpt: string;
	content?: string; // full body — markdown or HTML, your call
	image: string;
	category: string;
	date: Date; // ISO string, e.g. "2026-06-20"
	status?: PostStatus; // defaults to "published" if omitted, for compat with public posts
}

// Shape submitted by the editor form. Omits server-assigned fields.
export type PostInput = Omit<Post, "id" | "date"> & {
	date?: string;
};

export type EditorSavingContenxt = {
	isSaving: boolean;
	setIsSaving: (saving: boolean) => void;
};
