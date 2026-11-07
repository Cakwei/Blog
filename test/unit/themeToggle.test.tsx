import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeToggle } from "#/components/ui/themeToggle";

describe("ThemeToggle", () => {
	beforeEach(() => {
		localStorage.clear();
		document.documentElement.classList.remove("dark");
		vi.stubGlobal(
			"matchMedia",
			vi.fn().mockImplementation((query: string) => ({
				matches: query.includes("dark"),
				media: query,
				onchange: null,
				addListener: vi.fn(),
				removeListener: vi.fn(),
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
				dispatchEvent: vi.fn(),
			})),
		);
	});

	it("renders the theme toggle button after mounting", async () => {
		render(<ThemeToggle />);
		const button = await screen.findByTestId("themeToggleBtn");
		expect(button).toBeInTheDocument();
	});

	it("applies dark class to documentElement when saved in localStorage", async () => {
		localStorage.setItem("theme", "dark");
		render(<ThemeToggle />);
		await screen.findByTestId("themeToggleBtn");
		expect(document.documentElement.classList.contains("dark")).toBe(true);
	});

	it("applies light theme (removes dark class) when saved as light in localStorage", async () => {
		document.documentElement.classList.add("dark");
		localStorage.setItem("theme", "light");
		render(<ThemeToggle />);
		await screen.findByTestId("themeToggleBtn");
		expect(document.documentElement.classList.contains("dark")).toBe(false);
	});

	it("opens dropdown menu and allows selecting dark mode", async () => {
		const user = userEvent.setup();
		render(<ThemeToggle />);
		const button = await screen.findByTestId("themeToggleBtn");

		await user.click(button);
		const darkOption = await screen.findByText("Dark");
		await user.click(darkOption);

		expect(localStorage.getItem("theme")).toBe("dark");
		expect(document.documentElement.classList.contains("dark")).toBe(true);
	});

	it("allows switching from dark mode to light mode", async () => {
		const user = userEvent.setup();
		localStorage.setItem("theme", "dark");
		render(<ThemeToggle />);
		const button = await screen.findByTestId("themeToggleBtn");

		await user.click(button);
		const lightOption = await screen.findByText("Light");
		await user.click(lightOption);

		expect(localStorage.getItem("theme")).toBe("light");
		expect(document.documentElement.classList.contains("dark")).toBe(false);
	});
});
