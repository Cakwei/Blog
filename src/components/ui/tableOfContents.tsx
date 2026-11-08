import { ChevronDown, List } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { TocItem } from "#/lib/reading-time";

interface TableOfContentsProps {
	headings: TocItem[];
	variant?: "mobile" | "desktop" | "both";
}

export function TableOfContents({
	headings,
	variant = "both",
}: TableOfContentsProps) {
	const [activeId, setActiveId] = useState<string>(headings[0]?.id ?? "");
	const [isMobileOpen, setIsMobileOpen] = useState(false);
	const desktopNavRef = useRef<HTMLElement | null>(null);

	const computeActiveHeading = useCallback(() => {
		if (headings.length === 0) return;

		const scrollOffset = 128; // Sticky header height + breathing room
		let currentActiveId = headings[0]?.id ?? "";

		for (const heading of headings) {
			const el = document.getElementById(heading.id);
			if (!el) continue;

			const rect = el.getBoundingClientRect();
			if (rect.top <= scrollOffset) {
				currentActiveId = heading.id;
			} else {
				break;
			}
		}

		// If scrolled to the very bottom of the page, highlight the last available heading
		const isAtBottom =
			window.innerHeight + Math.round(window.scrollY) >=
			document.documentElement.scrollHeight - 32;
		if (isAtBottom && headings.length > 0) {
			for (let i = headings.length - 1; i >= 0; i--) {
				if (document.getElementById(headings[i].id)) {
					currentActiveId = headings[i].id;
					break;
				}
			}
		}

		setActiveId((prev) => (prev !== currentActiveId ? currentActiveId : prev));
	}, [headings]);

	useEffect(() => {
		if (headings.length === 0) return;

		let rafId: number | null = null;

		const handleScroll = () => {
			if (rafId !== null) return;
			rafId = window.requestAnimationFrame(() => {
				computeActiveHeading();
				rafId = null;
			});
		};

		// Initial computation & delayed check after dangerouslySetInnerHTML renders
		computeActiveHeading();
		const initTimer = window.setTimeout(computeActiveHeading, 100);

		window.addEventListener("scroll", handleScroll, { passive: true });
		window.addEventListener("resize", handleScroll, { passive: true });

		return () => {
			window.clearTimeout(initTimer);
			if (rafId !== null) window.cancelAnimationFrame(rafId);
			window.removeEventListener("scroll", handleScroll);
			window.removeEventListener("resize", handleScroll);
		};
	}, [headings, computeActiveHeading]);

	// Auto-scroll the desktop TOC nav container so the active item stays in view
	useEffect(() => {
		const nav = desktopNavRef.current;
		if (!nav || !activeId) return;

		const safeId =
			typeof CSS !== "undefined" && typeof CSS.escape === "function"
				? CSS.escape(activeId)
				: activeId.replace(/"/g, '\\"');

		const activeEl = nav.querySelector<HTMLElement>(`[data-toc-id="${safeId}"]`);
		if (!activeEl) return;

		const navRect = nav.getBoundingClientRect();
		const elRect = activeEl.getBoundingClientRect();
		const relativeTop = elRect.top - navRect.top + nav.scrollTop;
		const targetScrollTop =
			relativeTop - nav.clientHeight / 2 + activeEl.clientHeight / 2;

		if (typeof nav.scrollTo === "function") {
			nav.scrollTo({
				top: Math.max(0, targetScrollTop),
				behavior: "smooth",
			});
		}
	}, [activeId]);

	if (headings.length === 0) return null;

	const handleScrollTo = (e: React.MouseEvent, id: string) => {
		e.preventDefault();
		const target = document.getElementById(id);
		if (target) {
			target.scrollIntoView({ behavior: "smooth", block: "start" });
			setActiveId(id);
			setIsMobileOpen(false);
			window.history.replaceState(null, "", `#${id}`);
		}
	};

	const showMobile = variant === "mobile" || variant === "both";
	const showDesktop = variant === "desktop" || variant === "both";

	return (
		<>
			{/* MOBILE ACCORDION (Visible on screens < 1024px) */}
			{showMobile && (
				<div className="lg:hidden my-6 rounded-xl border border-(--border) bg-(--bg-secondary)/60 overflow-hidden text-xs">
					<button
						type="button"
						onClick={() => setIsMobileOpen(!isMobileOpen)}
						className="w-full flex items-center justify-between p-3 text-(--text) font-semibold hover:bg-(--bg-secondary) transition-colors cursor-pointer"
					>
						<span className="flex items-center gap-2">
							<List className="w-3.5 h-3.5 text-(--text-muted)" />
							<span>Table of Contents ({headings.length})</span>
						</span>
						<ChevronDown
							className={`w-4 h-4 text-(--text-muted) transition-transform duration-200 ${
								isMobileOpen ? "rotate-180" : ""
							}`}
						/>
					</button>

					{isMobileOpen && (
						<nav className="p-3 pt-1 border-t border-(--border)/60 space-y-1.5 bg-(--bg)">
							{headings.map((item) => (
								<a
									key={item.id}
									href={`#${item.id}`}
									onClick={(e) => handleScrollTo(e, item.id)}
									className={`block py-1 transition-colors ${
										item.level === 3 ? "pl-4 text-[11px]" : "font-medium"
									} ${
										activeId === item.id
											? "text-(--link) font-semibold"
											: "text-(--text-secondary) hover:text-(--text)"
									}`}
								>
									{item.text}
								</a>
							))}
						</nav>
					)}
				</div>
			)}

			{/* DESKTOP STICKY SIDEBAR (Visible on screens >= 1024px) */}
			{showDesktop && (
				<aside className="hidden lg:block lg:sticky lg:top-24 lg:self-start w-60 xl:w-64 shrink-0 text-xs select-none">
					<div className="space-y-3 p-4 rounded-xl border border-(--border) bg-(--bg-secondary)/40 backdrop-blur-md">
						<div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-(--text-muted)">
							<List className="w-3.5 h-3.5" />
							<span>On This Page</span>
						</div>

						<nav
							ref={desktopNavRef}
							className="space-y-1 max-h-[calc(100vh-10rem)] overflow-y-auto pr-1 scroll-smooth"
						>
							{headings.map((item) => {
								const isActive = activeId === item.id;
								return (
									<a
										key={item.id}
										data-toc-id={item.id}
										href={`#${item.id}`}
										onClick={(e) => handleScrollTo(e, item.id)}
										className={`group flex items-start py-1.5 transition-all rounded-md px-2 ${
											item.level === 3 ? "ml-2.5 text-[11px]" : "font-medium"
										} ${
											isActive
												? "bg-(--bg) text-(--link) font-semibold shadow-xs"
												: "text-(--text-secondary) hover:text-(--text) hover:bg-(--bg)/50"
										}`}
									>
										<span
											className={`inline-block w-1.5 h-1.5 rounded-full mr-2 mt-1.5 shrink-0 transition-all duration-200 ${
												isActive
													? "bg-(--link) scale-125"
													: "bg-transparent group-hover:bg-(--border)"
											}`}
										/>
										<span className="truncate">{item.text}</span>
									</a>
								);
							})}
						</nav>
					</div>
				</aside>
			)}
		</>
	);
}
