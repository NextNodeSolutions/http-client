/**
 * HTTP Client Types
 * @module types/client
 */

import type { CacheConfig, CacheStats } from './cache.js'
import type { InterceptorConfig } from './interceptor.js'
import type { RequestConfig, RequestOptions } from './request.js'
import type { HttpResult } from './result.js'
import type { RetryConfig } from './retry.js'

/**
 * HTTP client configuration
 */
export interface HttpClientConfig {
	/** Base URL for all requests */
	readonly baseUrl?: string
	/** Default timeout in milliseconds */
	readonly timeout?: number
	/** Default headers for all requests */
	readonly headers?: Record<string, string>
	/** Cache configuration (false to disable) */
	readonly cache?: CacheConfig | false
	/** Retry configuration (false to disable) */
	readonly retry?: RetryConfig | false
	/** Interceptor configuration */
	readonly interceptors?: InterceptorConfig
	/** Credentials mode for fetch */
	readonly credentials?: RequestCredentials
	/** Enable debug logging */
	readonly debug?: boolean
}

/**
 * Internal configuration after applying defaults
 */
export interface ResolvedHttpClientConfig {
	readonly baseUrl: string
	readonly timeout: number
	readonly headers: Record<string, string>
	readonly cache: CacheConfig | false
	readonly retry: RetryConfig | false
	readonly interceptors: InterceptorConfig
	readonly credentials: RequestCredentials | undefined
	readonly debug: boolean
}

/**
 * HTTP client instance interface
 */
export interface HttpClient {
	// HTTP methods
	get<T = unknown>(
		url: string,
		options?: RequestOptions,
	): Promise<HttpResult<T>>
	post<T = unknown>(
		url: string,
		body?: unknown,
		options?: RequestOptions,
	): Promise<HttpResult<T>>
	put<T = unknown>(
		url: string,
		body?: unknown,
		options?: RequestOptions,
	): Promise<HttpResult<T>>
	patch<T = unknown>(
		url: string,
		body?: unknown,
		options?: RequestOptions,
	): Promise<HttpResult<T>>
	delete<T = unknown>(
		url: string,
		options?: RequestOptions,
	): Promise<HttpResult<T>>
	head(url: string, options?: RequestOptions): Promise<HttpResult<void>>
	options<T = unknown>(
		url: string,
		options?: RequestOptions,
	): Promise<HttpResult<T>>
	request<T = unknown>(config: RequestConfig): Promise<HttpResult<T>>

	// Fluent configuration (returns new immutable instance)
	withHeaders(headers: Record<string, string>): HttpClient
	withTimeout(ms: number): HttpClient
	withRetry(config: RetryConfig): HttpClient
	withAuth(token: string): HttpClient
	withBasicAuth(user: string, pass: string): HttpClient
	noCache(): HttpClient
	noRetry(): HttpClient

	// Cache management
	clearCache(): void
	getCacheStats(): CacheStats
}
