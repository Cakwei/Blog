import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getSessionFn } from "#/lib/utils";

export const Route = createFileRoute("/_protected")({
	beforeLoad: async ({ location }) => {
		const session = await getSessionFn();
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

		return { user: session.user };
	},
	component: () => <Outlet />,
});
