import Redis from "ioredis";

/**
 * Phase 3: High-Performance Caching & Redis Integration using ioredis
 * Resilient dual-mode: Uses high-speed ioredis when REDIS_URL is configured,
 * with seamless in-memory fallback if Redis is offline or unconfigured.
 */

interface CacheEntry<T> {
	value: T;
	expiresAt: number | null;
}

class ResilientRedisStore {
	private redis: Redis | null = null;
	private isConnected = false;
	private memoryStore = new Map<string, CacheEntry<any>>();
	private recentViewers = new Map<string, number>();
	private dirtyPostViews = new Map<number, number>();

	constructor() {
		this.initRedis();
	}

	private initRedis(): void {
		const redisUrl = process.env.REDIS_URL;
		if (!redisUrl) return;

		try {
			this.redis = new Redis(redisUrl, {
				lazyConnect: true,
				maxRetriesPerRequest: 1,
				enableOfflineQueue: false,
				retryStrategy(times) {
					if (times > 3) return null; // stop spamming retries if offline
					return Math.min(times * 200, 2000);
				},
				reconnectOnError() {
					return false;
				},
			});

			this.redis.on("connect", () => {
				this.isConnected = true;
			});

			this.redis.on("ready", () => {
				this.isConnected = true;
			});

			this.redis.on("error", () => {
				this.isConnected = false;
			});

			this.redis.on("close", () => {
				this.isConnected = false;
			});

			// Attempt eager connection non-blockingly
			void this.redis.connect().catch(() => {
				this.isConnected = false;
			});
		} catch {
			this.redis = null;
			this.isConnected = false;
		}
	}

	get isRedisActive(): boolean {
		return Boolean(this.redis && this.isConnected);
	}

