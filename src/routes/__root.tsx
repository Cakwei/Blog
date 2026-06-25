import { TanStackDevtools } from "@tanstack/react-devtools";
import type { QueryClient } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	HeadContent,
	Link,
	Scripts,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import type { Session } from "better-auth";
import { Button } from "#/components/ui/button";
import BetterAuthHeader from "#/integrations/better-auth/header-user";
import { getFreshServerSession } from "#/lib/utils";
import TanStackQueryDevtools from "../integrations/tanstack-query/devtools";
import appCss from "../styles.css?url";

interface MyRouterContext {
	queryClient: QueryClient;
	session?: Session;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
	beforeLoad: async ({ location }) => {
		const session = await getFreshServerSession();

		if (location.pathname === "/login") {
			return;
		}

		if (session) {
			// confirm("inside");
			return { session };
		}

		// Testing purposes
		// throw redirect({ to: "/login" });
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

	return (
		<html lang="en">
			<head>
				<HeadContent />
			</head>
			<body>
				{/* HEADER */}
				<header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 left-0 z-50  w-full px-5">
					<div className="h-16 w-full flex items-center justify-between">
						<div className="flex items-center gap-8">
							<Link to="/" className="text-xl font-bold tracking-tighter">
								Charlee's<span className="text-primary"> Blog</span>
							</Link>
							<nav className="hidden md:flex gap-6 text-sm font-medium">
								<Link to="/" className="transition-colors hover:text-primary">
									Articles
								</Link>
								<Link
									to="/"
									className="transition-colors hover:text-primary text-muted-foreground"
								>
									About
								</Link>
							</nav>
						</div>
						{/* Showed depending not logged in OR logged in */}
						{session ? (
							<BetterAuthHeader />
						) : (
							<div className="flex items-center gap-4">
								<Link to="/login">
									<Button>Log in </Button>
								</Link>

								<Link to="/register">
									<Button>Sign up </Button>
								</Link>
							</div>
						)}
					</div>
				</header>
				{children}
				{/* FOOTER */}
				<footer className="border-t py-12 bg-slate-50/50">
					<div className="container mx-auto px-4">
						<div className="grid md:grid-cols-4 gap-8">
							<div className="col-span-2">
								<span className="text-xl text-[#318F97] font-bold tracking-tighter">
									Charlee's<span className="text-primary"> Blog</span>
								</span>
								<p className="text-sm text-muted-foreground max-w-xs">
									Built with TanStack Start and BetterAuth
								</p>
							</div>
							<div>
								<h3 className="text-sm font-semibold mb-4">Resources</h3>
								<ul className="space-y-2 text-sm text-muted-foreground">
									<li>Documentation</li>
									<li>Components</li>
								</ul>
							</div>
							<div>
								<h3 className="text-sm font-semibold mb-4">Legal</h3>
								<ul className="space-y-2 text-sm text-muted-foreground">
									<li>Privacy</li>
									<li>Terms</li>
								</ul>
							</div>
						</div>
						<div className="mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
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
