/**
 * Cache Types
 * @module types/cache
 */

import type { HttpMethod, RequestConfig } from './request.js'

/**
 * Cache mode controlling caching behavior
 * - 'standard': Respect HTTP Cache-Control headers (default, HTTP-compliant)
 * - 'force': Cache everything cacheable, ignore server directives
 * - 'manual': Only cache when explicitly requested per-request
 * - 'off': Disable caching entirely
 */
export type CacheMode = 'standard' | 'force' | 'manual' | 'off'

/**
 * Parsed Cache-Control directives from response headers
 */
export interface CacheControlDirectives {
	readonly noStore: boolean
	readonly noCache: boolean
	readonly maxAge?: number
	readonly sMaxAge?: number
	readonly private: boolean
	readonly public: boolean
	readonly mustRevalidate: boolean
	readonly immutable: boolean
}

/**
 * Storage adapter interface for pluggable cache backends
 */
export interface CacheStorage<T = unknown> {
	get(key: string): CacheEntry<T> | null
	set(key: string, entry: CacheEntry<T>): void
	delete(key: string): boolean
	clear(): void
	has(key: string): boolean
	keys(): IterableIterator<string>
	readonly size: number
}

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
	/** Cache mode (default: 'standard') */
	readonly mode?: CacheMode
	/** Custom storage adapter (default: in-memory) */
	readonly storage?: CacheStorage
	/** Headers to vary cache key on */
	readonly varyHeaders?: readonly string[]
	/** Auto-tagging functions by tag name */
	readonly tags?: Readonly<
		Record<string, (config: RequestConfig) => readonly string[]>
	>
}

/**
 * Cache entry stored internally
 */
export interface CacheEntry<T> {
	readonly data: T
	readonly timestamp: number
	readonly ttl: number
	readonly staleUntil: number
	/** ETag from response for conditional requests */
	readonly etag?: string
	/** Last-Modified from response for conditional requests */
	readonly lastModified?: string
	/** Vary header values used in cache key */
	readonly varyHeaders?: Readonly<Record<string, string>>
	/** Tags for grouped invalidation */
	readonly tags?: readonly string[]
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
