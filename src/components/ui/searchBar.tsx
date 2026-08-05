import { useNavigate } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import DOMPurify from "dompurify";
import debounce from "lodash.debounce";
import { Loader2, Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { prisma } from "#/db";
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
import { Label } from "./label";
import { Separator } from "./separator";

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

		// Strict boundary check on server as well
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

	// States for search results and async feedback
	const [searchResults, setSearchResults] = useState<any[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const [modifierKey, setModifierKey] = useState("Ctrl");

	// Handle OS shortcut detection
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

	// Debounced search query & server invocation
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
				console.error("Failed to fetch search results:", err);
				setError("An error occurred while fetching results.");
			} finally {
				setIsLoading(false);
			}
		}, DEBOUNCE_DELAY),
		[],
	);

	// Clean up debounced function on unmount
	useEffect(() => {
		return () => debouncedSearch.cancel();
	}, [debouncedSearch]);

	// Input Handler triggers debounce without triggering immediate loading UI
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
			<Button
				onClick={() => setOpen(true)}
				className="h-9 px-2 gap-4 rounded-md font-normal hover:bg-(--bg)/80 bg-(--bg) border border-(--border) text-(--text) hover:text-(--text) transition-colors"
				aria-label={`Open search (${modifierKey}+K)`}
			>
				<Search className="h-4 w-4 text-(--text-secondary)" />
				<kbd className="pointer-events-none hidden h-5 select-none items-center gap-0.5 rounded border bg-(--bg) border-(--border) text-(--text-secondary) px-1.5 font-mono text-[10px] font-medium sm:flex">
					<span>{`${modifierKey} + K`}</span>
				</kbd>
			</Button>

			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent
					showCloseButton={false}
					className="p-0 overflow-hidden rounded-xl border-(--border) border bg-(--bg-secondary) shadow-2xl"
				>
					<Command
						className="shadow-none bg-transparent rounded-none p-1"
						shouldFilter={false}
					>
						<div className="flex items-center border-b border-(--border) px-3 w-full bg-(--bg) rounded-md">
							<Search className="h-4 w-4 text-(--text-secondary) mr-2 flex-shrink-0" />
							<CommandInput
								value={inputValue}
								onValueChange={handleInputChange}
								placeholder="Search posts or actions..."
								maxLength={MAX_SEARCH_LENGTH + 5}
								className="flex-1 text-(--text) placeholder:text-(--text-secondary) bg-transparent border-none outline-none py-3"
							/>
						</div>

						<CommandList className="p-2">
							{error ? (
								<div className="p-4 text-sm text-(--error) font-medium">
									{error}
								</div>
							) : (
								<>
									{isLoading && (
										<div className="w-full flex justify-center items-center gap-2 py-6">
											<Loader2 className="h-4 w-4 animate-spin text-(--link)" />
											<Label className="text-(--text-secondary) text-sm font-normal">
												Fetching results...
											</Label>
										</div>
									)}
									{!isLoading && inputValue && searchResults.length === 0 && (
										<CommandEmpty className="py-6 text-center text-sm text-(--text-secondary)">
											No results found for "{inputValue}"
										</CommandEmpty>
									)}

									{/* Dynamic DB Results */}
									{searchResults.length > 0 && (
										<CommandGroup
											heading="Posts"
											className="text-(--text-secondary) text-xs font-semibold px-2"
										>
											{searchResults.map((post: any) => (
												<CommandItem
													key={post.id}
													onSelect={() => handleNavigation(`/posts/${post.id}`)}
													className="text-(--text) aria-selected:bg-(--bg) aria-selected:text-(--link) rounded-md px-3 py-2.5 my-0.5 cursor-pointer transition-colors"
												>
													{post.title}
												</CommandItem>
											))}
										</CommandGroup>
									)}

									{/* Static Quick Navigation Links */}
									<CommandGroup
										heading="Suggestions"
										className="text-(--text-secondary) text-xs font-semibold px-2 mt-2"
									>
										<Separator className="bg-(--border) my-2" />
										<CommandItem
											onSelect={() => handleNavigation("/profile")}
											className="text-(--text) hover:bg-(--bg) aria-selected:bg-(--bg) aria-selected:text-(--link) rounded-lg px-3 py-2.5 my-0.5 cursor-pointer transition-colors"
										>
											View Profile
										</CommandItem>
										<CommandItem
											onSelect={() => handleNavigation("/settings")}
											className="text-(--text) hover:bg-(--bg) aria-selected:bg-(--bg) aria-selected:text-(--link) rounded-lg px-3 py-2.5 my-0.5 cursor-pointer transition-colors"
										>
											Settings
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
