import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "./generated/prisma/client.js";

const adapter = new PrismaMariaDb(
	process.env.NODE_ENV === "production"
		? process.env.DATABASE_URL || ""
		: {
				host: "localhost",
				port: 3306,
				connectionLimit: 5,
				database: "blog",
				user: "root",
			},
);

declare global {
	var __prisma: PrismaClient | undefined;
}

export const prisma = globalThis.__prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
	globalThis.__prisma = prisma;
}
