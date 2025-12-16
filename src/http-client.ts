/**
 * HTTP Client Factory
 * @module http-client
 */

import type { Schema } from '@nextnode/validation'

import {
	isValidatedBody,
	validateRequestBody,
	validateResponse,
} from './integrations/validation/index.js'
import type { CacheSetOptions, CacheSystem } from './lib/cache/index.js'
import {
	createCacheSystem,
	generateVaryAwareCacheKey,
} from './lib/cache/index.js'
import { buildRequestContext, executeFetch } from './lib/client/index.js'
import type { InterceptorChain } from './lib/interceptors/index.js'
import { createInterceptorChain } from './lib/interceptors/index.js'
import type { RetryStrategy } from './lib/retry/index.js'
import { createRetryStrategy } from './lib/retry/index.js'
import type {
	CacheConfig,
	CacheStats,
	ErrorContext,
	HttpClient,
	HttpClientConfig,
	HttpResult,
	RequestConfig,
	RequestContext,
	RequestOptions,
	ResponseContext,
	RetryConfig,
} from './types/index.js'
import {
	createBasicAuthHeader,
	createBearerAuthHeader,
} from './utils/headers.js'

/**
 * Extract cache config object if available
 */
const getCacheConfig = (config: HttpClientConfig): CacheConfig | null => {
	if (!config.cache || typeof config.cache !== 'object') return null
	return config.cache
}

/**
 * Create an HTTP client instance
 *
 * @example
 * ```typescript
 * // Create configured client
 * const api = createHttpClient({
 *   baseUrl: 'https://api.example.com',
 *   timeout: 30000,
 *   cache: { maxEntries: 100, ttl: 60000 },
 *   retry: { maxRetries: 3 }
 * })
 *
 * // Simple GET (cached)
 * const result = await api.get<User>('/users/123')
 * if (result.success) {
 *   console.log(result.data.name)
 *   console.log(result.response.cached) // true/false
 * }
 *
 * // POST with body (not cached)
 * const createResult = await api.post<User>('/users', { name: 'John' })
 *
 * // Fluent configuration
 * const result = await api
 *   .withAuth('token')
 *   .withTimeout(60000)
 *   .noCache()
 *   .post<Order>('/orders', orderData)
 * ```
 */
