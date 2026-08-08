import { TanStackDevtools } from "@tanstack/react-devtools";
import type { QueryClient } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	HeadContent,
	Link,
	Scripts,
	useLocation,
	useNavigate,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import type { Session } from "better-auth";
import { Button } from "#/components/ui/button";
import BetterAuthHeader from "#/components/ui/headers";
import { Toaster } from "#/components/ui/sonner";
import { getSessionFn } from "#/lib/utils";
import TanStackQueryDevtools from "../integrations/tanstack-query/devtools";
import appCss from "../styles.css?url";

interface MyRouterContext {
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
		links: [
			{
				rel: "stylesheet",
				href: appCss,
			},
		],
	}),
	shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
	const { session } = Route.useRouteContext();
	const location = useLocation();
	const isCurrentRoute = location.pathname === "/";
	const navigate = useNavigate();
	return (
		<html lang="en">
			<head>
				<HeadContent />
			</head>
			<body className="bg-(--bg) text-(--text) selection:bg-(--link)/20 selection:text-(--link) min-h-screen flex flex-col antialiased">
				{/* HEADER */}
				<header className="border-b border-(--border)/60 backdrop-blur-xl sticky top-0 left-0 z-50 w-full px-4 sm:px-6 lg:px-8 bg-(--bg-secondary)/70 transition-all">
					<div className="h-18 w-full max-w-7xl mx-auto flex items-center justify-between">
						<div className="flex items-center gap-10">
							<Link
								to="/"
								onClick={(e) => {
									e.preventDefault();
									if (isCurrentRoute) {
										window.scrollTo({ top: 0, behavior: "smooth" });
										return;
									}
									navigate({ to: "/" });
								}}
								className="text-lg font-black tracking-tight group flex items-center gap-2"
							>
								<span className="text-(--text) group-hover:text-(--link) transition-colors">
									Charlee's <span className="text-(--link)">Blog</span>
								</span>
							</Link>
							{/*
							<nav className="hidden md:flex items-center gap-1 text-xs font-semibold">
								<Link
									to="/"
									className="px-3 py-2 rounded-xl text-(--text-secondary) hover:text-(--text) hover:bg-(--bg-secondary) transition-all"
								>
									Articles
								</Link>
								<Link
									to="/articles"
									className="px-3 py-2 rounded-xl text-(--text-secondary) hover:text-(--text) hover:bg-(--bg-secondary) transition-all"
								>
									Archive
								</Link>
							</nav>*/}
						</div>

						{/* Auth / Header Actions */}
						{session ? (
							<BetterAuthHeader />
						) : (
							<div className="flex items-center gap-2.5">
								<Link to="/login">
									<Button
										variant="ghost"
										className="font-semibold text-xs h-9 px-4 rounded-xl text-(--text-secondary) hover:text-(--text) hover:bg-(--bg-secondary) transition-all"
									>
										Log in
									</Button>
								</Link>

								<Link to="/register">
									<Button className="bg-(--link) hover:bg-(--link)/90 font-semibold text-white text-xs h-9 px-4 rounded-xl shadow-lg shadow-(--link)/20 transition-all">
										Sign up
									</Button>
								</Link>
							</div>
						)}
					</div>
				</header>

				{/* MAIN CONTENT WRAPPER */}
				{children}

				<Toaster />

				{/* FOOTER */}
				<footer className="border-t border-(--border)/60 py-16 bg-(--bg-secondary)/40 backdrop-blur-md">
					<div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
						<div className="grid grid-cols-1 md:grid-cols-12 gap-10 lg:gap-16">
							<div className="md:col-span-6 space-y-3">
								<div className="flex items-center gap-2">
									<div className="w-6 h-6 rounded-lg bg-(--link)/10 border border-(--link)/30 flex items-center justify-center text-(--link) text-xs font-bold">
										C
									</div>
									<span className="text-base font-black tracking-tight text-(--text)">
										Charlee's<span className="text-(--link)"> Blog</span>
									</span>
								</div>
								<p className="text-xs text-(--text-secondary) max-w-sm leading-relaxed">
									A space where I share my personal experience & thoughts.
								</p>
							</div>

							<div className="md:col-span-3 space-y-3">
								<h3 className="text-xs font-extrabold uppercase tracking-widest text-(--text)">
									Navigation
								</h3>
								<ul className="space-y-2 text-xs text-(--text-secondary)">
									<li>
										<Link
											to="/"
											className="hover:text-(--link) transition-colors"
										>
											Home Feed
										</Link>
									</li>
									<li>
										<Link
											to="/articles"
											className="hover:text-(--link) transition-colors"
										>
											Explore Articles
										</Link>
									</li>
								</ul>
							</div>

							<div className="md:col-span-3 space-y-3">
								<h3 className="text-xs font-extrabold uppercase tracking-widest text-(--text)">
									Connect
								</h3>
								<ul className="space-y-2 text-xs text-(--text-secondary)">
									<li className="hover:text-(--link) transition-colors cursor-pointer">
										GitHub
									</li>
									<li className="hover:text-(--link) transition-colors cursor-pointer">
										Twitter / X
									</li>
								</ul>
							</div>
						</div>

						<div className="mt-14 pt-8 border-t border-(--border)/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-(--text-secondary)">
							<p>© {new Date().getFullYear()} Charlee Tan. Made with ❤️</p>
							<div className="flex items-center gap-6">
								<span className="hover:text-(--text) transition-colors cursor-pointer">
									Privacy Policy
								</span>
								<span>•</span>
								<span className="hover:text-(--text) transition-colors cursor-pointer">
									Terms of Service
								</span>
							</div>
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
