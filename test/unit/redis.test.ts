import { beforeEach, describe, expect, it, vi } from "vitest";
import { redis } from "#/lib/redis";

describe("Resilient Redis & Cache Store (ioredis + fallback)", () => {
	beforeEach(() => {
		redis.clear();
	});

	describe("Basic Get / Set / Invalidate", () => {
		it("stores and retrieves string and object values", async () => {
			await redis.set("test:key", "hello-world");
			const stringVal = await redis.get<string>("test:key");
			expect(stringVal).toBe("hello-world");

			const testObj = { id: 1, title: "Architecture Post" };
			await redis.set("test:post:1", testObj);
			const objVal = await redis.get<typeof testObj>("test:post:1");
			expect(objVal).toEqual(testObj);
		});

		it("returns null for non-existent keys", async () => {
			const val = await redis.get("test:does_not_exist");
			expect(val).toBeNull();
		});

		it("invalidates keys by exact match and prefix pattern", async () => {
			await redis.set("posts:1", "post-1");
			await redis.set("posts:2", "post-2");
			await redis.set("authors:1", "author-1");

			await redis.invalidate("posts:*");

			expect(await redis.get("posts:1")).toBeNull();
			expect(await redis.get("posts:2")).toBeNull();
			expect(await redis.get("authors:1")).toBe("author-1");
		});

		it("expires keys based on TTL seconds", async () => {
			vi.useFakeTimers();
			await redis.set("temporary:key", "expires-soon", 5); // 5 seconds TTL

			expect(await redis.get("temporary:key")).toBe("expires-soon");

			// Advance time past TTL
			vi.advanceTimersByTime(5100);

			expect(await redis.get("temporary:key")).toBeNull();
			vi.useRealTimers();
		});
	});

	describe("Cache-Aside (getOrSet)", () => {
		it("invokes the fetcher on cache miss and caches the result", async () => {
			const fetcher = vi.fn().mockResolvedValue({ status: "fetched" });

			const result1 = await redis.getOrSet("cache_aside:test", fetcher, 60);
			expect(result1).toEqual({ status: "fetched" });
			expect(fetcher).toHaveBeenCalledTimes(1);

			// Second call should return cached data without invoking fetcher
			const result2 = await redis.getOrSet("cache_aside:test", fetcher, 60);
			expect(result2).toEqual({ status: "fetched" });
			expect(fetcher).toHaveBeenCalledTimes(1);
		});
	});

	describe("Sliding Window Rate Limiter", () => {
		it("allows requests under the limit and tracks remaining quota", async () => {
			const clientIp = "192.168.1.100";
			const res1 = await redis.checkRateLimit(`login:${clientIp}`, 3, 60);
			expect(res1.allowed).toBe(true);
			expect(res1.remaining).toBe(2);

			const res2 = await redis.checkRateLimit(`login:${clientIp}`, 3, 60);
			expect(res2.allowed).toBe(true);
			expect(res2.remaining).toBe(1);

			const res3 = await redis.checkRateLimit(`login:${clientIp}`, 3, 60);
			expect(res3.allowed).toBe(true);
			expect(res3.remaining).toBe(0);

			// 4th request exceeds the max limit of 3
			const res4 = await redis.checkRateLimit(`login:${clientIp}`, 3, 60);
			expect(res4.allowed).toBe(false);
			expect(res4.remaining).toBe(0);
		});
	});

	describe("Decoupled Post View Counting", () => {
		it("increments view count on first visit", async () => {
			const postId = 101;
			const { totalViews, isNewView } = await redis.recordPostView(
				postId,
				"visitor_hash_1",
			);
			expect(isNewView).toBe(true);
			expect(totalViews).toBe(1);
		});

		it("deduplicates subsequent views from same visitor within cooldown window", async () => {
			const postId = 101;
			await redis.recordPostView(postId, "visitor_hash_1");

			// Immediate duplicate visit
			const { totalViews, isNewView } = await redis.recordPostView(
				postId,
				"visitor_hash_1",
			);
			expect(isNewView).toBe(false);
			expect(totalViews).toBe(1);

			// Different visitor counts as new view
			const visit2 = await redis.recordPostView(postId, "visitor_hash_2");
			expect(visit2.isNewView).toBe(true);
			expect(visit2.totalViews).toBe(2);
		});

		it("flushes dirty view counters to database batch update", async () => {
			const postId = 202;
			await redis.recordPostView(postId, "visitor_A");
			await redis.recordPostView(postId, "visitor_B");

			const mockPrisma = {
				post: {
					update: vi.fn().mockResolvedValue({ id: postId, views: 2 }),
				},
			};

			const flushedCount = await redis.flushDirtyViewsToDb(mockPrisma);
			expect(flushedCount).toBe(2);
			expect(mockPrisma.post.update).toHaveBeenCalledWith({
				where: { id: postId },
				data: { views: { increment: 2 } },
			});
		});
	});
});
