/**
 * Response Types
 * @module types/response
 */

import type { HttpError, ResponseMeta } from './result.js'
import type { RequestContext } from './request.js'

/**
 * Response context for interceptors
 */
export interface ResponseContext<T = unknown> {
	readonly request: RequestContext
	readonly response: ResponseMeta
	readonly data: T
}

/**
 * Error context for interceptors
 */
export interface ErrorContext {
	readonly request: RequestContext
	readonly error: HttpError
	readonly response?: ResponseMeta
}
