import { Laptop, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "./button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "./dropdown-menu";

export type Theme = "light" | "dark" | "system";

export function ThemeToggle() {
	const [theme, setTheme] = useState<Theme>("system");
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
		const savedTheme = (localStorage.getItem("theme") as Theme) || "system";
		setTheme(savedTheme);
		applyTheme(savedTheme);
	}, []);

	const applyTheme = (nextTheme: Theme) => {
		const root = document.documentElement;
		if (nextTheme === "system") {
			const systemDark = window.matchMedia(
				"(prefers-color-scheme: dark)",
			).matches;
			if (systemDark) {
				root.classList.add("dark");
			} else {
				root.classList.remove("dark");
			}
			localStorage.removeItem("theme");
		} else if (nextTheme === "dark") {
			root.classList.add("dark");
			localStorage.setItem("theme", "dark");
		} else {
			root.classList.remove("dark");
			localStorage.setItem("theme", "light");
		}
	};

	const handleThemeChange = (nextTheme: Theme) => {
		setTheme(nextTheme);
		applyTheme(nextTheme);
	};

	if (!mounted) {
		return (
			<Button
				variant="ghost"
				size="sm"
				className="h-9 w-9 rounded-xl border border-(--border) bg-(--bg-secondary)/50 text-(--text-secondary) p-0"
			>
				<Sun className="h-4 w-4" />
			</Button>
		);
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					data-testid="themeToggleBtn"
					variant="ghost"
					size="sm"
					className="h-9 w-9 rounded-xl border border-(--border) bg-(--bg-secondary)/50 hover:bg-(--bg-secondary) text-(--text) hover:text-(--link) transition-all p-0 cursor-pointer"
					title="Toggle theme"
				>
					<Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-amber-500" />
					<Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-(--link)" />
					<span className="sr-only">Toggle theme</span>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				align="end"
				className="rounded-2xl border border-(--border) bg-(--bg-secondary) backdrop-blur-xl p-1.5 shadow-xl text-(--text) min-w-[130px]"
			>
				<DropdownMenuItem
					onClick={() => handleThemeChange("light")}
					className={`flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-medium cursor-pointer transition-colors ${
						theme === "light"
							? "bg-(--link)/15 text-(--link) font-semibold"
							: "hover:bg-(--bg) text-(--text)"
					}`}
				>
					<Sun className="h-3.5 w-3.5 text-amber-500" />
					<span>Light</span>
				</DropdownMenuItem>
				<DropdownMenuItem
					onClick={() => handleThemeChange("dark")}
					className={`flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-medium cursor-pointer transition-colors ${
						theme === "dark"
							? "bg-(--link)/15 text-(--link) font-semibold"
							: "hover:bg-(--bg) text-(--text)"
					}`}
				>
					<Moon className="h-3.5 w-3.5 text-(--link)" />
					<span>Dark</span>
				</DropdownMenuItem>
				<DropdownMenuItem
					onClick={() => handleThemeChange("system")}
					className={`flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-medium cursor-pointer transition-colors ${
						theme === "system"
							? "bg-(--link)/15 text-(--link) font-semibold"
							: "hover:bg-(--bg) text-(--text)"
					}`}
				>
					<Laptop className="h-3.5 w-3.5 text-(--text-secondary)" />
					<span>System</span>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
