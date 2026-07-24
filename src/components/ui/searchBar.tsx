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
	.validator((input: string) => input)
	.handler(async ({ data: input }) => {
		if (!input.trim()) return [];

		const data = await prisma.post.findMany({
			where: {
				title: { contains: input },
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
	const [searchResults, setSearchResults] = useState<any>([]);
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

			// Set loading state ONLY when the debounce delay finishes and the request starts
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

		// Reset search results if input is cleared immediately
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
				variant="ghost"
				onClick={() => setOpen(true)}
				className="h-9 px-2 gap-4 rounded-md font-normal hover:bg-neutral-900 bg-neutral-800 border-neutral-700 text-white hover:text-white hover:opacity-85"
				aria-label={`Open search (${modifierKey}+K)`}
			>
				<Search className="h-4 w-4" />
				<kbd className="pointer-events-none hidden h-5 select-none items-center gap-0.5 rounded border bg-neutral-800 border-neutral-700 text-white px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
					<span>{`${modifierKey} + K`}</span>
				</kbd>
			</Button>

			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent
					showCloseButton={false}
					className="p-0 overflow-hidden rounded-md border-neutral-700 border"
				>
					<Command
						className="shadow-md bg-black rounded-none p-0.5 py-1"
						shouldFilter={false} // Managed via server-side query
					>
						<div className="flex items-center border-b px-3 w-full">
							<CommandInput
								value={inputValue}
								onValueChange={handleInputChange}
								placeholder="Search posts or actions..."
								maxLength={MAX_SEARCH_LENGTH + 5}
								className="flex-1 text-white"
							/>
						</div>

						<CommandList className="px-2">
							{error ? (
								<div className="p-4 text-sm text-destructive font-medium">
									{error}
								</div>
							) : (
								<>
									{isLoading && (
										<div className="w-full flex justify-center items-center gap-2 py-4">
											<Loader2 className="h-4 w-4 animate-spin text-neutral-400" />
											<Label className="text-neutral-300">
												Fetching results...
											</Label>
										</div>
									)}
									{!isLoading && inputValue && searchResults.length === 0 && (
										<CommandEmpty className="py-4 text-center text-sm text-neutral-400">
											No results found for "{inputValue}"
										</CommandEmpty>
									)}

									{/* Dynamic DB Results */}
									{searchResults.length > 0 && (
										<CommandGroup heading="Posts" className="text-white">
											{searchResults.map((post: any) => (
												<CommandItem
													key={post.id}
													onSelect={() => handleNavigation(`/posts/${post.id}`)}
												>
													{post.title}
												</CommandItem>
											))}
										</CommandGroup>
									)}

									{/* Static Quick Navigation Links */}
									<CommandGroup heading="Suggestions" className="text-white">
										<Separator className="bg-neutral-700 mb-2" />
										<CommandItem onSelect={() => handleNavigation("/profile")}>
											View Profile
										</CommandItem>
										<CommandItem onSelect={() => handleNavigation("/settings")}>
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
