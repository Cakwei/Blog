/**
 * Phase 3: High-Performance Caching, Rate Limiting & Decoupled View Counting
 * Supports dual-mode: Fast in-memory TTL caching by default, with automatic
 * Upstash/Redis REST delegation when UPSTASH_REDIS_REST_URL is configured.
 */

interface CacheEntry<T> {
	value: T;
	expiresAt: number | null; // null means no expiration
}

class ResilientCacheStore {
	private memoryStore = new Map<string, CacheEntry<any>>();
	private recentViewers = new Map<string, number>(); // deduplication window
	private dirtyPostViews = new Map<number, number>(); // pending DB flushes

	private get redisUrl(): string | undefined {
		return process.env.UPSTASH_REDIS_REST_URL;
	}

	private get redisToken(): string | undefined {
		return process.env.UPSTASH_REDIS_REST_TOKEN;
	}

	private get hasRedis(): boolean {
		return Boolean(this.redisUrl && this.redisToken);
	}

	/**
	 * Send REST command to Redis (Upstash compatible)
	 */
	private async redisCommand<T>(
		command: string[],
	): Promise<{ ok: boolean; result?: T }> {
		if (!this.hasRedis) return { ok: false };
		try {
			const res = await fetch(`${this.redisUrl}`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${this.redisToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify(command),
			});
			if (!res.ok) return { ok: false };
			const data = (await res.json()) as { result: T };
			return { ok: true, result: data.result };
		} catch {
			return { ok: false };
		}
	}

	/**
	 * Get an item from cache
	 */
	async get<T>(key: string): Promise<T | null> {
		if (this.hasRedis) {
			const { ok, result } = await this.redisCommand<string>(["GET", key]);
			if (ok && result !== null && result !== undefined) {
				try {
					return JSON.parse(result) as T;
				} catch {
					return result as unknown as T;
				}
			}
		}

		// In-memory fallback
		const entry = this.memoryStore.get(key);
		if (!entry) return null;
		if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
			this.memoryStore.delete(key);
			return null;
		}
		return entry.value as T;
	}

	/**
	 * Set an item with optional TTL in seconds
	 */
	async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
		if (this.hasRedis) {
			const serialized =
				typeof value === "string" ? value : JSON.stringify(value);
			if (ttlSeconds && ttlSeconds > 0) {
				await this.redisCommand(["SET", key, serialized, "EX", String(ttlSeconds)]);
			} else {
				await this.redisCommand(["SET", key, serialized]);
			}
		}

		const expiresAt = ttlSeconds && ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : null;
		this.memoryStore.set(key, { value, expiresAt });
	}

	/**
	 * Invalidate a specific key or keys starting with a prefix
	 */
	async invalidate(patternOrKey: string): Promise<void> {
		if (this.hasRedis) {
			await this.redisCommand(["DEL", patternOrKey]);
		}

		// Delete exact match
		this.memoryStore.delete(patternOrKey);

		// Delete prefix matches
		for (const key of this.memoryStore.keys()) {
			if (key.startsWith(patternOrKey)) {
				this.memoryStore.delete(key);
			}
		}
	}

	/**
	 * Cache-aside helper: Returns cached value, or calls fetcher, stores, and returns.
	 */
	async getOrSet<T>(
		key: string,
		fetcher: () => Promise<T>,
		ttlSeconds = 300,
	): Promise<T> {
		const cached = await this.get<T>(key);
		if (cached !== null && cached !== undefined) {
			return cached;
		}

		const fresh = await fetcher();
		await this.set(key, fresh, ttlSeconds);
		return fresh;
	}

	/**
	 * Sliding window rate limiter
	 * @returns allowed (boolean), remaining requests, and resetSeconds
	 */
	async checkRateLimit(
		key: string,
		maxRequests: number,
		windowSeconds: number,
	): Promise<{ allowed: boolean; remaining: number; resetSeconds: number }> {
		const rateKey = `ratelimit:${key}`;
		const now = Date.now();
		const windowMs = windowSeconds * 1000;

		const existing = this.memoryStore.get(rateKey);
		let count = 1;
		let expiresAt = now + windowMs;

		if (existing && existing.expiresAt !== null && now < existing.expiresAt) {
			count = (existing.value as number) + 1;
			expiresAt = existing.expiresAt;
		}

		this.memoryStore.set(rateKey, { value: count, expiresAt });

		const remaining = Math.max(0, maxRequests - count);
		const resetSeconds = Math.max(1, Math.ceil((expiresAt - now) / 1000));

		return {
			allowed: count <= maxRequests,
			remaining,
			resetSeconds,
		};
	}

	/**
	 * Atomic post view counter:
	 * Decoupled from direct MariaDB writes to prevent table/row write locks on page views.
	 * Deduplicates duplicate visits by IP/hash within a 10-minute cooldown window.
	 */
	async recordPostView(
		postId: number,
		visitorHash = "anonymous",
	): Promise<{ totalViews: number; isNewView: boolean }> {
		const dedupeKey = `${postId}:${visitorHash}`;
		const now = Date.now();
		const cooldownMs = 10 * 60 * 1000; // 10 minutes

		const lastViewTime = this.recentViewers.get(dedupeKey);
		if (lastViewTime && now - lastViewTime < cooldownMs) {
			const currentDirty = this.dirtyPostViews.get(postId) || 0;
			return { totalViews: currentDirty, isNewView: false };
		}

		this.recentViewers.set(dedupeKey, now);

		// Increment dirty views
		const currentDirty = (this.dirtyPostViews.get(postId) || 0) + 1;
		this.dirtyPostViews.set(postId, currentDirty);

		// Clean up old dedupe records if map grows large
		if (this.recentViewers.size > 10000) {
			for (const [k, time] of this.recentViewers.entries()) {
				if (now - time > cooldownMs) {
					this.recentViewers.delete(k);
				}
			}
		}

		return { totalViews: currentDirty, isNewView: true };
	}

	/**
	 * Get accumulated dirty views for a post
	 */
	getPendingViews(postId: number): number {
		return this.dirtyPostViews.get(postId) || 0;
	}

	/**
	 * Flush pending in-memory views to MariaDB in a single batch
	 */
	async flushDirtyViewsToDb(prisma: any): Promise<number> {
		if (this.dirtyPostViews.size === 0) return 0;

		let updatedCount = 0;
		const snapshot = Array.from(this.dirtyPostViews.entries());
		this.dirtyPostViews.clear();

		for (const [postId, count] of snapshot) {
			try {
				await prisma.post.update({
					where: { id: postId },
					data: {
						views: { increment: count },
					},
				});
				updatedCount += count;
			} catch {
				// Re-queue dirty counts if DB write fails
				const current = this.dirtyPostViews.get(postId) || 0;
				this.dirtyPostViews.set(postId, current + count);
			}
		}

		return updatedCount;
	}

	/**
	 * Reset store (primarily for unit tests)
	 */
	clear(): void {
		this.memoryStore.clear();
		this.recentViewers.clear();
		this.dirtyPostViews.clear();
	}
}

export const cache = new ResilientCacheStore();
