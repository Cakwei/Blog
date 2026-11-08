import { beforeEach, describe, expect, it } from "vitest";
import {
	clearLocalDraft,
	formatRelativeDraftTime,
	getDraftStorageKey,
	getLocalDraft,
	saveLocalDraft,
} from "#/lib/draft-autosave";

describe("Tiptap Draft Autosave & Storage Utilities", () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it("generates correct local storage keys for new and existing posts", () => {
		expect(getDraftStorageKey("new")).toBe("blog_draft_new");
		expect(getDraftStorageKey("42")).toBe("blog_draft_42");
		expect(getDraftStorageKey()).toBe("blog_draft_new");
	});

	it("saves and retrieves drafts from localStorage", () => {
		const draftData = {
			title: "Draft Title",
			tags: ["react", "typescript"],
			content: { type: "doc", content: [{ type: "paragraph", text: "Draft body" }] },
		};

		const saved = saveLocalDraft("new", draftData);
		expect(saved.title).toBe("Draft Title");
		expect(saved.tags).toEqual(["react", "typescript"]);
		expect(saved.updatedAt).toBeGreaterThan(0);

		const retrieved = getLocalDraft("new");
		expect(retrieved).not.toBeNull();
		expect(retrieved?.title).toBe("Draft Title");
		expect(retrieved?.tags).toEqual(["react", "typescript"]);
		expect(retrieved?.content).toEqual(draftData.content);
	});

	it("returns null if no draft exists", () => {
		expect(getLocalDraft("non_existent")).toBeNull();
	});

	it("clears local drafts and removes legacy keys", () => {
		saveLocalDraft("new", {
			title: "Draft to clear",
			tags: [],
			content: null,
		});
		localStorage.setItem("tiptapDraftContent", "legacy");

		clearLocalDraft("new");

		expect(getLocalDraft("new")).toBeNull();
		expect(localStorage.getItem("tiptapDraftContent")).toBeNull();
	});

	it("formats relative draft timestamps accurately", () => {
		const now = Date.now();

		expect(formatRelativeDraftTime(now - 10 * 1000)).toBe("just now");
		expect(formatRelativeDraftTime(now - 3 * 60 * 1000)).toBe("3 minutes ago");
		expect(formatRelativeDraftTime(now - 60 * 1000)).toBe("1 minute ago");
		expect(formatRelativeDraftTime(now - 2 * 3600 * 1000)).toBe("2 hours ago");
		expect(formatRelativeDraftTime(now - 1 * 3600 * 1000)).toBe("1 hour ago");
		expect(formatRelativeDraftTime(0)).toBe("recently");
	});
});
