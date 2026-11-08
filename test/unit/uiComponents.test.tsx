import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { NotFound } from "#/components/ui/errorComponent";
import { TableOfContents } from "#/components/ui/tableOfContents";

vi.mock("@tanstack/react-router", () => ({
	Link: ({ children, to, className, ...props }: any) => (
		<a href={to} className={className} {...props}>
			{children}
		</a>
	),
}));

describe("UI Components", () => {
	const defaultNotFoundProps = { isNotFound: true, routeId: "__root__" as const };

	describe("NotFound Component", () => {
		it("renders default title and description", () => {
			render(<NotFound {...defaultNotFoundProps} />);
			expect(screen.getByText("Page Not Found")).toBeInTheDocument();
			expect(
				screen.getByText(
					"The page you are looking for doesn't exist or has been moved.",
				),
			).toBeInTheDocument();
		});

		it("renders custom title and description when provided", () => {
			render(
				<NotFound
					{...defaultNotFoundProps}
					title="Article Unavailable"
					description="This post has been archived or removed."
				/>,
			);
			expect(screen.getByText("Article Unavailable")).toBeInTheDocument();
			expect(
				screen.getByText("This post has been archived or removed."),
			).toBeInTheDocument();
		});

		it("renders the back home button by default", () => {
			render(<NotFound {...defaultNotFoundProps} />);
			expect(screen.getByText("← Back to Home")).toBeInTheDocument();
		});

		it("hides the back home button when showHomeButton is false", () => {
			render(<NotFound {...defaultNotFoundProps} showHomeButton={false} />);
			expect(screen.queryByText("← Back to Home")).not.toBeInTheDocument();
		});
	});

	describe("Badge Component", () => {
		it("renders children with default styling", () => {
			render(<Badge>Technology</Badge>);
			const badge = screen.getByText("Technology");
			expect(badge).toBeInTheDocument();
		});

		it("supports secondary variant", () => {
			render(<Badge variant="secondary">Design</Badge>);
			expect(screen.getByText("Design")).toBeInTheDocument();
		});
	});

	describe("Button Component", () => {
		it("renders button with text", () => {
			render(<Button>Click me</Button>);
			expect(screen.getByRole("button", { name: "Click me" })).toBeInTheDocument();
		});

		it("supports disabled state", () => {
			render(<Button disabled>Disabled</Button>);
			const button = screen.getByRole("button", { name: "Disabled" });
			expect(button).toBeDisabled();
		});
	});

	describe("Card Component", () => {
		it("renders nested card structure properly", () => {
			render(
				<Card data-testid="cardContainer">
					<CardHeader>
						<CardTitle>Card Header Title</CardTitle>
					</CardHeader>
					<CardContent>
						<p>Card Body Content</p>
					</CardContent>
				</Card>,
			);
			expect(screen.getByTestId("cardContainer")).toBeInTheDocument();
			expect(screen.getByText("Card Header Title")).toBeInTheDocument();
			expect(screen.getByText("Card Body Content")).toBeInTheDocument();
		});
	});

	describe("TableOfContents Component", () => {
		const sampleHeadings = [
			{ id: "intro", text: "Introduction", level: 2 as const },
			{ id: "setup", text: "System Setup", level: 3 as const },
		];

		it("returns null when headings array is empty", () => {
			const { container } = render(<TableOfContents headings={[]} />);
			expect(container.firstChild).toBeNull();
		});

		it("renders sticky desktop sidebar when variant is desktop", () => {
			const { container } = render(
				<TableOfContents headings={sampleHeadings} variant="desktop" />,
			);
			const aside = container.querySelector("aside");
			expect(aside).not.toBeNull();
			expect(aside?.className).toContain("lg:sticky");
			expect(aside?.className).toContain("lg:top-24");
			expect(screen.getByText("On This Page")).toBeInTheDocument();
			expect(screen.getByText("Introduction")).toBeInTheDocument();
			expect(screen.getByText("System Setup")).toBeInTheDocument();
		});

		it("toggles mobile accordion when variant is mobile", () => {
			render(<TableOfContents headings={sampleHeadings} variant="mobile" />);
			const toggleBtn = screen.getByRole("button", {
				name: /Table of Contents \(2\)/i,
			});
			expect(toggleBtn).toBeInTheDocument();
			expect(screen.queryByText("Introduction")).not.toBeInTheDocument();

			fireEvent.click(toggleBtn);
			expect(screen.getByText("Introduction")).toBeInTheDocument();
			expect(screen.getByText("System Setup")).toBeInTheDocument();
		});
	});
});
