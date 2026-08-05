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
		return session;
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
			<body className="bg-(--bg)">
				{/* HEADER */}
				<header className="border-b border-(--border) backdrop-blur sticky top-0 left-0 z-50 w-full px-5 bg-(--bg-secondary)/80">
					<div className="h-16 w-full max-w-6xl mx-auto flex items-center justify-between">
						<div className="flex items-center gap-8">
							<Link
								to="/"
								onClick={(e) => {
									e.preventDefault();
									if (isCurrentRoute) {
										window.scrollTo({ top: 0, behavior: "smooth" });
									}
									navigate({ to: "/" });
								}}
								className="text-xl font-bold tracking-tighter group"
							>
								<span className="text-(--link) group-hover:text-(--link)/80">
									Charlee's
									<span className="text-white group-hover:text-white/80">
										{" "}
										Blog
									</span>
								</span>
							</Link>
							<nav className="hidden md:flex gap-6 text-sm font-medium">
								{/*<Link to="/" className="transition-colors hover:text-(--link)">
                                    Articles
                                </Link>
                                <Link
                                    to="/"
                                    className="transition-colors hover:text-(--link) text-(--text-secondary)"
                                >
                                    About
                                </Link>*/}
							</nav>
						</div>
						{/* Showed depending not logged in OR logged in */}
						{session ? (
							<BetterAuthHeader />
						) : (
							<div className="flex items-center gap-4">
								<Link to="/login">
									<Button className="bg-(--bg-secondary) font-semibold border text-(--text) hover:bg-(--bg) border-(--border) transition-colors">
										Log in
									</Button>
								</Link>

								<Link to="/register">
									<Button className="bg-(--link) hover:bg-(--link) font-semibold text-white hover:opacity-90 border border-transparent transition-opacity">
										Sign up
									</Button>
								</Link>
							</div>
						)}
					</div>
				</header>
				{children}

				<Toaster />

				{/* FOOTER */}
				<footer className="border-t py-12 bg-(--bg-secondary) border-(--border) h-auto">
					<div className="container max-w-6xl mx-auto px-4">
						<div className="grid md:grid-cols-4 gap-8">
							<div className="col-span-2">
								<span className="text-xl text-(--link) font-bold tracking-tighter">
									Charlee's<span className="text-white"> Blog</span>
								</span>
								<p className="text-sm text-(--text-secondary) max-w-xs mt-2">
									Built with TanStack Start and BetterAuth
								</p>
							</div>
							<div>
								<h3 className="text-sm font-semibold mb-4 text-(--text)">
									Resources
								</h3>
								<ul className="space-y-2 text-sm text-(--text-secondary)">
									<li className="hover:text-(--text) transition-colors cursor-pointer">
										Documentation
									</li>
									<li className="hover:text-(--text) transition-colors cursor-pointer">
										Components
									</li>
								</ul>
							</div>
							<div>
								<h3 className="text-sm font-semibold mb-4 text-(--text)">
									Legal
								</h3>
								<ul className="space-y-2 text-sm text-(--text-secondary)">
									<li className="hover:text-(--text) transition-colors cursor-pointer">
										Privacy
									</li>
									<li className="hover:text-(--text) transition-colors cursor-pointer">
										Terms
									</li>
								</ul>
							</div>
						</div>
						<div className="mt-12 pt-8 border-t text-center border-(--border) text-sm text-(--text-secondary)">
							© {new Date().getFullYear()} Charlee Tan. All rights reserved.
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
