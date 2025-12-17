/**
 * Stale-While-Revalidate Cache Logic
 * @module lib/cache/swr-cache
 */

import type { HttpResult, RequestConfig } from '../../types/index.js'
import { cacheLogger } from '../../utils/logger.js'
import { generateCacheKey } from './cache-key.js'
import type { LRUCache } from './lru-cache.js'

/**
 * SWR Cache interface
 */
export interface SWRCache {
	getWithRevalidation<T>(
		config: RequestConfig,
		revalidate: () => Promise<HttpResult<T>>,
	): Promise<HttpResult<T>>
}

/**
 * Create SWR-enabled cache wrapper
 * Serves stale data immediately while revalidating in background
 */
export const createSWRCache = (cache: LRUCache, debug = false): SWRCache => {
	// Track ongoing revalidations to prevent duplicates
	const revalidating = new Set<string>()

	const getWithRevalidation = async <T>(
		config: RequestConfig,
		revalidate: () => Promise<HttpResult<T>>,
	): Promise<HttpResult<T>> => {
		const cached = cache.get<T>(config)

		// No cache - fetch and cache
		if (!cached) {
			const result = await revalidate()
			if (result.success) {
				cache.set(config, result)
			}
			return result
		}

		// Fresh cache - return immediately
		if (!cache.isStale(config)) {
			return cached
		}

		// Stale cache - return stale data and revalidate in background
		const key = generateCacheKey(config)

		if (!revalidating.has(key)) {
			revalidating.add(key)

			if (debug) {
				cacheLogger.info('SWR: Revalidating stale data in background', {
					details: { url: config.url },
				})
			}

			// Fire and forget - background revalidation
			revalidate()
				.then(result => {
					if (result.success) {
						cache.set(config, result)
					}
				})
				.catch(() => {
					// Ignore errors in background revalidation
					// Stale data is already being served
				})
				.finally(() => {
					revalidating.delete(key)
				})
		}

		return cached
	}

	return {
		getWithRevalidation,
	}
}