	/**
	 * Get an item from cache
	 */
	async get<T>(key: string): Promise<T | null> {
		if (this.isRedisActive && this.redis) {
			try {
				const val = await this.redis.get(key);
				if (val !== null && val !== undefined) {
					try {
						return JSON.parse(val) as T;
					} catch {
						return val as unknown as T;
					}
				}
			} catch {
				// Fall through to memoryStore
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
		if (this.isRedisActive && this.redis) {
			try {
				const serialized =
					typeof value === "string" ? value : JSON.stringify(value);
				if (ttlSeconds && ttlSeconds > 0) {
					await this.redis.set(key, serialized, "EX", ttlSeconds);
				} else {
					await this.redis.set(key, serialized);
				}
			} catch {
				// Fallback continues below
			}
		}

		const expiresAt =
			ttlSeconds && ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : null;
		this.memoryStore.set(key, { value, expiresAt });
	}

	/**
	 * Invalidate a specific key or keys starting with a prefix
	 */
	async invalidate(patternOrKey: string): Promise<void> {
		if (this.isRedisActive && this.redis) {
			try {
				if (patternOrKey.endsWith("*")) {
					const keys = await this.redis.keys(patternOrKey);
					if (keys.length > 0) {
						await this.redis.del(...keys);
					}
				} else {
					await this.redis.del(patternOrKey);
				}
			} catch {
				// Fallback continues below
			}
		}

		this.memoryStore.delete(patternOrKey);
		const prefix = patternOrKey.replace(/\*$/, "");
		for (const key of this.memoryStore.keys()) {
			if (key.startsWith(prefix)) {
				this.memoryStore.delete(key);
			}
		}
	}

	/**
	 * Cache-aside helper
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
	 * Sliding window rate limiter powered by Redis atomic INCR + EXPIRE
	 */
	async checkRateLimit(
		key: string,
		maxRequests: number,
		windowSeconds: number,
	): Promise<{ allowed: boolean; remaining: number; resetSeconds: number }> {
		const rateKey = `ratelimit:${key}`;

		if (this.isRedisActive && this.redis) {
			try {
				const count = await this.redis.incr(rateKey);
				if (count === 1) {
					await this.redis.expire(rateKey, windowSeconds);
				}
				const ttl = await this.redis.ttl(rateKey);
				const remaining = Math.max(0, maxRequests - count);

				return {
					allowed: count <= maxRequests,
					remaining,
					resetSeconds: ttl > 0 ? ttl : windowSeconds,
				};
			} catch {
				// Fall through to memoryStore
			}
		}

		// In-memory fallback
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

		return {
			allowed: count <= maxRequests,
			remaining: Math.max(0, maxRequests - count),
			resetSeconds: Math.max(1, Math.ceil((expiresAt - now) / 1000)),
		};
	}

	/**
	 * Atomic post view counter with HyperLogLog unique visitor deduplication:
	 * Decoupled from direct MariaDB writes to prevent table/row write locks.
	 */
	async recordPostView(
		postId: number,
		visitorHash = "anonymous",
	): Promise<{ totalViews: number; isNewView: boolean }> {
		if (this.isRedisActive && this.redis) {
			try {
				const hllKey = `post:${postId}:unique_views`;
				const viewsCounterKey = `post:${postId}:views`;

				// Redis HyperLogLog: returns 1 if new unique visitor, 0 if already seen
				const isNew = await this.redis.pfadd(hllKey, visitorHash);
				if (isNew === 1) {
					const totalViews = await this.redis.incr(viewsCounterKey);
					return { totalViews, isNewView: true };
				}

				const current = await this.redis.get(viewsCounterKey);
				return { totalViews: current ? parseInt(current, 10) : 0, isNewView: false };
			} catch {
				// Fall through to memory store
			}
		}

		// In-memory fallback
		const dedupeKey = `${postId}:${visitorHash}`;
		const now = Date.now();
		const cooldownMs = 10 * 60 * 1000; // 10 minutes

		const lastViewTime = this.recentViewers.get(dedupeKey);
		if (lastViewTime && now - lastViewTime < cooldownMs) {
			const currentDirty = this.dirtyPostViews.get(postId) || 0;
			return { totalViews: currentDirty, isNewView: false };
		}

		this.recentViewers.set(dedupeKey, now);
		const currentDirty = (this.dirtyPostViews.get(postId) || 0) + 1;
		this.dirtyPostViews.set(postId, currentDirty);

		return { totalViews: currentDirty, isNewView: true };
	}

	/**
	 * Atomic post reactions using Redis Hash or in-memory map
	 * reactionType: "claps" | "fire" | "insight" | "heart"
	 */
	async recordPostReaction(
		postId: number,
		reactionType: string,
	): Promise<number> {
		if (this.isRedisActive && this.redis) {
			try {
				const key = `post:${postId}:reactions`;
				const count = await this.redis.hincrby(key, reactionType, 1);
				return count;
			} catch {
				// Fall through to memoryStore
			}
		}

		const key = `post:${postId}:reactions:${reactionType}`;
		const current = (this.memoryStore.get(key)?.value as number) || 0;
		const next = current + 1;
		this.memoryStore.set(key, { value: next, expiresAt: null });
		return next;
	}

	async getPostReactions(postId: number): Promise<Record<string, number>> {
		if (this.isRedisActive && this.redis) {
			try {
				const key = `post:${postId}:reactions`;
				const raw = await this.redis.hgetall(key);
				const reactions: Record<string, number> = {};
				for (const [k, v] of Object.entries(raw)) {
					reactions[k] = parseInt(v, 10) || 0;
				}
				return reactions;
			} catch {
				// Fall through to memoryStore
			}
		}

		const reactions: Record<string, number> = {};
		for (const type of ["claps", "fire", "insight", "heart"]) {
			const key = `post:${postId}:reactions:${type}`;
			reactions[type] = (this.memoryStore.get(key)?.value as number) || 0;
		}
		return reactions;
	}

	/**
	 * Flush pending in-memory views to MariaDB in batch
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
				const current = this.dirtyPostViews.get(postId) || 0;
				this.dirtyPostViews.set(postId, current + count);
			}
		}

		return updatedCount;
	}

	/**
	 * Disconnect Redis client cleanly (used on server shutdown or tests)
	 */
	async disconnect(): Promise<void> {
		if (this.redis) {
			try {
				await this.redis.quit();
			} catch {
				this.redis.disconnect();
			}
			this.redis = null;
			this.isConnected = false;
		}
	}

	/**
	 * Reset in-memory store
	 */
	clear(): void {
		this.memoryStore.clear();
		this.recentViewers.clear();
		this.dirtyPostViews.clear();
	}
}

export const redis = new ResilientRedisStore();
export const cache = redis; // alias for backwards compatibility
