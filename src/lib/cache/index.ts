/**
 * Cache Module - Barrel Export
 * @module lib/cache
 */

import type { CacheConfig, HttpMethod } from '../../types/index.js'
import type { Deduplicator } from './deduplicator.js'
import { createDeduplicator } from './deduplicator.js'
import type { LRUCache } from './lru-cache.js'
import { createLRUCache } from './lru-cache.js'
import type { SWRCache } from './swr-cache.js'
import { createSWRCache } from './swr-cache.js'

export { generateCacheKey } from './cache-key.js'
export { createDeduplicator, type Deduplicator } from './deduplicator.js'
export { createLRUCache, type LRUCache } from './lru-cache.js'
export { createSWRCache, type SWRCache } from './swr-cache.js'

/**
 * Unified cache system
 */
export interface CacheSystem {
	lru: LRUCache
	swr: SWRCache
	deduplicator: Deduplicator
	isCacheable: (method: HttpMethod) => boolean
}

/**
 * Default cacheable methods
 */
const DEFAULT_CACHEABLE_METHODS: readonly HttpMethod[] = ['GET', 'HEAD']

/**
 * Create unified cache system
 */
export const createCacheSystem = (
	config: CacheConfig,
	debug = false,
): CacheSystem => {
	const lru = createLRUCache(config, debug)
	const swr = createSWRCache(lru, debug)
	const deduplicator = createDeduplicator(debug)

	const cacheableMethods = config.methods ?? DEFAULT_CACHEABLE_METHODS

	const isCacheable = (method: HttpMethod): boolean =>
		cacheableMethods.includes(method)

	return {
		lru,
		swr,
		deduplicator,
		isCacheable,
	}
}
