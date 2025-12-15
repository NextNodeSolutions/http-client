/**
 * Request Types
 * @module types/request
 */

import type { Schema } from '@nextnode/validation'
import type { RetryConfig } from './retry.js'

/**
 * HTTP methods
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
 * Per-request options
 */
export interface RequestOptions {
	/** Request-specific headers */
	readonly headers?: Record<string, string>
	/** Query parameters */
	readonly params?: Record<string, string | number | boolean | undefined>
	/** Request-specific timeout in ms */
	readonly timeout?: number
	/** Abort signal for cancellation */
	readonly signal?: AbortSignal
	/** Skip cache for this request */
	readonly noCache?: boolean
	/** Skip retry for this request */
	readonly noRetry?: boolean
	/** Request-specific retry config */
	readonly retry?: RetryConfig
	/** Response validation schema */
	readonly responseSchema?: Schema<unknown>
	/** Request body validation schema */
	readonly bodySchema?: Schema<unknown>
	/** Custom request ID for tracing */
	readonly requestId?: string
}

/**
 * Full request configuration
 */
export interface RequestConfig extends RequestOptions {
	readonly method: HttpMethod
	readonly url: string
	readonly body?: unknown
}

/**
 * Internal request context used by interceptors
 */
export interface RequestContext {
	readonly url: string
	readonly method: HttpMethod
	readonly headers: Headers
	readonly body?: unknown
	readonly requestId: string
	readonly timestamp: number
	readonly timeout: number
	readonly signal?: AbortSignal
}
