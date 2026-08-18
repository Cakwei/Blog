import { createIsomorphicFn, createServerFn } from "@tanstack/react-start";
import {
	getRequestHeader,
	getRequestHeaders,
} from "@tanstack/react-start/server";
import type { ClassValue } from "clsx";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { auth } from "./auth";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export const getSessionFn = createServerFn({ method: "GET" }).handler(
	async () => {
		const cookie = getRequestHeader("Cookie") || "";

		const session = await auth.api.getSession({
			query: {
				disableCookieCache: true, // Forces database check
			},
			headers: { cookie: cookie },
		});

		return session;
	},
);

export const getHeadersCookieFn = createServerFn().handler<Promise<string>>(
	async () => {
		const cookie = getRequestHeader("Cookie");
		logger("debug", "getHeadersCookie utils.ts @ ", cookie);
		return cookie || "";
	},
);

export const parseBody = async (request: Request) => {
	try {
		return await request.json();
	} catch {
		return null;
	}
};

export function safeParseInt(str: string | null) {
	const cleanedStr = String(str || "").trim();

	// Regex check if string contains NOT numbers
	if (!/^\d+$/.test(cleanedStr)) {
		return 0;
	}

	// Convert to a base-10 number
	const num = Number(cleanedStr);

	// Reject 0 to ensure it is strictly positive (> 0)
	if (num === 0) {
		return 0;
	}

	logger("debug", "safeParseInt utils.ts @", num);
	return num;
}

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
