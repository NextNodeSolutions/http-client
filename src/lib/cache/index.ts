/**
 * Cache Module - Barrel Export
 * @module lib/cache
 */

import type { CacheConfig, CacheMode, HttpMethod } from '../../types/index.js'
import type { Deduplicator } from './deduplicator.js'
import { createDeduplicator } from './deduplicator.js'
import type { LRUCache } from './lru-cache.js'
import { createLRUCache } from './lru-cache.js'
import type { SWRCache } from './swr-cache.js'
import { createSWRCache } from './swr-cache.js'
import type { TagRegistry } from './tag-registry.js'
import { createTagRegistry } from './tag-registry.js'

export {
	calculateTtl,
	isCacheableResponse,
	needsRevalidation,
	parseCacheControl,
} from './cache-control.js'
export { generateCacheKey, generateVaryAwareCacheKey } from './cache-key.js'
export { createDeduplicator, type Deduplicator } from './deduplicator.js'
export {
	type CacheSetOptions,
	createLRUCache,
	type LRUCache,
} from './lru-cache.js'
export {
	createLocalStorage,
	createMemoryStorage,
	type LocalStorageConfig,
	type MemoryStorageConfig,
} from './storage/index.js'
export { createSWRCache, type SWRCache } from './swr-cache.js'
export { createTagRegistry, type TagRegistry } from './tag-registry.js'

/**
 * Unified cache system
 */
export interface CacheSystem {
	readonly lru: LRUCache
	readonly swr: SWRCache
	readonly deduplicator: Deduplicator
	readonly tags: TagRegistry
	readonly mode: CacheMode
	readonly varyHeaders: readonly string[]
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
	const tags = createTagRegistry()

	const cacheableMethods = config.methods ?? DEFAULT_CACHEABLE_METHODS
	const mode = config.mode ?? 'standard' // intentional fallback - default HTTP-compliant mode
	const varyHeaders = config.varyHeaders ?? [] // intentional fallback - no vary headers by default

	const isCacheable = (method: HttpMethod): boolean =>
		cacheableMethods.includes(method)

	return {
		lru,
		swr,
		deduplicator,
		tags,
		mode,
		varyHeaders,
		isCacheable,
	}
}
