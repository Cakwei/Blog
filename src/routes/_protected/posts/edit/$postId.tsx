// #/routes/posts/create.tsx

import { Upload } from "@aws-sdk/lib-storage";
import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import type { Editor } from "@tiptap/core";
import { createContext, type ReactNode, useContext, useState } from "react";
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
import { prisma } from "#/db";
import { CATEGORIES } from "#/lib/const";
import { s3Client } from "#/lib/s3";
import type { EditorSavingContenxt } from "#/lib/types";
import { getFreshServerSession } from "#/lib/utils";

export const Route = createFileRoute("/_protected/posts/edit/$postId")({
	component: NewPostPage,
});

const saveFileToDB = createServerFn({ method: "POST" })
	.validator((data: { jsonContent: any; blogImg: any }) => data)
	.handler(async ({ data }) => {
		try {
			if (!data.jsonContent || !data.blogImg) return;

			// Fetch user session
			const session = await getFreshServerSession();

			if (!session) return;

			// Upload to DB
			await prisma.post.create({
				data: {
					title: "bom",
					excerpt: "",
					date: new Date().toISOString(),
					userId: session?.user.id,
					category: "",
					image: data.blogImg || "",
					content: data.jsonContent,
				},
			});
		} catch (e) {
			console.error(e);
		}
	});

function NewPostPage() {
	return (
		<EditorProvider>
			<NewPostForm />
		</EditorProvider>
	);
}

async function uploadImgToS3(file: File) {
	const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
	const BUCKET_NAME = "blog";

	if (!file?.name) return;

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

		// 6. Execute and Wait for Resolution
		await uploader.done();

		// 7. Return URL to Tiptap image node src attribute
		return `https://s3.cakwei.dev/${BUCKET_NAME}/${s3Key}`;
	} catch (e) {
		console.error(e);
		return "gyatt";
	}
}

function NewPostForm() {
	const anchor = useComboboxAnchor();
	const [data, setData] = useState(null);
	const [tags, setTags] = useState<any>(null);
	const [blogHeroImg, setBlogHeroImg] = useState<File | null>(null);
	const { isSaving, editor } = useEditorSavingState();

	/*
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
*/
	async function setBlogHeroIMG(file: File) {
		if (file) setBlogHeroImg(file);
	}
	/*
  useEffect(() => {
    console.log("Layout reading state:", isSaving);
  }, [isSaving]);
*/
	return (
		<div className="max-w-6xl  bg-[#e7f3ec] mx-auto px-4 py-12 h-auto">
			<Link
				to="/posts"
				className="text-sm text-gray-500 hover:text-blue-600 transition-colors mb-5 inline-block"
			>
				← Back to your posts
			</Link>
			<div className="flex justify-between mb-5">
				<h1 className="text-3xl font-bold">Edit post</h1>
				{isSaving ? (
					<Button disabled>Saving...</Button>
				) : (
					<Button
						onClick={async () => {
							if (!blogHeroImg) return;
							const blogHeroImgUrl = await uploadImgToS3(blogHeroImg);
							await saveFileToDB({
								data: {
									jsonContent: editor?.getJSON(),
									blogImg: blogHeroImgUrl,
								},
							});
						}}
					>
						Save my blog
					</Button>
				)}
			</div>
			<div className="flex flex-col items-center">
				<ImageUploader onImageReadyForS3={setBlogHeroIMG} />
				<Combobox
					multiple
					autoHighlight
					onValueChange={(values) => {
						console.log(JSON.stringify(values));
						setTags(values);
					}}
					items={CATEGORIES}
				>
					<ComboboxChips ref={anchor} className="w-full max-w-sm bg-white">
						<ComboboxValue>
							{(values) => (
								<>
									{values.map((value: string) => (
										<ComboboxChip key={value}>{value}</ComboboxChip>
									))}
									<ComboboxChipsInput
										className="text-black"
										placeholder={`${Array.isArray(tags) && tags.length > 0 ? "" : "Select tag(s)"}`}
									/>
								</>
							)}
						</ComboboxValue>
					</ComboboxChips>
					<ComboboxContent anchor={anchor}>
						<ComboboxEmpty>No items found.</ComboboxEmpty>
						<ComboboxList>
							{(item) => (
								<ComboboxItem key={item} value={item}>
									{item}
								</ComboboxItem>
							)}
						</ComboboxList>
					</ComboboxContent>
				</Combobox>
				<hr className="border-t border-gray-300 mb-5" />
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
	// blogHeroImgUrl: "",
	// setBlogHeroImgUrl: () => {},
});

export const EditorProvider = ({ children }: { children: ReactNode }) => {
	const [isSaving, setIsSaving] = useState(false);
	const [editor, setEditor] = useState<Editor | null>(null);
	// const [blogHeroImgUrl, setBlogHeroImgUrl] = useState<string | null>(null);

	return (
		<EditorSavingContext.Provider
			value={{
				isSaving,
				setIsSaving,
				editor,
				setEditor,
				// blogHeroImgUrl,
				// setBlogHeroImgUrl,
			}}
		>
			{children}
		</EditorSavingContext.Provider>
	);
};

export const useEditorSavingState = () => useContext(EditorSavingContext);
