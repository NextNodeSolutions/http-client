/**
 * Cache Types
 * @module types/cache
 */

import type { HttpMethod, RequestConfig } from './request.js'

/**
 * Cache configuration
 */
export interface CacheConfig {
	/** Maximum cache entries (LRU eviction) */
	readonly maxEntries?: number
	/** Default TTL in milliseconds */
	readonly ttl?: number
	/** Stale-while-revalidate window in milliseconds */
	readonly staleWhileRevalidate?: number
	/** Enable request deduplication */
	readonly deduplicate?: boolean
	/** Methods to cache (default: GET, HEAD) */
	readonly methods?: readonly HttpMethod[]
	/** Custom cache key generator */
	readonly keyGenerator?: (config: RequestConfig) => string
}

/**
 * Cache entry stored internally
 */
export interface CacheEntry<T> {
	readonly data: T
	readonly timestamp: number
	readonly ttl: number
	readonly staleUntil: number
}

/**
 * Cache statistics
 */
export interface CacheStats {
	readonly size: number
	readonly maxSize: number
	readonly hits: number
	readonly misses: number
	readonly staleHits: number
	readonly evictions: number
}
