// #/routes/posts/create.tsx

import { Upload } from '@aws-sdk/lib-storage';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import type { Editor } from '@tiptap/core';
import { createContext, type ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { SimpleEditor } from '#/components/tiptap-templates/simple/simple-editor';
import { Button } from '#/components/ui/button';
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
} from '#/components/ui/combobox';
import ImageUploader from '#/components/ui/fileUpload';
import { prisma } from '#/db';
import { CATEGORIES } from '#/lib/const';
import { s3Client } from '#/lib/s3';
import type { EditorSavingContenxt, IResponse } from '#/lib/types';
import { getFreshServerSession } from '#/lib/utils';

export const Route = createFileRoute('/_protected/posts/edit/$postId')({
  component: NewPostPage,
});

const saveFileToDB = createServerFn({ method: 'POST' })
  .validator((data: { jsonContent: any; blogImg: any; tags: Array<string> }) => data)
  .handler(async ({ data }) => {
    try {
      if (!data.jsonContent || !data.blogImg) {
        return {
          success: false,
          message: 'One or more inputs empty',
          data: {},
        };
      }

      // Fetch user session
      const session = await getFreshServerSession();

      if (!session) return { success: false, message: 'Session not found', data: {} };

      // Upload to DB
      await prisma.post.create({
        data: {
          title: 'bom',
          excerpt: '',
          date: new Date().toISOString(),
          userId: session?.user.id,
          category: data.tags ? data.tags.toString() : '',
          image: data.blogImg || '',
          content: data.jsonContent,
        },
      });
      return {
        success: true,
        message: 'Successfully uploaded blog to DB',
        data: {},
      };
    } catch (e) {
      console.error(e);
      return { success: false, message: 'An error has occurred', data: {} };
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
  const BUCKET_NAME = 'blog';

  if (!file?.name) return;

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds maximum allowed (${MAX_FILE_SIZE / (1024 * 1024)}MB)`);
  }

  // 2. Generate Unique S3 Key using crypto.randomUUID()
  const uuid = crypto.randomUUID();
  const cleanFileName = file.name.replace(/\s+/g, '-');
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
  }
}

function NewPostForm() {
  const navigate = useNavigate();
  const createBtnRef = useRef<HTMLButtonElement | null>(null);
  const anchor = useComboboxAnchor();
  const [data, setData] = useState();
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
    <div className="bg-black">
      <div className="max-w-6xl bg-black mx-auto px-4 py-12 h-auto">
        <Link
          to="/posts"
          className="text-sm text-white hover:text-blue-600 transition-colors mb-5 inline-block"
        >
          <span className="text-white hover:underline">← Back to your posts</span>
        </Link>
        <div className="flex justify-between mb-5">
          <h1 className="text-3xl font-bold text-white">New post</h1>
          {isSaving ? (
            <Button disabled>Saving...</Button>
          ) : (
            <Button
              ref={createBtnRef}
              className="bg-white text-black font-semibold hover:bg-white/90"
              onClick={() => {
                toast.promise(
                  async () => {
                    if (!blogHeroImg) throw Error();

                    if (createBtnRef.current) createBtnRef.current.disabled = true;
                    const blogHeroImgUrl = await uploadImgToS3(blogHeroImg);

                    const result: IResponse = await saveFileToDB({
                      data: {
                        jsonContent: editor?.getJSON(),
                        blogImg: blogHeroImgUrl,
                        tags: tags,
                      },
                    });

                    if (!result.success && createBtnRef.current) {
                      createBtnRef.current.disabled = false;
                    }

                    if (result.success) {
                      // Clear the auto-saved draft securely upon successful creation
                      try {
                        localStorage.removeItem('tiptapDraftContent');
                      } catch (e) {
                        console.error('Failed to clear local storage', e);
                      }
                      navigate({ to: '/posts' });
                    }
                  },
                  {
                    position: 'top-center',
                    loading: 'Loading...',
                    success: () => `Blog successfully published`,
                    error: 'An erorr occurred publishing blog, please try again later',
                  },
                );
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
              setTags(values);
            }}
            items={CATEGORIES}
          >
            <ComboboxChips ref={anchor} className="w-full bg-black max-w-sm border-neutral-700">
              <ComboboxValue>
                {(values) => (
                  <>
                    {values.map((value: string) => (
                      <ComboboxChip key={value}>{value}</ComboboxChip>
                    ))}
                    <ComboboxChipsInput
                      className="text-white"
                      placeholder={`${Array.isArray(tags) && tags.length > 0 ? '' : 'Select tag(s)'}`}
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

  useEffect(() => {
    // 1. Guard clause: Ensure editor exists and is fully initialized
    if (!editor) return;

    try {
      const rawData = localStorage.getItem('tiptapDraftContent');

      if (!rawData) return;

      const parsedJSON = JSON.parse(rawData);

      // 3. Structural Validation: Ensure it's an object (Tiptap JSON node structure)
      // If it's a string, number, or array, it's either corrupt or a malicious payload.
      if (typeof parsedJSON !== 'object' || parsedJSON === null) {
        console.warn('Invalid draft format encountered. Purging corrupt data.');
        localStorage.removeItem('tiptapDraftContent');
        return;
      }

      // 4. Content Check: Only inject if the editor is currently empty.
      // This prevents the effect from wiping out real-time user changes if the component remounts.
      if (editor.isEmpty) {
        editor.commands.setContent(parsedJSON);
      }
    } catch (error) {
      // Safe Fallback: Catch structural manipulation or malformed strings safely without a UI white-screen
      console.error('Security/Parsing alert: Failed to safely parse local draft:', error);
      localStorage.removeItem('tiptapDraftContent');
    }
  }, [editor]);
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
