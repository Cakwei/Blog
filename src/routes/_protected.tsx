import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

const AUTH_ROUTES = ["/login", "/register"];

export const Route = createFileRoute("/_protected")({
	beforeLoad: async ({ location, context }) => {
		const session = context.session;
		const currentUrl = location.pathname;

		if (!session && !AUTH_ROUTES.includes(currentUrl)) {
			throw redirect({
				to: "/login",
			});
		}

		// If already logged in and tries to access auth routes, redirect to homepage
		if (session && AUTH_ROUTES.includes(currentUrl)) {
			throw redirect({
				to: "/",
			});
		}
	},
	component: () => <Outlet />,
});
