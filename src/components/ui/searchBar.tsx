import { useNavigate } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import DOMPurify from "dompurify";
import debounce from "lodash.debounce";
import {
	ArrowUpRight,
	Compass,
	FileText,
	Loader2,
	Search,
	Terminal,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { prisma } from "#/db";
import { logger } from "#/lib/utils";
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import { Dialog, DialogContent } from "@/components/ui/dialog";

const MAX_SEARCH_LENGTH = 50;
const DEBOUNCE_DELAY = 300;

const searchDatabaseFn = createServerFn()
	.validator((input: unknown) => {
		if (typeof input !== "string")
			throw new Error("Invalid search input format");
		return input.trim();
	})
	.handler(async ({ data: input }) => {
		if (!input || input.length === 0) return [];

		const safeQuery = input.slice(0, MAX_SEARCH_LENGTH);

		const data = await prisma.post.findMany({
			where: {
				title: { contains: safeQuery },
			},
			take: 5,
			orderBy: { date: "desc" },
		});
		return data;
	});

export function SearchDialog() {
	const navigate = useNavigate();
	const [open, setOpen] = useState(false);
	const [inputValue, setInputValue] = useState("");

	const [searchResults, setSearchResults] = useState<any[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const [modifierKey, setModifierKey] = useState("Ctrl");

	useEffect(() => {
		const isMac =
			typeof window !== "undefined" &&
			/Mac|iPod|iPhone|iPad/.test(window.navigator.userAgent);

		setModifierKey(isMac ? "⌘" : "Ctrl");

		const down = (e: KeyboardEvent) => {
			if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
				e.preventDefault();
				setOpen((o) => !o);
			}
		};

		window.addEventListener("keydown", down);
		return () => window.removeEventListener("keydown", down);
	}, []);

	const debouncedSearch = useCallback(
		debounce(async (rawQuery: string) => {
			const cleanQuery = rawQuery.trim();

			if (!cleanQuery) {
				setSearchResults([]);
				setIsLoading(false);
				return;
			}

			if (cleanQuery.length > MAX_SEARCH_LENGTH) {
				setError(`Search must be ${MAX_SEARCH_LENGTH} characters or less.`);
				setIsLoading(false);
				return;
			}

			setError(null);
			setIsLoading(true);

			try {
				const sanitized = DOMPurify.sanitize(cleanQuery);
				const results = await searchDatabaseFn({ data: sanitized });
				setSearchResults(results);
			} catch (err) {
				logger("error", "Failed to fetch search results:", err);
				setError("An error occurred while fetching results.");
			} finally {
				setIsLoading(false);
			}
		}, DEBOUNCE_DELAY),
		[],
	);

	useEffect(() => {
		return () => debouncedSearch.cancel();
	}, [debouncedSearch]);

	const handleInputChange = (value: string) => {
		setInputValue(value);

		if (value.length > MAX_SEARCH_LENGTH) {
			setError(`Search must be ${MAX_SEARCH_LENGTH} characters or less.`);
			setIsLoading(false);
			debouncedSearch.cancel();
			return;
		}

		setError(null);

		if (!value.trim()) {
			setIsLoading(false);
			setSearchResults([]);
			debouncedSearch.cancel();
			return;
		}

		debouncedSearch(value);
	};

	const handleNavigation = (path: string) => {
		setOpen(false);
		navigate({ to: path });
	};

	return (
		<>
			{/* Sleek Minimalist Terminal Trigger */}
			<Button
				onClick={() => setOpen(true)}
				variant="ghost"
				className="h-9 px-3 gap-3 rounded-lg font-mono text-xs text-(--text-secondary) hover:text-(--text) bg-(--bg-secondary)/40 hover:bg-(--bg-secondary) border border-(--border) transition-all group"
				aria-label={`Open search (${modifierKey}+K)`}
			>
				<Terminal className="h-3.5 w-3.5 text-(--link)" />
				<span className="hidden sm:inline">search...</span>
				<kbd className="h-5 px-1.5 rounded bg-(--bg) border border-(--border) text-[10px] font-bold flex items-center shadow-none text-(--text-secondary)">
					{modifierKey}K
				</kbd>
			</Button>

			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent
					showCloseButton={false}
					className="p-0 overflow-hidden rounded-2xl border border-(--border) bg-(--bg) shadow-2xl max-w-lg text-(--text)"
				>
					<Command
						className="shadow-none bg-transparent rounded-none p-0"
						shouldFilter={false}
					>
						{/* Immersive Spotlight Header */}
						<div className="flex items-center px-4 py-3 bg-(--bg-secondary)/60 border-b border-(--border)">
							<Search className="h-4 w-4 text-(--link) mr-3 shrink-0" />
							<CommandInput
								value={inputValue}
								onValueChange={handleInputChange}
								placeholder="Type to search archive..."
								maxLength={MAX_SEARCH_LENGTH + 5}
								className="flex-1 text-(--text) placeholder:text-(--text-secondary) bg-transparent border-none outline-none text-sm font-medium"
							/>
							<div className="text-[10px] font-mono text-(--text-secondary) bg-(--bg) px-2 py-0.5 rounded border border-(--border)">
								ESC
							</div>
						</div>

						<CommandList className="p-3 max-h-[340px] overflow-y-auto space-y-1">
							{error ? (
								<div className="p-4 text-xs text-(--error) font-medium bg-(--error)/10 rounded-xl">
									{error}
								</div>
							) : (
								<>
									{isLoading && (
										<div className="w-full flex justify-center items-center gap-2 py-8 text-xs text-(--text-secondary)">
											<Loader2 className="h-4 w-4 animate-spin text-(--link)" />
											<span>Querying index...</span>
										</div>
									)}

									{!isLoading && inputValue && searchResults.length === 0 && (
										<CommandEmpty className="py-10 text-center text-xs text-(--text-secondary)">
											No matches found for{" "}
											<span className="text-(--text) font-semibold">
												"{inputValue}"
											</span>
										</CommandEmpty>
									)}

									{/* Dynamic Posts Match */}
									{searchResults.length > 0 && (
										<CommandGroup
											heading={
												<span className="text-[10px] font-mono uppercase tracking-widest text-(--text-secondary) px-2 py-1">
													Matching Posts
												</span>
											}
											className="space-y-1"
										>
											{searchResults.map((post: any) => (
												<CommandItem
													key={post.id}
													onSelect={() => handleNavigation(`/posts/${post.id}`)}
													className="group flex items-center justify-between text-(--text) bg-transparent aria-selected:bg-(--link)/10 aria-selected:text-(--link) rounded-xl px-3 py-2.5 cursor-pointer transition-all"
												>
													<div className="flex items-center gap-2.5 truncate">
														<FileText className="w-3.5 h-3.5 text-(--link) shrink-0" />
														<span className="text-xs font-medium truncate">
															{post.title}
														</span>
													</div>
													<ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-(--link) shrink-0" />
												</CommandItem>
											))}
										</CommandGroup>
									)}

									{/* Quick Actions List */}
									<CommandGroup
										heading={
											<span className="text-[10px] font-mono uppercase tracking-widest text-(--text-secondary) px-2 py-1 mt-2">
												Quick Links
											</span>
										}
										className="space-y-1"
									>
										<CommandItem
											onSelect={() => handleNavigation("/articles")}
											className="group flex items-center justify-between text-(--text) bg-transparent aria-selected:bg-(--link)/10 aria-selected:text-(--link) rounded-xl px-3 py-2.5 cursor-pointer transition-all"
										>
											<div className="flex items-center gap-2.5">
												<Compass className="w-3.5 h-3.5 text-(--text-secondary)" />
												<span className="text-xs font-medium">
													Browse All Articles
												</span>
											</div>
											<span className="text-[10px] font-mono text-(--text-secondary)">
												/articles
											</span>
										</CommandItem>
									</CommandGroup>
								</>
							)}
						</CommandList>
					</Command>
				</DialogContent>
			</Dialog>
		</>
	);
}
