import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { toast } from "sonner";

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

		// If alr logged in and tries to do auth again, go to homepage
		if (session && AUTH_ROUTES.includes(currentUrl)) {
			toast.success("You are aleady logged in", { position: "top-center" });
			throw redirect({
				to: "/",
			});
		}
	},
	component: () => <Outlet />,
});
