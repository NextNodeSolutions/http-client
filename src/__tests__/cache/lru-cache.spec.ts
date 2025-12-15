/**
 * LRU Cache Tests
 * @module __tests__/cache/lru-cache
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createLRUCache } from '../../lib/cache/lru-cache.js'
import type { HttpResult } from '../../types/index.js'

describe('createLRUCache', () => {
	beforeEach(() => {
		vi.useFakeTimers()
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	const createMockResult = <T>(data: T): HttpResult<T> => ({
		success: true,
		data,
		response: {
			status: 200,
			statusText: 'OK',
			headers: new Headers(),
			url: 'https://api.example.com/test',
			redirected: false,
			duration: 100,
			cached: false,
		},
	})

	describe('basic operations', () => {
		it('should store and retrieve values', () => {
			const cache = createLRUCache({ maxEntries: 10, ttl: 60000 })
			const request = { method: 'GET' as const, url: '/test' }
			const result = createMockResult({ id: 1, name: 'Test' })

			cache.set(request, result)
			const cached = cache.get<{ id: number; name: string }>(request)

			expect(cached).toBeDefined()
			expect(cached?.success).toBe(true)
			if (cached?.success) {
				expect(cached.data).toEqual({ id: 1, name: 'Test' })
				expect(cached.response.cached).toBe(true)
			}
		})

		it('should return null for missing keys', () => {
			const cache = createLRUCache({ maxEntries: 10, ttl: 60000 })
			const request = { method: 'GET' as const, url: '/missing' }

			const cached = cache.get(request)

			expect(cached).toBeNull()
		})

		it('should check if key exists', () => {
			const cache = createLRUCache({ maxEntries: 10, ttl: 60000 })
			const request = { method: 'GET' as const, url: '/test' }
			const result = createMockResult({ id: 1 })

			expect(cache.has(request)).toBe(false)

			cache.set(request, result)

			expect(cache.has(request)).toBe(true)
		})

		it('should delete entries', () => {
			const cache = createLRUCache({ maxEntries: 10, ttl: 60000 })
			const request = { method: 'GET' as const, url: '/test' }
			const result = createMockResult({ id: 1 })

			cache.set(request, result)
			expect(cache.has(request)).toBe(true)

			const deleted = cache.delete(request)

			expect(deleted).toBe(true)
			expect(cache.has(request)).toBe(false)
		})

		it('should clear all entries', () => {
			const cache = createLRUCache({ maxEntries: 10, ttl: 60000 })

			cache.set(
				{ method: 'GET' as const, url: '/test1' },
				createMockResult({ id: 1 }),
			)
			cache.set(
				{ method: 'GET' as const, url: '/test2' },
				createMockResult({ id: 2 }),
			)
			cache.set(
				{ method: 'GET' as const, url: '/test3' },
				createMockResult({ id: 3 }),
			)

			expect(cache.getStats().size).toBe(3)

			cache.clear()

			expect(cache.getStats().size).toBe(0)
		})
	})

	describe('TTL expiration', () => {
		it('should expire entries after TTL', () => {
			const cache = createLRUCache({ maxEntries: 10, ttl: 1000 })
			const request = { method: 'GET' as const, url: '/test' }
			const result = createMockResult({ id: 1 })

			cache.set(request, result)
			expect(cache.get(request)).not.toBeNull()

			// Advance time past TTL
			vi.advanceTimersByTime(1001)

			expect(cache.get(request)).toBeNull()
		})

		it('should not expire entries before TTL', () => {
			const cache = createLRUCache({ maxEntries: 10, ttl: 1000 })
			const request = { method: 'GET' as const, url: '/test' }
			const result = createMockResult({ id: 1 })

			cache.set(request, result)

			// Advance time but stay within TTL
			vi.advanceTimersByTime(500)

			expect(cache.get(request)).toBeDefined()
		})
	})

	describe('LRU eviction', () => {
		it('should evict least recently used when at capacity', () => {
			const cache = createLRUCache({ maxEntries: 2, ttl: 60000 })

			cache.set(
				{ method: 'GET' as const, url: '/first' },
				createMockResult({ id: 1 }),
			)
			cache.set(
				{ method: 'GET' as const, url: '/second' },
				createMockResult({ id: 2 }),
			)
			cache.set(
				{ method: 'GET' as const, url: '/third' },
				createMockResult({ id: 3 }),
			)

			// First should be evicted
			expect(cache.has({ method: 'GET' as const, url: '/first' })).toBe(
				false,
			)
			expect(cache.has({ method: 'GET' as const, url: '/second' })).toBe(
				true,
			)
			expect(cache.has({ method: 'GET' as const, url: '/third' })).toBe(
				true,
			)
		})

		it('should update LRU order on get', () => {
			const cache = createLRUCache({ maxEntries: 2, ttl: 60000 })

			cache.set(
				{ method: 'GET' as const, url: '/first' },
				createMockResult({ id: 1 }),
			)
			cache.set(
				{ method: 'GET' as const, url: '/second' },
				createMockResult({ id: 2 }),
			)

			// Access first to make it recently used
			cache.get({ method: 'GET' as const, url: '/first' })

			// Add third - should evict second (now least recently used)
			cache.set(
				{ method: 'GET' as const, url: '/third' },
				createMockResult({ id: 3 }),
			)

			expect(cache.has({ method: 'GET' as const, url: '/first' })).toBe(
				true,
			)
			expect(cache.has({ method: 'GET' as const, url: '/second' })).toBe(
				false,
			)
			expect(cache.has({ method: 'GET' as const, url: '/third' })).toBe(
				true,
			)
		})
	})

	describe('statistics', () => {
		it('should track cache hits', () => {
			const cache = createLRUCache({ maxEntries: 10, ttl: 60000 })
			const request = { method: 'GET' as const, url: '/test' }

			cache.set(request, createMockResult({ id: 1 }))
			cache.get(request)
			cache.get(request)
			cache.get(request)

			const stats = cache.getStats()
			expect(stats.hits).toBe(3)
		})

		it('should track cache misses', () => {
			const cache = createLRUCache({ maxEntries: 10, ttl: 60000 })

			cache.get({ method: 'GET' as const, url: '/missing1' })
			cache.get({ method: 'GET' as const, url: '/missing2' })

			const stats = cache.getStats()
			expect(stats.misses).toBe(2)
		})

		it('should track evictions', () => {
			const cache = createLRUCache({ maxEntries: 2, ttl: 60000 })

			cache.set(
				{ method: 'GET' as const, url: '/test1' },
				createMockResult({ id: 1 }),
			)
			cache.set(
				{ method: 'GET' as const, url: '/test2' },
				createMockResult({ id: 2 }),
			)
			cache.set(
				{ method: 'GET' as const, url: '/test3' },
				createMockResult({ id: 3 }),
			)
			cache.set(
				{ method: 'GET' as const, url: '/test4' },
				createMockResult({ id: 4 }),
			)

			const stats = cache.getStats()
			expect(stats.evictions).toBe(2)
		})

		it('should report current size and max size', () => {
			const cache = createLRUCache({ maxEntries: 10, ttl: 60000 })

			cache.set(
				{ method: 'GET' as const, url: '/test1' },
				createMockResult({ id: 1 }),
			)
			cache.set(
				{ method: 'GET' as const, url: '/test2' },
				createMockResult({ id: 2 }),
			)

			const stats = cache.getStats()
			expect(stats.size).toBe(2)
			expect(stats.maxSize).toBe(10)
		})
	})

	describe('cache key generation', () => {
		it('should differentiate by HTTP method', () => {
			const cache = createLRUCache({ maxEntries: 10, ttl: 60000 })

			cache.set(
				{ method: 'GET' as const, url: '/test' },
				createMockResult({ method: 'GET' }),
			)
			cache.set(
				{ method: 'POST' as const, url: '/test' },
				createMockResult({ method: 'POST' }),
			)

			const getResult = cache.get<{ method: string }>({
				method: 'GET' as const,
				url: '/test',
			})
			const postResult = cache.get<{ method: string }>({
				method: 'POST' as const,
				url: '/test',
			})

			expect(getResult?.success && getResult.data.method).toBe('GET')
			expect(postResult?.success && postResult.data.method).toBe('POST')
		})

		it('should differentiate by query params', () => {
			const cache = createLRUCache({ maxEntries: 10, ttl: 60000 })

			cache.set(
				{ method: 'GET' as const, url: '/test', params: { page: 1 } },
				createMockResult({ page: 1 }),
			)
			cache.set(
				{ method: 'GET' as const, url: '/test', params: { page: 2 } },
				createMockResult({ page: 2 }),
			)

			const page1 = cache.get<{ page: number }>({
				method: 'GET' as const,
				url: '/test',
				params: { page: 1 },
			})
			const page2 = cache.get<{ page: number }>({
				method: 'GET' as const,
				url: '/test',
				params: { page: 2 },
			})

			expect(page1?.success && page1.data.page).toBe(1)
			expect(page2?.success && page2.data.page).toBe(2)
		})
	})
})
