/**
 * Interceptor Chain Execution
 * @module lib/interceptors/chain
 */

import type {
	AfterResponseInterceptor,
	ErrorContext,
	HttpResult,
	InterceptorConfig,
	RequestContext,
	ResponseContext,
} from '../../types/index.js'
import { interceptorLogger } from '../../utils/logger.js'

/**
 * Interceptor chain interface
 */
export interface InterceptorChain {
	runBeforeRequest(
		context: RequestContext,
	): Promise<RequestContext | HttpResult<unknown>>
	runAfterResponse<T>(context: ResponseContext<T>): Promise<T>
	runOnError(context: ErrorContext): Promise<HttpResult<unknown> | undefined>
}

/**
 * Create interceptor chain
 */
export const createInterceptorChain = (
	config: InterceptorConfig,
	debug = false,
): InterceptorChain => {
	const beforeRequest = config.beforeRequest ?? []
	const afterResponse = config.afterResponse ?? []
	const onError = config.onError ?? []

	/**
	 * Run before request interceptors
	 * Returns modified context or short-circuits with result
	 */
	const runBeforeRequest = async (
		context: RequestContext,
	): Promise<RequestContext | HttpResult<unknown>> => {
		let currentContext: RequestContext | HttpResult<unknown> = context

		for (const interceptor of beforeRequest) {
			if (debug) {
				interceptorLogger.info('Running beforeRequest interceptor', {
					details: { url: context.url },
				})
			}

			const result = await interceptor(currentContext as RequestContext)

			// Check if interceptor returned a result (short-circuit)
			if ('success' in result) {
				if (debug) {
					interceptorLogger.info(
						'Interceptor short-circuited request',
						{
							details: { url: context.url },
						},
					)
				}
				return result
			}

			currentContext = result
		}

		return currentContext
	}

	/**
	 * Run after response interceptors
	 * Each interceptor can transform the data
	 */
	const runAfterResponse = async <T>(
		context: ResponseContext<T>,
	): Promise<T> => {
		let currentData = context.data

		for (const interceptor of afterResponse) {
			if (debug) {
				interceptorLogger.info('Running afterResponse interceptor', {
					details: {
						url: context.request.url,
						status: context.response.status,
					},
				})
			}

			// Cast needed because interceptors are generic
			const typedInterceptor = interceptor as AfterResponseInterceptor
			currentData = (await typedInterceptor({
				...context,
				data: currentData,
			})) as T
		}

		return currentData
	}

	/**
	 * Run error interceptors
	 * Each interceptor can recover from error or return void to continue
	 */
	const runOnError = async (
		context: ErrorContext,
	): Promise<HttpResult<unknown> | undefined> => {
		for (const interceptor of onError) {
			if (debug) {
				interceptorLogger.info('Running onError interceptor', {
					details: {
						url: context.request.url,
						errorCode: context.error.code,
					},
				})
			}

			const result = await interceptor(context)

			// If interceptor returned a result, use it (recovery)
			if (result && 'success' in result) {
				if (debug) {
					interceptorLogger.info('Interceptor recovered from error', {
						details: { url: context.request.url },
					})
				}
				return result
			}
		}

		// No recovery, error will be returned as-is
		return undefined
	}

	return {
		runBeforeRequest,
		runAfterResponse,
		runOnError,
	}
}
