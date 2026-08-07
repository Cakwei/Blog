import { createMiddleware } from "@tanstack/react-start";
import { MESSAGE } from "./const";
import { getSessionFn } from "./utils";

export const authMiddleware = createMiddleware().server(async ({ next }) => {
	const session = await getSessionFn();
	if (!session)
		return Response.json({
			success: false,
			data: {},
			message: MESSAGE.UNAUTHORIZED_ACCESS,
		});
	return await next({ context: { session: session } });
});
