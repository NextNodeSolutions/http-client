/**
 * Type definitions for the library
 */

// Core types
export type * from './result.js'
export type * from './fetch.js'
export type * from './errors.js'

// Legacy types (to be removed in future versions)
/**
 * @deprecated Use HttpClientConfig instead
 */
export interface ClientConfig {
	/** API key for authentication */
	apiKey?: string
	/** Base URL for API requests */
	baseUrl?: string
	/** Request timeout in milliseconds */
	timeout?: number
}

/**
 * @deprecated Use HttpResponse instead
 */
export interface ApiResponse<T = unknown> {
	/** Whether the request was successful */
	success: boolean
	/** Response data (if successful) */
	data?: T
	/** Error message (if failed) */
	error?: string
	/** HTTP status code */
	statusCode: number
}

/**
 * @deprecated Use HttpClientError types instead
 */
export interface LibraryError {
	/** Error code */
	code: string
	/** Human-readable error message */
	message: string
	/** Optional error details */
	details?: Record<string, unknown>
}
