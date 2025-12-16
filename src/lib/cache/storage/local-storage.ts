/**
 * LocalStorage Cache Adapter
 * @module lib/cache/storage/local-storage
 */

import type { CacheEntry, CacheStorage } from '../../../types/index.js'

/**
 * Configuration for localStorage adapter
 */
export interface LocalStorageConfig {
	/** Key prefix for namespacing (default: 'http-cache:') */
	readonly prefix?: string
	/** Maximum entries (default: 100) */
	readonly maxEntries?: number
}

/**
 * Create localStorage-based cache storage
 * Provides persistence across page reloads
 *
 * Note: Only works in browser environments where localStorage is available
 */
export const createLocalStorage = <T = unknown>(
	config: LocalStorageConfig = {},
): CacheStorage<T> => {
	const prefix = config.prefix ?? 'http-cache:' // intentional fallback - default namespace
	const maxEntries = config.maxEntries ?? 100 // intentional fallback - reasonable default limit

	const getFullKey = (key: string): string => prefix + key

	const getAllKeys = (): string[] => {
		const result: string[] = []
		for (let i = 0; i < localStorage.length; i++) {
			const fullKey = localStorage.key(i)
			if (fullKey?.startsWith(prefix)) {
				result.push(fullKey.slice(prefix.length))
			}
		}
		return result
	}

	const get = (key: string): CacheEntry<T> | null => {
		const fullKey = getFullKey(key)
		const item = localStorage.getItem(fullKey)
		if (!item) return null

		try {
			return JSON.parse(item) as CacheEntry<T>
		} catch {
			// Invalid JSON, remove corrupted entry
			localStorage.removeItem(fullKey)
			return null
		}
	}

	const set = (key: string, entry: CacheEntry<T>): void => {
		const fullKey = getFullKey(key)

		// Check capacity and evict oldest if needed
		const currentKeys = getAllKeys()
		if (currentKeys.length >= maxEntries && !currentKeys.includes(key)) {
			// Simple eviction: remove first key found (not true LRU, but simple)
			// For true LRU, we'd need to track access order separately
			const oldestKey = currentKeys[0]
			if (oldestKey) {
				localStorage.removeItem(getFullKey(oldestKey))
			}
		}

		try {
			localStorage.setItem(fullKey, JSON.stringify(entry))
		} catch {
			// localStorage full or quota exceeded
			// Try to clear some space by removing oldest entries
			const keys = getAllKeys()
			const toRemove = Math.ceil(keys.length / 4) // Remove 25%
			for (let i = 0; i < toRemove && i < keys.length; i++) {
				localStorage.removeItem(getFullKey(keys[i]!))
			}
			// Retry once
			try {
				localStorage.setItem(fullKey, JSON.stringify(entry))
			} catch {
				// Still failing, give up silently
			}
		}
	}

	const del = (key: string): boolean => {
		const fullKey = getFullKey(key)
		const existed = localStorage.getItem(fullKey) !== null
		localStorage.removeItem(fullKey)
		return existed
	}

	const clear = (): void => {
		const keys = getAllKeys()
		for (const key of keys) {
			localStorage.removeItem(getFullKey(key))
		}
	}

	const has = (key: string): boolean =>
		localStorage.getItem(getFullKey(key)) !== null

	const keys = function* (): IterableIterator<string> {
		const allKeys = getAllKeys()
		for (const key of allKeys) {
			yield key
		}
	}

	return {
		get,
		set,
		delete: del,
		clear,
		has,
		keys,
		get size() {
			return getAllKeys().length
		},
	}
}
