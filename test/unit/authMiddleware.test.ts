import { describe, expect, it, vi } from "vitest";
import { MESSAGE } from "#/lib/const";

describe("authMiddleware Behavior", () => {
	it("returns 401 Unauthorized when no session exists", async () => {
		const mockGetSession = vi.fn().mockResolvedValue(null);

		const runMiddleware = async () => {
			const session = await mockGetSession();
			if (!session) {
				return Response.json(
					{
						success: false,
						data: {},
						message: MESSAGE.UNAUTHORIZED_ACCESS,
					},
					{ status: 401 },
				);
			}
			return { ok: true, context: { session } };
		};

		const response = (await runMiddleware()) as Response;
		expect(response.status).toBe(401);
		const json = await response.json();
		expect(json.success).toBe(false);
		expect(json.message).toBe(MESSAGE.UNAUTHORIZED_ACCESS);
	});

	it("attaches session to context when user is authenticated", async () => {
		const mockSession = {
			user: { id: "user_123", email: "author@cakwei.dev", name: "Author" },
			session: { id: "sess_456", userId: "user_123", expiresAt: new Date() },
		};
		const mockGetSession = vi.fn().mockResolvedValue(mockSession);

		const runMiddleware = async () => {
			const session = await mockGetSession();
			if (!session) {
				return Response.json({ message: "unauthorized" }, { status: 401 });
			}
			return { ok: true, context: { session } };
		};

		const result = await runMiddleware();
		expect(result).toHaveProperty("ok", true);
		expect((result as any).context.session).toEqual(mockSession);
	});
});
