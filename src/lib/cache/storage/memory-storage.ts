/**
 * In-Memory Cache Storage
 * @module lib/cache/storage/memory-storage
 */

import type { CacheEntry, CacheStorage } from '../../../types/index.js'

/**
 * Configuration for memory storage
 */
export interface MemoryStorageConfig {
	/** Maximum entries before LRU eviction */
	readonly maxEntries?: number
}

/**
 * Create in-memory storage adapter with LRU eviction
 * Uses Map which preserves insertion order for O(1) LRU operations
 */
export const createMemoryStorage = <T = unknown>(
	config: MemoryStorageConfig = {},
): CacheStorage<T> => {
	const maxEntries = config.maxEntries ?? 100 // intentional fallback - reasonable default limit
	const store = new Map<string, CacheEntry<T>>()

	const get = (key: string): CacheEntry<T> | null => store.get(key) ?? null

	const set = (key: string, entry: CacheEntry<T>): void => {
		// LRU: if key exists, delete first to update insertion order
		if (store.has(key)) {
			store.delete(key)
		}

		// Evict oldest entry if at capacity
		if (store.size >= maxEntries) {
			const firstKey = store.keys().next().value
			if (firstKey !== undefined) {
				store.delete(firstKey)
			}
		}

		store.set(key, entry)
	}

	const del = (key: string): boolean => store.delete(key)

	const clear = (): void => {
		store.clear()
	}

	const has = (key: string): boolean => store.has(key)

	const keys = (): IterableIterator<string> => store.keys()

	return {
		get,
		set,
		delete: del,
		clear,
		has,
		keys,
		get size() {
			return store.size
		},
	}
}
