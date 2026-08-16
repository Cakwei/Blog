import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_protected")({
	beforeLoad: async ({ location ,context}) => {
		const session = context.session;
		const currentUrl = location.href;

		if (!session) {
			throw redirect({
				to: "/login",
			});
		}

		// If alr logged in and tries to do auth again, go to homepage
		if ((session && currentUrl === "/login") || currentUrl === "/register") {
			throw redirect({
				to: "/",
			});
		}

	},
	component: () => <Outlet />,
});
