import { createIsomorphicFn, createServerFn } from "@tanstack/react-start";
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
		const headers = getRequestHeaders();

		const session = await auth.api.getSession({
			query: {
				disableCookieCache: true, // Forces database check
			},
			headers: headers,
		});

		return session;
	},
);

type LogLevel = "debug" | "info" | "warn" | "error";

export const logger = createIsomorphicFn()
	.server((level: LogLevel, message: string, data?: any) => {
		if (process.env.NODE_ENV === "development") {
			console[level](`[SERVER] [${level.toUpperCase()}]`, message, data);
		} else {
			// Production: structured JSON logging or suppress entirely
			console.log(JSON.stringify({ level, message, data }));
		}
	})
	.client((level: LogLevel, message: string, data?: any) => {
		if (process.env.NODE_ENV === "development") {
			console[level](`[CLIENT] [${level.toUpperCase()}]`, message, data);
		} else {
			// Production: no-op or send to analytics
		}
	});
