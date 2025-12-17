/**
 * Interceptor Types
 * @module types/interceptor
 */

import type { RequestContext } from './request.js'
import type { ErrorContext, ResponseContext } from './response.js'
import type { HttpResult } from './result.js'

/**
 * Before request interceptor
 * Can modify request or short-circuit with result
 */
export type BeforeRequestInterceptor = (
	context: RequestContext,
) =>
	| RequestContext
	| Promise<RequestContext>
	| HttpResult<unknown>
	| Promise<HttpResult<unknown>>

/**
 * After response interceptor
 * Can transform response data
 */
export type AfterResponseInterceptor = <T>(
	context: ResponseContext<T>,
) => T | Promise<T>

/**
 * Error interceptor
 * Can recover from errors or perform side effects
 */
export type OnErrorInterceptor = (
	context: ErrorContext,
) => HttpResult<unknown> | Promise<HttpResult<unknown>> | void | Promise<void>

/**
 * Interceptor configuration
 */
export interface InterceptorConfig {
	readonly beforeRequest?: readonly BeforeRequestInterceptor[]
	readonly afterResponse?: readonly AfterResponseInterceptor[]
	readonly onError?: readonly OnErrorInterceptor[]
}
