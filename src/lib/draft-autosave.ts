import { createServerFn } from "@tanstack/react-start";
import { redis } from "#/lib/redis";
import { getSessionFn } from "#/lib/utils";

/**
 * Tiptap Autosave & Draft Recovery
 * Dual-Tier Architecture:
 * - Tier 1: Instant client-side localStorage writes (debounced 1.5s)
 * - Tier 2: Background cloud Redis synchronization (debounced 20s) with 30-day TTL
 */

export interface PostDraft {
	postId: string;
	title: string;
	tags: string[];
	content: any; // Tiptap JSONContent
	updatedAt: number;
}

/**
 * Formats key for localStorage
 */
export function getDraftStorageKey(postId = "new"): string {
	return `blog_draft_${postId}`;
}

/**
 * Saves draft to browser localStorage
 */
export function saveLocalDraft(
	postId = "new",
	draft: { title: string; tags: string[]; content: any },
): PostDraft {
	const fullDraft: PostDraft = {
		postId,
		title: draft.title || "",
		tags: Array.isArray(draft.tags) ? draft.tags : [],
		content: draft.content || null,
		updatedAt: Date.now(),
	};

	if (typeof window !== "undefined" && window.localStorage) {
		try {
			localStorage.setItem(getDraftStorageKey(postId), JSON.stringify(fullDraft));
		} catch {
			// Ignore quota exceeded or storage blocked errors
		}
	}

	return fullDraft;
}

/**
 * Retrieves draft from browser localStorage
 */
export function getLocalDraft(postId = "new"): PostDraft | null {
	if (typeof window === "undefined" || !window.localStorage) return null;
	try {
		const raw = localStorage.getItem(getDraftStorageKey(postId));
		if (!raw) return null;
		const parsed = JSON.parse(raw);
		if (!parsed || typeof parsed !== "object") return null;
		return parsed as PostDraft;
	} catch {
		return null;
	}
}

/**
 * Clears local draft from localStorage
 */
export function clearLocalDraft(postId = "new"): void {
	if (typeof window === "undefined" || !window.localStorage) return;
	try {
		localStorage.removeItem(getDraftStorageKey(postId));
		// Clean legacy keys if any
		if (postId === "new") {
			localStorage.removeItem("tiptapDraftContent");
		} else {
			localStorage.removeItem(`tiptapDraftContent-${postId}`);
		}
	} catch {
		// Ignore
	}
}

/**
 * Formats relative timestamp for user-facing UI
 */
export function formatRelativeDraftTime(timestamp: number): string {
	if (!timestamp || isNaN(timestamp)) return "recently";
	const elapsedSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
	if (elapsedSeconds < 45) return "just now";
	const elapsedMinutes = Math.floor(elapsedSeconds / 60);
	if (elapsedMinutes < 60) {
		return `${elapsedMinutes} minute${elapsedMinutes === 1 ? "" : "s"} ago`;
	}
	const elapsedHours = Math.floor(elapsedMinutes / 60);
	if (elapsedHours < 24) {
		return `${elapsedHours} hour${elapsedHours === 1 ? "" : "s"} ago`;
	}
	return new Date(timestamp).toLocaleDateString(undefined, {
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

/**
 * Tier 2: Synchronize draft to Redis cloud store with 30-day TTL
 */
export const saveRedisDraftServerFn = createServerFn({ method: "POST" })
	.validator(
		(data: {
			postId: string;
			title: string;
			tags: string[];
			content: any;
		}) => data,
	)
	.handler(async ({ data }) => {
		const session = await getSessionFn();
		if (!session?.user?.id) {
			return { success: false, message: "Unauthorized" };
		}

		const draft: PostDraft = {
			postId: data.postId || "new",
			title: data.title || "",
			tags: data.tags || [],
			content: data.content || null,
			updatedAt: Date.now(),
		};

		const redisKey = `draft:${session.user.id}:${draft.postId}`;
		await redis.set(redisKey, draft, 2592000); // 30 days in seconds

		return { success: true, draft };
	});

/**
 * Tier 2: Retrieve draft from Redis cloud store
 */
export const getRedisDraftServerFn = createServerFn({ method: "GET" })
	.validator((postId: string) => postId || "new")
	.handler(async ({ data: postId }) => {
		const session = await getSessionFn();
		if (!session?.user?.id) return null;

		const redisKey = `draft:${session.user.id}:${postId}`;
		return await redis.get<PostDraft>(redisKey);
	});

/**
 * Tier 2: Delete draft from Redis cloud store
 */
export const deleteRedisDraftServerFn = createServerFn({ method: "POST" })
	.validator((postId: string) => postId || "new")
	.handler(async ({ data: postId }) => {
		const session = await getSessionFn();
		if (!session?.user?.id) return { success: false };

		const redisKey = `draft:${session.user.id}:${postId}`;
		await redis.invalidate(redisKey);
		return { success: true };
	});
