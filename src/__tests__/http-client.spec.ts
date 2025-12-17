/**
 * HTTP Client Tests
 * @module __tests__/http-client
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createHttpClient } from '../http-client.js'
import type { HttpClient } from '../types/index.js'

// Mock fetch globally
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('createHttpClient', () => {
	let client: HttpClient

	beforeEach(() => {
		vi.clearAllMocks()
		client = createHttpClient({
			baseUrl: 'https://api.example.com',
			cache: false, // Disable cache for predictable tests
		})
	})

	afterEach(() => {
		vi.restoreAllMocks()
	})

	describe('factory', () => {
		it('should create a client with default configuration', () => {
			const defaultClient = createHttpClient()

			expect(defaultClient).toBeDefined()
			expect(defaultClient.get).toBeDefined()
			expect(defaultClient.post).toBeDefined()
			expect(defaultClient.put).toBeDefined()
			expect(defaultClient.patch).toBeDefined()
			expect(defaultClient.delete).toBeDefined()
			expect(defaultClient.head).toBeDefined()
			expect(defaultClient.options).toBeDefined()
		})

		it('should provide fluent configuration methods', () => {
			const defaultClient = createHttpClient()

			expect(defaultClient.withHeaders).toBeDefined()
			expect(defaultClient.withTimeout).toBeDefined()
			expect(defaultClient.withRetry).toBeDefined()
			expect(defaultClient.withAuth).toBeDefined()
			expect(defaultClient.withBasicAuth).toBeDefined()
			expect(defaultClient.noCache).toBeDefined()
			expect(defaultClient.noRetry).toBeDefined()
		})

		it('should provide cache management methods', () => {
			const defaultClient = createHttpClient()

			expect(defaultClient.clearCache).toBeDefined()
			expect(defaultClient.getCacheStats).toBeDefined()
		})
	})

	describe('HTTP methods', () => {
		it('should make GET requests', async () => {
			const mockData = { id: 1, name: 'Test User' }
			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				statusText: 'OK',
				headers: new Headers({ 'content-type': 'application/json' }),
				url: 'https://api.example.com/users/1',
				redirected: false,
				json: () => Promise.resolve(mockData),
			})

			const result = await client.get<typeof mockData>('/users/1')

			expect(result.success).toBe(true)
			if (result.success) {
				expect(result.data).toEqual(mockData)
				expect(result.response.status).toBe(200)
			}
			expect(mockFetch).toHaveBeenCalledWith(
				'https://api.example.com/users/1',
				expect.objectContaining({
					method: 'GET',
				}),
			)
		})

		it('should make POST requests with body', async () => {
			const requestBody = { name: 'New User', email: 'new@example.com' }
			const mockResponse = { id: 2, ...requestBody }

			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 201,
				statusText: 'Created',
				headers: new Headers({ 'content-type': 'application/json' }),
				url: 'https://api.example.com/users',
				redirected: false,
				json: () => Promise.resolve(mockResponse),
			})

			const result = await client.post<typeof mockResponse>(
				'/users',
				requestBody,
			)

			expect(result.success).toBe(true)
			if (result.success) {
				expect(result.data).toEqual(mockResponse)
				expect(result.response.status).toBe(201)
			}
			expect(mockFetch).toHaveBeenCalledWith(
				'https://api.example.com/users',
				expect.objectContaining({
					method: 'POST',
					body: JSON.stringify(requestBody),
				}),
			)
		})

		it('should make PUT requests', async () => {
			const requestBody = { name: 'Updated User' }
			const mockResponse = { id: 1, ...requestBody }

			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				statusText: 'OK',
				headers: new Headers({ 'content-type': 'application/json' }),
				url: 'https://api.example.com/users/1',
				redirected: false,
				json: () => Promise.resolve(mockResponse),
			})

			const result = await client.put<typeof mockResponse>(
				'/users/1',
				requestBody,
			)

			expect(result.success).toBe(true)
			expect(mockFetch).toHaveBeenCalledWith(
				'https://api.example.com/users/1',
				expect.objectContaining({
					method: 'PUT',
					body: JSON.stringify(requestBody),
				}),
			)
		})

		it('should make PATCH requests', async () => {
			const requestBody = { name: 'Patched User' }
			const mockResponse = { id: 1, ...requestBody }

			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				statusText: 'OK',
				headers: new Headers({ 'content-type': 'application/json' }),
				url: 'https://api.example.com/users/1',
				redirected: false,
				json: () => Promise.resolve(mockResponse),
			})

			const result = await client.patch<typeof mockResponse>(
				'/users/1',
				requestBody,
			)

			expect(result.success).toBe(true)
			expect(mockFetch).toHaveBeenCalledWith(
				'https://api.example.com/users/1',
				expect.objectContaining({
					method: 'PATCH',
					body: JSON.stringify(requestBody),
				}),
			)
		})

		it('should make DELETE requests', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 204,
				statusText: 'No Content',
				headers: new Headers(),
				url: 'https://api.example.com/users/1',
				redirected: false,
				text: () => Promise.resolve(''),
			})

			const result = await client.delete('/users/1')

			expect(result.success).toBe(true)
			expect(mockFetch).toHaveBeenCalledWith(
				'https://api.example.com/users/1',
				expect.objectContaining({
					method: 'DELETE',
				}),
			)
		})

		it('should make HEAD requests', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				statusText: 'OK',
				headers: new Headers({ 'content-length': '1234' }),
				url: 'https://api.example.com/users/1',
				redirected: false,
				text: () => Promise.resolve(''), // HEAD responses have empty body
			})

			const result = await client.head('/users/1')

			expect(result.success).toBe(true)
			expect(mockFetch).toHaveBeenCalledWith(
				'https://api.example.com/users/1',
				expect.objectContaining({
					method: 'HEAD',
				}),
			)
		})
	})

	describe('error handling', () => {
		it('should handle 4xx client errors', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 404,
				statusText: 'Not Found',
				headers: new Headers({ 'content-type': 'application/json' }),
				url: 'https://api.example.com/users/999',
				redirected: false,
				text: () => Promise.resolve('{"error": "User not found"}'),
			})

			const result = await client.get('/users/999')

			expect(result.success).toBe(false)
			if (!result.success) {
				expect(result.error.code).toBe('CLIENT_ERROR')
				expect(result.error.status).toBe(404)
			}
		})

		it('should handle 5xx server errors', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 500,
				statusText: 'Internal Server Error',
				headers: new Headers({ 'content-type': 'application/json' }),
				url: 'https://api.example.com/users',
				redirected: false,
				text: () => Promise.resolve('Internal Server Error'),
			})

			const result = await client.get('/users')

			expect(result.success).toBe(false)
			if (!result.success) {
				expect(result.error.code).toBe('SERVER_ERROR')
				expect(result.error.status).toBe(500)
			}
		})

		it('should handle network errors', async () => {
			mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'))

			const result = await client.get('/users')

			expect(result.success).toBe(false)
			if (!result.success) {
				expect(result.error.code).toBe('NETWORK_ERROR')
			}
		})

		it('should handle abort errors', async () => {
			const abortError = new DOMException(
				'The operation was aborted',
				'AbortError',
			)
			mockFetch.mockRejectedValueOnce(abortError)

			const result = await client.get('/users')

			expect(result.success).toBe(false)
			if (!result.success) {
				expect(result.error.code).toBe('ABORT_ERROR')
			}
		})
	})

	describe('fluent configuration', () => {
		it('should create new client with custom headers', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				statusText: 'OK',
				headers: new Headers({ 'content-type': 'application/json' }),
				url: 'https://api.example.com/users',
				redirected: false,
				json: () => Promise.resolve([]),
			})

			const customClient = client.withHeaders({
				'X-Custom-Header': 'custom-value',
			})
			await customClient.get('/users')

			expect(mockFetch).toHaveBeenCalledWith(
				'https://api.example.com/users',
				expect.objectContaining({
					headers: expect.any(Headers),
				}),
			)
		})

		it('should create new client with auth token', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				statusText: 'OK',
				headers: new Headers({ 'content-type': 'application/json' }),
				url: 'https://api.example.com/protected',
				redirected: false,
				json: () => Promise.resolve({ secret: 'data' }),
			})

			const authClient = client.withAuth('my-secret-token')
			await authClient.get('/protected')

			expect(mockFetch).toHaveBeenCalledWith(
				'https://api.example.com/protected',
				expect.objectContaining({
					headers: expect.any(Headers),
				}),
			)

			// Verify Authorization header was set
			const callArgs = mockFetch.mock.calls[0]
			expect(callArgs).toBeDefined()
			const headers = callArgs![1].headers as Headers
			expect(headers.get('Authorization')).toBe('Bearer my-secret-token')
		})

		it('should create immutable client instances', () => {
			const originalClient = createHttpClient({
				baseUrl: 'https://api.example.com',
			})
			const modifiedClient = originalClient.withTimeout(5000)

			// They should be different instances
			expect(originalClient).not.toBe(modifiedClient)
		})
	})

	describe('query parameters', () => {
		it('should append query parameters to URL', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				statusText: 'OK',
				headers: new Headers({ 'content-type': 'application/json' }),
				url: 'https://api.example.com/users',
				redirected: false,
				json: () => Promise.resolve([]),
			})

			await client.get('/users', {
				params: { page: 1, limit: 10, active: true },
			})

			expect(mockFetch).toHaveBeenCalledWith(
				'https://api.example.com/users?page=1&limit=10&active=true',
				expect.any(Object),
			)
		})

		it('should skip undefined query parameters', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				statusText: 'OK',
				headers: new Headers({ 'content-type': 'application/json' }),
				url: 'https://api.example.com/users',
				redirected: false,
				json: () => Promise.resolve([]),
			})

			await client.get('/users', {
				params: { page: 1, filter: undefined },
			})

			expect(mockFetch).toHaveBeenCalledWith(
				'https://api.example.com/users?page=1',
				expect.any(Object),
			)
		})
	})

	describe('cache stats', () => {
		it('should return empty stats when cache is disabled', () => {
			const stats = client.getCacheStats()

			expect(stats).toEqual({
				size: 0,
				maxSize: 0,
				hits: 0,
				misses: 0,
				staleHits: 0,
				evictions: 0,
			})
		})

		it('should track cache stats when cache is enabled', async () => {
			const cachedClient = createHttpClient({
				baseUrl: 'https://api.example.com',
				cache: { maxEntries: 100, ttl: 60000 },
			})

			mockFetch.mockResolvedValue({
				ok: true,
				status: 200,
				statusText: 'OK',
				headers: new Headers({ 'content-type': 'application/json' }),
				url: 'https://api.example.com/users/1',
				redirected: false,
				json: () => Promise.resolve({ id: 1 }),
			})

			// First request - cache miss
			await cachedClient.get('/users/1')

			// Second request - cache hit
			await cachedClient.get('/users/1')

			const stats = cachedClient.getCacheStats()

			expect(stats.hits).toBe(1)
			expect(stats.misses).toBe(1)
		})
	})
})
