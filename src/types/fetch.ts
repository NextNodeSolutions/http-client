/**
 * HTTP-related types for fetch operations
 */

import type { AsyncResult } from './result.js'

// Re-export DOM types for better compatibility
type RequestCredentials = 'include' | 'omit' | 'same-origin'
type RequestCache =
	| 'default'
	| 'force-cache'
	| 'no-cache'
	| 'no-store'
	| 'only-if-cached'
	| 'reload'

/**
 * HTTP methods supported by the client
 */
export type HttpMethod =
	| 'GET'
	| 'POST'
	| 'PUT'
	| 'PATCH'
	| 'DELETE'
	| 'HEAD'
	| 'OPTIONS'

/**
 * Request configuration for HTTP operations
 */
export interface RequestConfig {
	/** HTTP method */
	method?: HttpMethod
	/** Request headers */
	headers?: Record<string, string>
	/** Request body (JSON will be stringified automatically) */
	body?: unknown
	/** Request timeout in milliseconds */
	timeout?: number
	/** AbortController signal for request cancellation */
	signal?: AbortSignal
	/** Number of retry attempts on failure */
	retries?: number
	/** Base delay for retry backoff in milliseconds */
	retryDelay?: number
	/** Whether to include credentials in the request */
	credentials?: RequestCredentials
	/** Cache mode for the request */
	cache?: RequestCache
}

/**
 * HTTP client configuration
 */
export interface HttpClientConfig {
	/** Base URL for all requests */
	baseUrl?: string
	/** Default headers to include in all requests */
	defaultHeaders?: Record<string, string>
	/** Default timeout in milliseconds */
	timeout?: number
	/** Default number of retry attempts */
	retries?: number
	/** Default retry delay in milliseconds */
	retryDelay?: number
	/** Default credentials mode */
	credentials?: RequestCredentials
	/** Whether to enable response caching for GET requests */
	enableCache?: boolean
	/** Cache TTL in milliseconds */
	cacheTtl?: number
}

/**
 * HTTP response wrapper with normalized structure
 */
export interface HttpResponse<T = unknown> {
	/** Response data (parsed from JSON if applicable) */
	data: T
	/** HTTP status code */
	status: number
	/** HTTP status text */
	statusText: string
	/** Response headers */
	headers: Record<string, string>
	/** Whether the response was successful (2xx status) */
	ok: boolean
	/** Original Response object */
	raw: Response
}

/**
 * Pagination parameters for list requests
 */
export interface PaginationParams {
	/** Page number (1-based) */
	page?: number
	/** Number of items per page */
	limit?: number
	/** Sort field and direction (e.g., 'created_at:desc') */
	sort?: string
	/** Search query */
	search?: string
	/** Additional filters */
	filters?: Record<string, unknown>
}

/**
 * Paginated response structure
 */
export interface PaginatedResponse<T> {
	/** Array of items for current page */
	items: T[]
	/** Current page number */
	page: number
	/** Items per page */
	limit: number
	/** Total number of items */
	total: number
	/** Total number of pages */
	totalPages: number
	/** Whether there are more pages */
	hasNext: boolean
	/** Whether there are previous pages */
	hasPrev: boolean
}

/**
 * Request interceptor function type
 */
export type RequestInterceptor = (
	config: RequestConfig,
	url: string,
) => RequestConfig | Promise<RequestConfig>

/**
 * Response interceptor function type
 */
export type ResponseInterceptor<T = unknown> = (
	response: HttpResponse<T>,
) => HttpResponse<T> | Promise<HttpResponse<T>>

/**
 * Error interceptor function type
 */
export type ErrorInterceptor = (
	error: Error,
	config: RequestConfig,
	url: string,
) => Error | Promise<Error>

/**
 * HTTP operation function type
 */
export type HttpOperation<T = unknown> = (
	url: string,
	config?: RequestConfig,
) => AsyncResult<HttpResponse<T>, Error>

/**
 * CRUD operation function types
 */
export type CrudGet<T = unknown> = (
	url: string,
	config?: RequestConfig,
) => AsyncResult<T, Error>
export type CrudList<T = unknown> = (
	url: string,
	params?: PaginationParams,
	config?: RequestConfig,
) => AsyncResult<PaginatedResponse<T>, Error>
export type CrudCreate<T = unknown, D = unknown> = (
	url: string,
	data: D,
	config?: RequestConfig,
) => AsyncResult<T, Error>
export type CrudUpdate<T = unknown, D = unknown> = (
	url: string,
	data: D,
	config?: RequestConfig,
) => AsyncResult<T, Error>
export type CrudDelete<T = unknown> = (
	url: string,
	config?: RequestConfig,
) => AsyncResult<T, Error>

/**
 * Cache entry structure
 */
export interface CacheEntry<T = unknown> {
	/** Cached data */
	data: T
	/** Timestamp when data was cached */
	timestamp: number
	/** TTL in milliseconds */
	ttl: number
}

/**
 * JSON serializable type constraint
 */
export type JsonValue =
	| string
	| number
	| boolean
	| null
	| JsonObject
	| JsonArray
export interface JsonObject {
	[key: string]: JsonValue
}
export type JsonArray = JsonValue[]
