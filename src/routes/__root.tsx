import { TanStackDevtools } from "@tanstack/react-devtools";
import type { QueryClient } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	HeadContent,
	Link,
	Scripts,
	useHydrated,
	useLocation,
	useNavigate,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import type { Session } from "better-auth";
import { Button } from "#/components/ui/button";
import { NotFound } from "#/components/ui/errorComponent";
import BetterAuthHeader from "#/components/ui/headers";
import { SearchDialog } from "#/components/ui/searchBar";
import { Toaster } from "#/components/ui/sonner";
import { ThemeToggle } from "#/components/ui/themeToggle";
import { getSessionFn } from "#/lib/utils";
import TanStackQueryDevtools from "../integrations/tanstack-query/devtools";
import "../styles.css";

export interface MyRouterContext {
	queryClient: QueryClient;
	session?: Session;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
	beforeLoad: async () => {
		const session = await getSessionFn();
		return { session: session };
	},
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{
				title: "Charlee's Blog",
			},
		],
	}),
	notFoundComponent: NotFound,
	shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
	const hydrated = useHydrated();
	const { session } = Route.useRouteContext();
	const location = useLocation();
	const isCurrentRoute = location.pathname === "/";
	const navigate = useNavigate();

	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				{/* Non-blocking anti-FOUC theme initialization script */}
				<script
					dangerouslySetInnerHTML={{
						__html: `
							(function() {
								try {
									var theme = localStorage.getItem('theme');
									var supportDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
									if (theme === 'dark' || (!theme && supportDark)) {
										document.documentElement.classList.add('dark');
									} else {
										document.documentElement.classList.remove('dark');
									}
								} catch (e) {}
							})();
						`,
					}}
				/>
				<HeadContent />
			</head>
			<body
				data-hydrated={hydrated || undefined}
				className="bg-(--bg) text-(--text) selection:bg-(--link)/20 selection:text-(--link) min-h-screen flex flex-col antialiased transition-colors duration-200"
			>
				{/* MINIMALIST HEADER */}
				<header className="border-b border-(--border) sticky top-0 left-0 z-50 w-full px-4 sm:px-6 lg:px-8 bg-(--header-bg) backdrop-blur-md transition-colors">
					<div className="h-16 w-full max-w-5xl mx-auto flex items-center justify-between">
						<div className="flex items-center gap-6">
							<Link
								data-testid="homeBtn"
								to="/"
								onClick={(e) => {
									e.preventDefault();
									if (isCurrentRoute) {
										window.scrollTo({ top: 0, behavior: "smooth" });
										return;
									}
									navigate({ to: "/" });
								}}
								className="text-sm font-semibold tracking-tight text-(--text) hover:opacity-75 transition-opacity"
							>
								Charlee
							</Link>

							<nav className="flex items-center gap-1 text-xs text-(--text-secondary)">
								<Link
									to="/articles"
									className="px-2.5 py-1 rounded-md hover:text-(--text) transition-colors"
								>
									Articles
								</Link>
							</nav>
						</div>

						{/* Header Controls & Auth */}
						<div className="flex items-center gap-2">
							{/* Global Search Dialog for all visitors */}
							{!session && <SearchDialog />}

							{/* Theme Switcher */}
							<ThemeToggle />

							{session ? (
								<BetterAuthHeader />
							) : (
								<div className="flex items-center gap-1.5 ml-1">
									<Link to="/login">
										<Button
											variant="ghost"
											size="sm"
											className="text-xs h-8 px-2.5 rounded-md text-(--text-secondary) hover:text-(--text) transition-colors"
										>
											Log in
										</Button>
									</Link>

									<Link to="/register">
										<Button
											data-testid="registerBtn"
											size="sm"
											className="bg-(--text) hover:opacity-90 text-(--bg) font-medium text-xs h-8 px-3 rounded-md transition-all cursor-pointer"
										>
											Sign up
										</Button>
									</Link>
								</div>
							)}
						</div>
					</div>
				</header>

				{/* MAIN CONTENT WRAPPER */}
				<main className="flex-1 py-8 sm:py-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full">
					{children}
				</main>

				<Toaster data-testid="toast" closeButton={true} duration={1600} />

				{/* MINIMALIST FOOTER */}
				<footer className="border-t border-(--border) py-8 mt-auto">
					<div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-(--text-secondary)">
						<p>© {new Date().getFullYear()} Charlee. All rights reserved.</p>
						<div className="flex items-center gap-5">
							<Link to="/articles" className="hover:text-(--text) transition-colors">
								Articles
							</Link>
							<Link to="/privacy-policy" className="hover:text-(--text) transition-colors">
								Privacy
							</Link>
							<a
								href="https://github.com/cakwei"
								target="_blank"
								rel="noopener noreferrer"
								className="hover:text-(--text) transition-colors"
							>
								GitHub
							</a>
						</div>
					</div>
				</footer>

				<TanStackDevtools
					config={{
						position: "bottom-right",
					}}
					plugins={[
						{
							name: "Tanstack Router",
							render: <TanStackRouterDevtoolsPanel />,
						},
						TanStackQueryDevtools,
					]}
				/>
				<Scripts />
			</body>
		</html>
	);
}