export const createHttpClient = (config: HttpClientConfig = {}): HttpClient => {
	const debug = config.debug ?? false

	// Initialize cache system if enabled
	const cacheSystem: CacheSystem | null =
		config.cache !== false
			? createCacheSystem(config.cache ?? {}, debug)
			: null

	// Initialize interceptor chain
	const interceptorChain: InterceptorChain | null = config.interceptors
		? createInterceptorChain(config.interceptors, debug)
		: null

	// Initialize retry strategy if enabled
	const retryStrategy: RetryStrategy | null =
		config.retry !== false && config.retry
			? createRetryStrategy(config.retry, debug)
			: null

	/**
	 * Core fetch execution with interceptors and retry
	 */
	const executeCoreRequest = async <T>(
		initialContext: RequestContext,
		requestConfig: RequestConfig,
	): Promise<HttpResult<T>> => {
		let context = initialContext

		// Run beforeRequest interceptors
		if (interceptorChain) {
			const interceptorResult =
				await interceptorChain.runBeforeRequest(context)

			// Check if interceptor short-circuited with a result
			if ('success' in interceptorResult) {
				return interceptorResult as HttpResult<T>
			}

			// Use modified context
			context = interceptorResult
		}

		// Execute fetch (with or without retry)
		const shouldRetry =
			!requestConfig.noRetry && (retryStrategy || requestConfig.retry)

		let result: HttpResult<T>

		if (shouldRetry) {
			// Use per-request retry config if provided, otherwise use client retry strategy
			const strategy = requestConfig.retry
				? createRetryStrategy(requestConfig.retry, debug)
				: retryStrategy!

			result = await strategy.execute(() =>
				executeFetch<T>(context, config),
			)
		} else {
			result = await executeFetch<T>(context, config)
		}

		// Handle success - run afterResponse interceptors
		if (result.success && interceptorChain) {
			const responseContext: ResponseContext<T> = {
				request: context,
				response: result.response,
				data: result.data,
			}

			const transformedData =
				await interceptorChain.runAfterResponse(responseContext)

			return {
				success: true,
				data: transformedData,
				response: result.response,
			}
		}

		// Handle error - run onError interceptors
		if (!result.success && interceptorChain) {
			const errorContext: ErrorContext = {
				request: context,
				error: result.error,
				...(result.response ? { response: result.response } : {}),
			}

			const recovery = await interceptorChain.runOnError(errorContext)

			if (recovery?.success) {
				return recovery as HttpResult<T>
			}
		}

		return result
	}

	/**
	 * Execute request with caching and validation
	 */
	const executeRequest = async <T>(
		initialConfig: RequestConfig,
	): Promise<HttpResult<T>> => {
		let requestConfig = initialConfig

		// Validate request body if schema provided
		if (requestConfig.bodySchema && requestConfig.body !== undefined) {
			const bodyValidation = validateRequestBody(
				requestConfig.body,
				requestConfig.bodySchema as Schema<unknown>,
				{ url: requestConfig.url, method: requestConfig.method },
			)

			if (!isValidatedBody(bodyValidation)) {
				return bodyValidation as HttpResult<T>
			}

			// Use validated body
			requestConfig = { ...requestConfig, body: bodyValidation.data }
		}

		const context = buildRequestContext(requestConfig, config)

		// Determine if request is cacheable based on mode
		const shouldCache =
			cacheSystem &&
			!requestConfig.noCache &&
			!requestConfig.forceRevalidate &&
			cacheSystem.mode !== 'off' &&
			cacheSystem.mode !== 'manual' &&
			cacheSystem.isCacheable(requestConfig.method)

		// Generate cache key (with Vary support if configured)
		const getCacheKey = () =>
			cacheSystem?.varyHeaders.length
				? generateVaryAwareCacheKey(
						requestConfig,
						cacheSystem.varyHeaders,
					)
				: undefined

		// Build cache set options from request config
		const buildCacheSetOptions = (): CacheSetOptions => {
			const cacheConfig = getCacheConfig(config)
			const options: CacheSetOptions = {}

			// Per-request TTL override
			if (requestConfig.cacheTtl !== undefined) {
				;(options as { ttl: number }).ttl = requestConfig.cacheTtl
			}

			// Combine per-request tags with auto-tags from config
			const tags: string[] = []
			if (requestConfig.cacheTags) {
				tags.push(...requestConfig.cacheTags)
			}
			if (cacheConfig?.tags) {
				for (const tagFn of Object.values(cacheConfig.tags)) {
					tags.push(...tagFn(requestConfig))
				}
			}
			if (tags.length > 0) {
				;(options as { tags: readonly string[] }).tags = tags
			}

			return options
		}

		// Check cache first
		if (shouldCache) {
			const cacheConfig = getCacheConfig(config)

			// Use SWR for stale-while-revalidate behavior
			if (cacheConfig?.staleWhileRevalidate) {
				return cacheSystem.swr.getWithRevalidation(
					requestConfig,
					async () => {
						// Use deduplication for the actual fetch
						if (cacheConfig.deduplicate) {
							return cacheSystem.deduplicator.dedupe(
								requestConfig,
								() =>
									executeCoreRequest<T>(
										context,
										requestConfig,
									),
							)
						}
						return executeCoreRequest<T>(context, requestConfig)
					},
				)
			}

			// Check LRU cache
			const cached = cacheSystem.lru.get<T>(requestConfig)
			if (cached) {
				return cached
			}

			// Use deduplication if enabled
			if (cacheConfig?.deduplicate) {
				const result = await cacheSystem.deduplicator.dedupe(
					requestConfig,
					() => executeCoreRequest<T>(context, requestConfig),
				)

				// Cache successful responses
				if (result.success) {
					const cacheSetOpts = buildCacheSetOptions()
					cacheSystem.lru.set(requestConfig, result, cacheSetOpts)

					// Register tags for invalidation
					const cacheKey = getCacheKey()
					if (cacheKey && cacheSetOpts.tags?.length) {
						cacheSystem.tags.register(cacheKey, cacheSetOpts.tags)
					}
				}

				return result
			}
		}

		const result = await executeCoreRequest<T>(context, requestConfig)

		// Cache successful responses
		if (shouldCache && result.success) {
			const cacheSetOpts = buildCacheSetOptions()
			cacheSystem.lru.set(requestConfig, result, cacheSetOpts)

			// Register tags for invalidation
			const cacheKey = getCacheKey()
			if (cacheKey && cacheSetOpts.tags?.length) {
				cacheSystem.tags.register(cacheKey, cacheSetOpts.tags)
			}
		}

		// Validate response if schema provided
		if (result.success && requestConfig.responseSchema) {
			return validateResponse(
				result.data,
				requestConfig.responseSchema as Schema<T>,
				result.response,
				{ url: requestConfig.url, method: requestConfig.method },
			)
		}

		return result
	}

	/**
	 * Create new client with merged configuration (immutable)
	 */
	const withConfig = (overrides: Partial<HttpClientConfig>): HttpClient =>
		createHttpClient({
			...config,
			...overrides,
			headers: {
				...config.headers,
				...overrides.headers,
			},
		})

	// HTTP method implementations
	const get = <T = unknown>(
		url: string,
		options?: RequestOptions,
	): Promise<HttpResult<T>> =>
		executeRequest<T>({ method: 'GET', url, ...options })

	const post = <T = unknown>(
		url: string,
		body?: unknown,
		options?: RequestOptions,
	): Promise<HttpResult<T>> =>
		executeRequest<T>({ method: 'POST', url, body, ...options })

	const put = <T = unknown>(
		url: string,
		body?: unknown,
		options?: RequestOptions,
	): Promise<HttpResult<T>> =>
		executeRequest<T>({ method: 'PUT', url, body, ...options })

	const patch = <T = unknown>(
		url: string,
		body?: unknown,
		options?: RequestOptions,
	): Promise<HttpResult<T>> =>
		executeRequest<T>({ method: 'PATCH', url, body, ...options })

	const del = <T = unknown>(
		url: string,
		options?: RequestOptions,
	): Promise<HttpResult<T>> =>
		executeRequest<T>({ method: 'DELETE', url, ...options })

	const head = (
		url: string,
		options?: RequestOptions,
	): Promise<HttpResult<void>> =>
		executeRequest<void>({ method: 'HEAD', url, ...options })

	const optionsMethod = <T = unknown>(
		url: string,
		options?: RequestOptions,
	): Promise<HttpResult<T>> =>
		executeRequest<T>({ method: 'OPTIONS', url, ...options })

	// Fluent configuration methods
	const withHeaders = (headers: Record<string, string>): HttpClient =>
		withConfig({ headers })

	const withTimeout = (timeout: number): HttpClient => withConfig({ timeout })

	const withRetry = (retry: RetryConfig): HttpClient => withConfig({ retry })

	const withAuth = (token: string): HttpClient =>
		withConfig({ headers: createBearerAuthHeader(token) })

	const withBasicAuth = (user: string, pass: string): HttpClient =>
		withConfig({ headers: createBasicAuthHeader(user, pass) })

	const noCache = (): HttpClient => withConfig({ cache: false })

	const noRetry = (): HttpClient => withConfig({ retry: false })

	// Cache management
	const clearCache = (): void => {
		cacheSystem?.lru.clear()
		cacheSystem?.tags.clear()
	}

	const getCacheStats = (): CacheStats => {
		if (!cacheSystem) {
			return {
				size: 0,
				maxSize: 0,
				hits: 0,
				misses: 0,
				staleHits: 0,
				evictions: 0,
			}
		}
		return cacheSystem.lru.getStats()
	}

	const invalidateCache = (pattern: string): void => {
		if (!cacheSystem) return

		// Get keys matching the pattern
		const keysToDelete = cacheSystem.tags.getKeysByPattern(pattern)

		// Also check cache keys directly for pattern match
		for (const key of cacheSystem.lru.keys()) {
			// Simple pattern matching for URL patterns
			const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&')
			const regexPattern = escaped
				.replace(/\*/g, '.*')
				.replace(/\?/g, '.')
			const regex = new RegExp(`^${regexPattern}$`)

			if (regex.test(key)) {
				cacheSystem.lru.deleteByKey(key)
				cacheSystem.tags.unregister(key)
			}
		}

		// Delete keys found via tag registry
		for (const key of keysToDelete) {
			cacheSystem.lru.deleteByKey(key)
			cacheSystem.tags.unregister(key)
		}
	}

	const invalidateByTag = (tag: string): void => {
		if (!cacheSystem) return

		// Get all keys with this tag
		const keysToDelete = cacheSystem.tags.getKeysByTag(tag)

		// Delete each key from cache and unregister
		for (const key of keysToDelete) {
			cacheSystem.lru.deleteByKey(key)
			cacheSystem.tags.unregister(key)
		}
	}

	return {
		get,
		post,
		put,
		patch,
		delete: del,
		head,
		options: optionsMethod,
		request: executeRequest,
		withHeaders,
		withTimeout,
		withRetry,
		withAuth,
		withBasicAuth,
		noCache,
		noRetry,
		clearCache,
		getCacheStats,
		invalidateCache,
		invalidateByTag,
	}
}
