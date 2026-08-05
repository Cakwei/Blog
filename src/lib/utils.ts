import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import type { ClassValue } from "clsx";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { auth } from "./auth";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export const getSessionFn = createServerFn({ method: "GET" }).handler(
	async () => {
		// 1. Grab incoming user headers via TanStack Server utility
		const headers = getRequestHeaders();

		// 2. Fetch the session with your parameters
		const session = await auth.api.getSession({
			query: {
				disableCookieCache: true, // Forces database check
			},
			headers, // Passes cookies/tokens forward
		});

		return session;
	},
);
