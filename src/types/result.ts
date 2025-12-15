/**
 * HTTP Result Types - Discriminated Union Pattern
 * @module types/result
 */

/**
 * HTTP error codes for type-safe error handling
 */
export type HttpErrorCode =
	| 'NETWORK_ERROR'
	| 'TIMEOUT_ERROR'
	| 'ABORT_ERROR'
	| 'PARSE_ERROR'
	| 'VALIDATION_ERROR'
	| 'CLIENT_ERROR'
	| 'SERVER_ERROR'
	| 'UNKNOWN_ERROR'

/**
 * Structured HTTP error with full context
 */
export interface HttpError {
	readonly code: HttpErrorCode
	readonly message: string
	readonly status?: number
	readonly statusText?: string
	readonly cause?: Error
	readonly requestId?: string
	readonly url?: string
	readonly method?: string
	readonly body?: unknown
}

/**
 * Response metadata available in both success/error cases
 */
export interface ResponseMeta {
	readonly status: number
	readonly statusText: string
	readonly headers: Headers
	readonly url: string
	readonly redirected: boolean
	readonly duration: number
	readonly cached: boolean
	readonly cacheHit?: 'fresh' | 'stale' | 'miss'
}

/**
 * Discriminated union result type
 * Forces explicit error handling without try/catch
 *
 * @example
 * ```typescript
 * const result = await client.get<User>('/users/123')
 *
 * if (result.success) {
 *   // TypeScript knows: result.data is User
 *   console.log(result.data.name)
 * } else {
 *   // TypeScript knows: result.error is HttpError
 *   console.error(result.error.code)
 * }
 * ```
 */
export type HttpResult<T> =
	| {
			readonly success: true
			readonly data: T
			readonly response: ResponseMeta
	  }
	| {
			readonly success: false
			readonly error: HttpError
			readonly response?: ResponseMeta
	  }
