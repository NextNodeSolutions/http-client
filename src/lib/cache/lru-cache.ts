/**
 * LRU Cache with TTL Support
 * @module lib/cache/lru-cache
 */

import type {
	CacheConfig,
	CacheEntry,
	CacheStats,
	HttpResult,
	RequestConfig,
	ResponseMeta,
} from '../../types/index.js'
import { cacheLogger } from '../../utils/logger.js'
import { generateCacheKey } from './cache-key.js'

/**
 * Options for setting a cache entry
 */
export interface CacheSetOptions {
	/** Override TTL for this entry (ms) */
	readonly ttl?: number
	/** Tags for grouped invalidation */
	readonly tags?: readonly string[]
	/** ETag from response */
	readonly etag?: string
	/** Last-Modified from response */
	readonly lastModified?: string
}

/**
 * LRU Cache interface
 */
export interface LRUCache {
	get<T>(config: RequestConfig): HttpResult<T> | null
	set<T>(
		config: RequestConfig,
		result: HttpResult<T>,
		options?: CacheSetOptions,
	): void
	delete(config: RequestConfig): boolean
	clear(): void
	getStats(): CacheStats
	has(config: RequestConfig): boolean
	isStale(config: RequestConfig): boolean
	/** Get all cache keys (for pattern matching) */
	keys(): IterableIterator<string>
	/** Delete entries by key directly */
	deleteByKey(key: string): boolean
}

/**
 * Create LRU cache instance
 */
export const createLRUCache = (
	config: CacheConfig,
	debug = false,
): LRUCache => {
	const maxEntries = config.maxEntries ?? 100
	const defaultTtl = config.ttl ?? 60000 // 1 minute
	const staleWindow = config.staleWhileRevalidate ?? 0
	const keyGenerator = config.keyGenerator ?? generateCacheKey

	// Map preserves insertion order for LRU eviction
	const cache = new Map<string, CacheEntry<HttpResult<unknown>>>()
	let hits = 0
	let misses = 0
	let staleHits = 0
	let evictions = 0

	const get = <T>(requestConfig: RequestConfig): HttpResult<T> | null => {
		const key = keyGenerator(requestConfig)
		const entry = cache.get(key)

		if (!entry) {
			misses += 1
			return null
		}

		const now = Date.now()

		// Check if completely expired (beyond stale window)
		if (now > entry.staleUntil) {
			cache.delete(key)
			misses += 1
			return null
		}

		// Move to end (most recently used)
		cache.delete(key)
		cache.set(key, entry)

		const result = entry.data as HttpResult<T>

		// Check if fresh
		if (now <= entry.timestamp + entry.ttl) {
			hits += 1

			if (debug) {
				cacheLogger.info('Cache hit (fresh)', { details: { key } })
			}

			return updateResponseMeta(result, 'fresh')
		}

		// Stale but within revalidate window
		staleHits += 1

		if (debug) {
			cacheLogger.info('Cache hit (stale)', { details: { key } })
		}

		return updateResponseMeta(result, 'stale')
	}

	const set = <T>(
		requestConfig: RequestConfig,
		result: HttpResult<T>,
		options?: CacheSetOptions,
	): void => {
		// Don't cache errors
		if (!result.success) return

		const key = keyGenerator(requestConfig)
		const now = Date.now()

		// Evict oldest entry if at capacity
		if (cache.size >= maxEntries) {
			const firstKey = cache.keys().next().value
			if (firstKey) {
				cache.delete(firstKey)
				evictions += 1

				if (debug) {
					cacheLogger.info('Cache eviction (LRU)', {
						details: { key: firstKey },
					})
				}
			}
		}

		// Use per-request TTL if provided, otherwise default
		const entryTtl = options?.ttl ?? defaultTtl

		const entry: CacheEntry<HttpResult<T>> = {
			data: result,
			timestamp: now,
			ttl: entryTtl,
			staleUntil: now + entryTtl + staleWindow,
			...(options?.etag && { etag: options.etag }),
			...(options?.lastModified && {
				lastModified: options.lastModified,
			}),
			...(options?.tags?.length && { tags: options.tags }),
		}

		cache.set(key, entry)

		if (debug) {
			cacheLogger.info('Cache set', { details: { key, ttl: entryTtl } })
		}
	}

	const del = (requestConfig: RequestConfig): boolean => {
		const key = keyGenerator(requestConfig)
		return cache.delete(key)
	}

	const clear = (): void => {
		cache.clear()
		hits = 0
		misses = 0
		staleHits = 0
		evictions = 0
	}

	const getStats = (): CacheStats => ({
		size: cache.size,
		maxSize: maxEntries,
		hits,
		misses,
		staleHits,
		evictions,
	})

	const has = (requestConfig: RequestConfig): boolean => {
		const key = keyGenerator(requestConfig)
		const entry = cache.get(key)

		if (!entry) return false

		// Check if completely expired
		if (Date.now() > entry.staleUntil) {
			cache.delete(key)
			return false
		}

		return true
	}

	const isStale = (requestConfig: RequestConfig): boolean => {
		const key = keyGenerator(requestConfig)
		const entry = cache.get(key)

		if (!entry) return true

		const now = Date.now()

		// Fresh - only case where entry is not stale
		if (now <= entry.timestamp + entry.ttl) return false

		// Expired or stale
		return true
	}

	const getKeys = (): IterableIterator<string> => cache.keys()

	const deleteByKey = (key: string): boolean => cache.delete(key)

	return {
		get,
		set,
		delete: del,
		clear,
		getStats,
		has,
		isStale,
		keys: getKeys,
		deleteByKey,
	}
}

/**
 * Update response meta with cache hit status
 */
const updateResponseMeta = <T>(
	result: HttpResult<T>,
	cacheHit: 'fresh' | 'stale',
): HttpResult<T> => {
	if (!result.success) return result

	return {
		...result,
		response: {
			...result.response,
			cached: true,
			cacheHit,
		} as ResponseMeta,
	}
}
