import { Check, Clock, History, Loader2, Trash2 } from "lucide-react";
import { formatRelativeDraftTime, type PostDraft } from "#/lib/draft-autosave";
import { Button } from "./button";

interface DraftRecoveryBannerProps {
	draft: PostDraft | null;
	onRestore: () => void;
	onDiscard: () => void;
}

/**
 * Minimalist recovery notification banner shown when an unsaved draft is detected
 */
export function DraftRecoveryBanner({
	draft,
	onRestore,
	onDiscard,
}: DraftRecoveryBannerProps) {
	if (!draft) return null;

	const relativeTime = formatRelativeDraftTime(draft.updatedAt);

	return (
		<aside
			data-testid="draftRecoveryBanner"
			aria-label="Unsaved draft recovery"
			className="rounded-2xl border border-(--border) bg-(--bg-secondary)/90 backdrop-blur-md p-4 sm:p-5 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all"
		>
			<div className="flex items-start gap-3.5">
				<div className="w-8 h-8 rounded-full bg-(--link)/10 text-(--link) flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
					<History className="w-4 h-4" />
				</div>
				<div className="space-y-0.5">
					<div className="flex items-center gap-2">
						<span className="text-xs font-bold text-(--text)">
							Unsaved Draft Detected
						</span>
						<span className="text-[10px] px-2 py-0.5 rounded-full bg-(--bg) border border-(--border) text-(--text-secondary)">
							{relativeTime}
						</span>
					</div>
					<p className="text-xs text-(--text-secondary) leading-relaxed">
						{draft.title
							? `Found draft for "${draft.title}". Would you like to restore your work or start fresh?`
							: "You have an unsaved draft from a previous editing session. Would you like to restore it?"}
					</p>
				</div>
			</div>

			<div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onClick={onDiscard}
					className="h-8 px-3 text-xs text-(--text-secondary) hover:text-red-400 hover:bg-red-500/10 rounded-lg cursor-pointer transition-colors"
				>
					<Trash2 className="w-3.5 h-3.5 mr-1" />
					Discard
				</Button>
				<Button
					type="button"
					size="sm"
					onClick={onRestore}
					className="h-8 px-4 text-xs font-semibold bg-(--link) hover:bg-(--link)/80 text-(--bg) rounded-lg shadow-sm cursor-pointer transition-all"
				>
					Restore Draft
				</Button>
			</div>
		</aside>
	);
}

interface DraftAutosaveStatusProps {
	status: "idle" | "saving" | "saved" | "unsaved";
	lastSavedAt: number | null;
}

/**
 * Minimalist autosave status indicator for the editor toolbar
 */
export function DraftAutosaveStatus({
	status,
	lastSavedAt,
}: DraftAutosaveStatusProps) {
	if (status === "saving") {
		return (
			<div
				data-testid="draftStatusSaving"
				className="inline-flex items-center gap-1.5 text-[11px] text-(--text-secondary)"
			>
				<Loader2 className="w-3 h-3 animate-spin text-(--link)" />
				<span>Saving draft...</span>
			</div>
		);
	}

	if (status === "saved" && lastSavedAt) {
		return (
			<div
				data-testid="draftStatusSaved"
				className="inline-flex items-center gap-1.5 text-[11px] text-(--text-secondary)"
			>
				<Check className="w-3 h-3 text-emerald-500" />
				<span>Saved {formatRelativeDraftTime(lastSavedAt)}</span>
			</div>
		);
	}

	if (status === "unsaved") {
		return (
			<div
				data-testid="draftStatusUnsaved"
				className="inline-flex items-center gap-1.5 text-[11px] text-(--text-secondary)"
			>
				<span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
				<span>Unsaved changes</span>
			</div>
		);
	}

	return (
		<div className="inline-flex items-center gap-1.5 text-[11px] text-(--text-secondary)">
			<Clock className="w-3 h-3 text-(--text-muted)" />
			<span>Autosave active</span>
		</div>
	);
}
