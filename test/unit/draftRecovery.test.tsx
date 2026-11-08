import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
	DraftAutosaveStatus,
	DraftRecoveryBanner,
} from "#/components/ui/draftRecovery";
import type { PostDraft } from "#/lib/draft-autosave";

describe("DraftRecoveryBanner & DraftAutosaveStatus UI Components", () => {
	it("renders null if no draft is present", () => {
		const { container } = render(
			<DraftRecoveryBanner
				draft={null}
				onRestore={vi.fn()}
				onDiscard={vi.fn()}
			/>,
		);
		expect(container.firstChild).toBeNull();
	});

	it("renders recovery banner with draft information and triggers callbacks", () => {
		const onRestore = vi.fn();
		const onDiscard = vi.fn();

		const draft: PostDraft = {
			postId: "new",
			title: "Unsaved Masterpiece",
			tags: ["tech"],
			content: { type: "doc" },
			updatedAt: Date.now() - 5 * 60 * 1000, // 5 min ago
		};

		render(
			<DraftRecoveryBanner
				draft={draft}
				onRestore={onRestore}
				onDiscard={onDiscard}
			/>,
		);

		expect(screen.getByTestId("draftRecoveryBanner")).toBeDefined();
		expect(screen.getByText("Unsaved Draft Detected")).toBeDefined();
		expect(screen.getByText("5 minutes ago")).toBeDefined();
		expect(
			screen.getByText(/Found draft for "Unsaved Masterpiece"/),
		).toBeDefined();

		// Test restore action
		fireEvent.click(screen.getByRole("button", { name: /restore draft/i }));
		expect(onRestore).toHaveBeenCalledTimes(1);

		// Test discard action
		fireEvent.click(screen.getByRole("button", { name: /discard/i }));
		expect(onDiscard).toHaveBeenCalledTimes(1);
	});

	it("renders saving autosave status", () => {
		render(<DraftAutosaveStatus status="saving" lastSavedAt={null} />);
		expect(screen.getByTestId("draftStatusSaving")).toBeDefined();
		expect(screen.getByText("Saving draft...")).toBeDefined();
	});

	it("renders saved autosave status with time", () => {
		const now = Date.now();
		render(<DraftAutosaveStatus status="saved" lastSavedAt={now} />);
		expect(screen.getByTestId("draftStatusSaved")).toBeDefined();
		expect(screen.getByText(/Saved just now/)).toBeDefined();
	});

	it("renders unsaved changes autosave status", () => {
		render(<DraftAutosaveStatus status="unsaved" lastSavedAt={null} />);
		expect(screen.getByTestId("draftStatusUnsaved")).toBeDefined();
		expect(screen.getByText("Unsaved changes")).toBeDefined();
	});
});
