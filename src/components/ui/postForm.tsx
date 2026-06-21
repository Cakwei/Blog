import { useState } from "react";
import { MOCK_POSTS } from "#/lib/const";
import type { PostFormProps } from "#/lib/types";

export function PostForm({
	initialPost,
	onSubmit,
	onDelete,
	submitLabel,
}: PostFormProps) {
	const [title, setTitle] = useState(initialPost?.title ?? "");
	const [excerpt, setExcerpt] = useState(initialPost?.excerpt ?? "");
	const [content, setContent] = useState(initialPost?.content ?? "");
	const [image, setImage] = useState(initialPost?.image ?? "");
	const [category, setCategory] = useState(
		initialPost?.category ?? MOCK_POSTS[0],
	);
	const [status, setStatus] = useState<"draft" | "published">(
		initialPost?.status ?? "draft",
	);
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [confirmingDelete, setConfirmingDelete] = useState(false);

	const isValid = title.trim().length > 0 && excerpt.trim().length > 0;

	async function handleSubmit(
		e: React.FormEvent,
		nextStatus: "draft" | "published",
	) {
		e.preventDefault();
		if (!isValid) {
			setError("Add a title and excerpt before saving.");
			return;
		}
		setError(null);
		setIsSaving(true);
		try {
			await onSubmit({
				title: title.trim(),
				excerpt: excerpt.trim(),
				content,
				image: image.trim(),
				category,
				status: nextStatus,
			});
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: "Couldn't save the post. Try again.",
			);
		} finally {
			setIsSaving(false);
		}
	}

	async function handleDelete() {
		if (!onDelete) return;
		setIsSaving(true);
		try {
			await onDelete();
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: "Couldn't delete the post. Try again.",
			);
			setIsSaving(false);
		}
	}

	return (
		<div className="grid lg:grid-cols-[1fr_380px] gap-8 items-start">
			{/* Form */}
			<form className="space-y-6">
				<div>
					<span className="block text-sm font-semibold text-gray-700 mb-1.5">
						Title
					</span>
					<input
						type="text"
						value={title}
						onChange={(e) => setTitle(e.target.value)}
						placeholder="Give your post a title"
						className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-lg font-bold transition-colors"
					/>
				</div>

				<div>
					<span className="block text-sm font-semibold text-gray-700 mb-1.5">
						Excerpt
					</span>
					<textarea
						value={excerpt}
						onChange={(e) => setExcerpt(e.target.value)}
						placeholder="A short summary shown on the homepage and article cards"
						rows={2}
						className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none resize-none transition-colors"
					/>
				</div>

				<div className="grid sm:grid-cols-2 gap-4">
					<div>
						<span className="block text-sm font-semibold text-gray-700 mb-1.5">
							Category
						</span>
						<select
							value={category}
							onChange={(e) => setCategory(e.target.value)}
							className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-colors bg-white"
						>
							{MOCK_POSTS.map((c) => (
								<option key={c.id} value={c.category}>
									{c.category}
								</option>
							))}
						</select>
					</div>
					<div>
						<span className="block text-sm font-semibold text-gray-700 mb-1.5">
							Cover image URL
						</span>
						<input
							type="text"
							value={image}
							onChange={(e) => setImage(e.target.value)}
							placeholder="https://..."
							className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-colors"
						/>
					</div>
				</div>

				<div>
					<span className="block text-sm font-semibold text-gray-700 mb-1.5">
						Content
					</span>
					<textarea
						value={content}
						onChange={(e) => setContent(e.target.value)}
						placeholder="Write your post..."
						rows={16}
						className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none font-mono text-sm leading-relaxed transition-colors"
					/>
				</div>

				{error && (
					<p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
						{error}
					</p>
				)}

				<div className="flex items-center gap-3 pt-2">
					<button
						type="button"
						disabled={isSaving || !isValid}
						onClick={(e) => handleSubmit(e, "published")}
						className="px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
					>
						{isSaving ? "Saving..." : submitLabel}
					</button>
					<button
						type="button"
						disabled={isSaving || !isValid}
						onClick={(e) => handleSubmit(e, "draft")}
						className="px-6 py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
					>
						Save as draft
					</button>

					{onDelete && (
						<div className="ml-auto">
							{confirmingDelete ? (
								<div className="flex items-center gap-2">
									<span className="text-sm text-gray-500">
										Delete this post?
									</span>
									<button
										type="button"
										onClick={handleDelete}
										disabled={isSaving}
										className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors"
									>
										Confirm
									</button>
									<button
										type="button"
										onClick={() => setConfirmingDelete(false)}
										className="px-4 py-2 rounded-lg text-gray-500 text-sm font-semibold hover:bg-gray-50 transition-colors"
									>
										Cancel
									</button>
								</div>
							) : (
								<button
									type="button"
									onClick={() => setConfirmingDelete(true)}
									className="px-4 py-2 text-sm text-red-600 font-semibold hover:bg-red-50 rounded-lg transition-colors"
								>
									Delete post
								</button>
							)}
						</div>
					)}
				</div>
			</form>

			{/* Live preview — mirrors the homepage card */}
			<div className="lg:sticky lg:top-8">
				<span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 block">
					Preview
				</span>
				<article className="rounded-xl border border-gray-100 overflow-hidden">
					<div className="overflow-hidden aspect-[16/10] bg-gray-100">
						{image ? (
							<img
								src={image}
								alt={title}
								className="w-full h-full object-cover"
								onError={(e) => {
									(e.target as HTMLImageElement).style.display = "none";
								}}
							/>
						) : (
							<div className="w-full h-full flex items-center justify-center text-gray-300 text-sm">
								No cover image
							</div>
						)}
					</div>
					<div className="p-4">
						<span className="text-xs font-bold text-blue-500 uppercase">
							{category}
						</span>
						<h3 className="text-xl font-bold mt-2 mb-2">
							{title || "Untitled post"}
						</h3>
						<p className="text-gray-600 line-clamp-2 mb-3">
							{excerpt || "Your excerpt will appear here."}
						</p>
						<span
							className={`inline-block text-xs font-semibold px-2 py-1 rounded-full ${
								status === "published"
									? "bg-green-50 text-green-700"
									: "bg-amber-50 text-amber-700"
							}`}
						>
							{status === "published" ? "Published" : "Draft"}
						</span>
					</div>
				</article>
			</div>
		</div>
	);
}
