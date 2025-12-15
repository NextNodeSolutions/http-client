/**
 * Fetch Executor - Core HTTP execution
 * @module lib/client/fetch-executor
 */

import type {
	HttpClientConfig,
	HttpResult,
	RequestContext,
	ResponseMeta,
} from '../../types/index.js'
import { isJsonContentType } from '../../utils/headers.js'
import { logHttpError, logRequest, logResponse } from '../../utils/logger.js'
import { createHttpError, mapFetchError } from '../errors/index.js'

/**
 * Execute fetch request and return HttpResult
 */
export const executeFetch = async <T>(
	context: RequestContext,
	clientConfig: HttpClientConfig,
): Promise<HttpResult<T>> => {
	const startTime = performance.now()
	const debug = clientConfig.debug ?? false

	// Create abort controller for timeout
	const controller = new AbortController()
	const timeoutId = setTimeout(() => controller.abort(), context.timeout)

	// Combine signals if external signal provided
	const signal = context.signal
		? combineAbortSignals(context.signal, controller.signal)
		: controller.signal

	logRequest(context.method, context.url, context.requestId, debug)

	try {
		const fetchOptions: RequestInit = {
			method: context.method,
			headers: context.headers,
			signal,
		}

		if (context.body !== undefined) {
			fetchOptions.body = JSON.stringify(context.body)
		}

		if (clientConfig.credentials) {
			fetchOptions.credentials = clientConfig.credentials
		}

		const response = await fetch(context.url, fetchOptions)

		const duration = performance.now() - startTime

		const responseMeta = buildResponseMeta(response, duration)

		// Handle non-2xx responses
		if (!response.ok) {
			const errorBody = await safeParseJson(response)

			logResponse(
				context.method,
				context.url,
				response.status,
				duration,
				false,
				debug,
			)

			return {
				success: false,
				error: createHttpError(response.status, response.statusText, {
					url: context.url,
					method: context.method,
					requestId: context.requestId,
					body: errorBody,
				}),
				response: responseMeta,
			}
		}

		// Parse response body
		const data = await parseResponseBody<T>(response)

		logResponse(
			context.method,
			context.url,
			response.status,
			duration,
			false,
			debug,
		)

		return {
			success: true,
			data,
			response: responseMeta,
		}
	} catch (error) {
		logHttpError(
			error,
			{
				url: context.url,
				method: context.method,
				requestId: context.requestId,
			},
			debug,
		)

		return {
			success: false,
			error: mapFetchError(error, {
				url: context.url,
				method: context.method,
				requestId: context.requestId,
			}),
		}
	} finally {
		clearTimeout(timeoutId)
	}
}

/**
 * Build ResponseMeta from Response object
 */
const buildResponseMeta = (
	response: Response,
	duration: number,
): ResponseMeta => ({
	status: response.status,
	statusText: response.statusText,
	headers: response.headers,
	url: response.url,
	redirected: response.redirected,
	duration,
	cached: false,
	cacheHit: 'miss',
})

/**
 * Parse response body based on content type
 */
const parseResponseBody = async <T>(response: Response): Promise<T> => {
	// HEAD requests have no body
	if (
		response.status === 204 ||
		response.headers.get('content-length') === '0'
	) {
		return undefined as T
	}

	// Parse JSON if content type indicates JSON
	if (isJsonContentType(response.headers)) {
		return response.json() as Promise<T>
	}

	// Return text for other content types
	return response.text() as Promise<T>
}

/**
 * Safely parse JSON from response (for error bodies)
 */
const safeParseJson = async (response: Response): Promise<unknown> => {
	try {
		if (isJsonContentType(response.headers)) {
			return await response.json()
		}
		return await response.text()
	} catch {
		return undefined
	}
}

/**
 * Combine multiple abort signals into one
 */
const combineAbortSignals = (
	external: AbortSignal,
	internal: AbortSignal,
): AbortSignal => {
	const controller = new AbortController()

	const abort = (): void => controller.abort()

	external.addEventListener('abort', abort)
	internal.addEventListener('abort', abort)

	// If either is already aborted, abort immediately
	if (external.aborted || internal.aborted) {
		controller.abort()
	}

	return controller.signal
}
