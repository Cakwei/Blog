"use client";

import { useNavigate } from "@tanstack/react-router";
import DOMPurify from "dompurify";
import debounce from "lodash.debounce";
import { Search } from "lucide-react";
import * as React from "react";
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

export function SearchDialog() {
	const navigate = useNavigate();
	const [open, setOpen] = React.useState(false);
	const [inputValue, setInputValue] = React.useState("");
	const [validatedQuery, setValidatedQuery] = React.useState("");
	const [error, setError] = React.useState<string | null>(null);

	// Safe default modifier for Server-Side Rendering (SSR)
	const [modifierKey, setModifierKey] = React.useState("Ctrl");

	// Handle OS detection and global shortcuts safely on the client
	React.useEffect(() => {
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

	// Input sanitization and validation
	const debouncedValidate = React.useCallback(
		debounce((value: string) => {
			if (value.length > MAX_SEARCH_LENGTH) {
				setError(`Search must be ${MAX_SEARCH_LENGTH} characters or less.`);
				return;
			}
			setError(null);
			setValidatedQuery(DOMPurify.sanitize(value));
		}, DEBOUNCE_DELAY),
		[],
	);

	React.useEffect(() => {
		return () => debouncedValidate.cancel();
	}, [debouncedValidate]);

	const handleInputChange = (value: string) => {
		setInputValue(value);
		debouncedValidate(value);
	};

	// Helper function to handle navigation changes safely
	const handleNavigation = (path: string) => {
		setOpen(false);
		navigate({ to: path });
	};

	return (
		<>
			{/* KEYBIND VISIBLE NEXT TO ICON - BEFORE DIALOG OPENS */}
			<Button
				variant="ghost"
				onClick={() => setOpen(true)}
				className="h-9 px-2 gap-4 rounded-md font-normal hover:bg-neutral-900 bg-neutral-800 border-neutral-700 text-white hover:text-white hover:opacity-85"
				aria-label={`Open search (${modifierKey}+K)`}
			>
				<Search className="h-4 w-4" />
				<kbd className="pointer-events-none hidden h-5 select-none items-center gap-0.5 rounded border bg-neutral-800 border-neutral-700  text-white px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
					<span>{modifierKey}</span>K
				</kbd>
			</Button>

			{/* SEARCH DIALOG */}
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent
					showCloseButton={false}
					className="p-0 overflow-hidden rounded-md border-neutral-700 border"
				>
					<Command
						className="shadow-md bg-black rounded-none p-0.5 py-1"
						shouldFilter={!error}
					>
						<div className="flex items-center border-b">
							{/* Clean input header with the kbd element entirely removed */}
							<CommandInput
								value={inputValue}
								onValueChange={handleInputChange}
								placeholder="Search actions or links..."
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
									<CommandEmpty>
										No results found for "{validatedQuery}".
									</CommandEmpty>
									<CommandGroup heading="Suggestions" className="text-white ">
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
