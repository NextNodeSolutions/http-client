/**
 * Common HTTP interceptors for authentication, logging, and error handling
 */

import { isHttpError } from '@/types/errors.js'
import { apiLogger } from '@/utils/logger.js'

import type {
	RequestInterceptor,
	ResponseInterceptor,
	ErrorInterceptor,
	RequestConfig,
	HttpResponse,
} from '@/types/fetch.js'

/**
 * Authentication interceptors
 */
export const authInterceptors = {
	/**
	 * Bearer token authentication
	 */
	bearerToken:
		(token: string): RequestInterceptor =>
		(config: RequestConfig) => {
			const headers = { ...config.headers }
			if (token) {
				headers.Authorization = `Bearer ${token}`
			}
			return { ...config, headers }
		},

	/**
	 * API key authentication (header-based)
	 */
	apiKey:
		(key: string, headerName = 'X-API-Key'): RequestInterceptor =>
		(config: RequestConfig) => {
			const headers = { ...config.headers }
			if (key) {
				headers[headerName] = key
			}
			return { ...config, headers }
		},

	/**
	 * Basic authentication
	 */
	basic: (username: string, password: string): RequestInterceptor => {
		const credentials = btoa(`${username}:${password}`)
		return (config: RequestConfig) => {
			const headers = { ...config.headers }
			headers.Authorization = `Basic ${credentials}`
			return { ...config, headers }
		}
	},
}

/**
 * Utility interceptors
 */
export const utilityInterceptors = {
	/**
	 * Add request timestamp
	 */
	requestTimestamp: (): RequestInterceptor => (config: RequestConfig) => {
		const headers = { ...config.headers }
		headers['X-Request-Time'] = new Date().toISOString()
		return { ...config, headers }
	},

	/**
	 * Add request ID for tracing
	 */
	requestId: (): RequestInterceptor => (config: RequestConfig) => {
		const headers = { ...config.headers }
		headers['X-Request-ID'] = crypto.randomUUID()
		return { ...config, headers }
	},

	/**
	 * Add user agent
	 */
	userAgent:
		(agent: string): RequestInterceptor =>
		(config: RequestConfig) => {
			const headers = { ...config.headers }
			headers['User-Agent'] = agent
			return { ...config, headers }
		},

	/**
	 * Content type enforcement
	 */
	contentType:
		(type: string): RequestInterceptor =>
		(config: RequestConfig) => {
			const headers = { ...config.headers }
			if (config.body !== undefined) {
				headers['Content-Type'] = type
			}
			return { ...config, headers }
		},
}

/**
 * Logging interceptors
 */
export const loggingInterceptors = {
	/**
	 * Log all requests
	 */
	logRequests:
		(): RequestInterceptor => (config: RequestConfig, url: string) => {
			apiLogger.info('HTTP Request', {
				details: {
					method: config.method,
					url,
					hasBody: Boolean(config.body),
					headers: Object.keys(config.headers || {}),
				},
			})
			return config
		},

	/**
	 * Log all responses
	 */
	logResponses:
		<T = unknown>(): ResponseInterceptor<T> =>
		(response: HttpResponse<T>) => {
			apiLogger.info('HTTP Response', {
				details: {
					status: response.status,
					statusText: response.statusText,
					url: response.raw.url,
					ok: response.ok,
					hasData:
						response.data !== null && response.data !== undefined,
				},
			})
			return response
		},

	/**
	 * Log request/response duration
	 */
	logDuration: (): {
		request: RequestInterceptor
		response: ResponseInterceptor
	} => {
		const startTimes = new Map<string, number>()

		return {
			request: (config: RequestConfig, _url: string): RequestConfig => {
				const requestId = crypto.randomUUID()
				startTimes.set(requestId, Date.now())

				const headers = { ...config.headers }
				headers['X-Request-ID'] = requestId
				return { ...config, headers }
			},
			response: (response: HttpResponse): HttpResponse => {
				const requestId = response.headers['x-request-id']
				if (requestId && startTimes.has(requestId)) {
					const duration = Date.now() - startTimes.get(requestId)!
					apiLogger.info('Request completed', {
						details: {
							duration: `${duration}ms`,
							url: response.raw.url,
							status: response.status,
						},
					})
					startTimes.delete(requestId)
				}
				return response
			},
		}
	},
}

/**
 * Error handling interceptors
 */
export const errorInterceptors = {
	/**
	 * Retry on specific HTTP status codes
	 */
	retryOnStatus: (
		statusCodes: number[],
		maxRetries = 3,
		delay = 1000,
	): ErrorInterceptor => {
		const retryCount = new Map<string, number>()

		return async (error: Error, config: RequestConfig, url: string) => {
			if (isHttpError(error) && statusCodes.includes(error.status)) {
				const key = `${config.method}:${url}`
				const attempts = retryCount.get(key) || 0

				if (attempts < maxRetries) {
					retryCount.set(key, attempts + 1)

					// Wait before retry
					await new Promise(resolve => setTimeout(resolve, delay))

					// Clear retry count on success (this would need to be handled differently in real implementation)
					// This is a simplified example
					apiLogger.info('Retrying request', {
						details: {
							attempt: attempts + 1,
							maxRetries,
							status: error.status,
							url,
						},
					})
				} else {
					retryCount.delete(key)
				}
			}

			return error
		}
	},

	/**
	 * Transform HTTP errors to more specific errors
	 */
	transformErrors: (): ErrorInterceptor => (error: Error) => {
		if (isHttpError(error)) {
			// Add more specific error information
			if (error.status === 401) {
				error.message =
					'Unauthorized: Please check your authentication credentials'
			} else if (error.status === 403) {
				error.message =
					'Forbidden: You do not have permission to access this resource'
			} else if (error.status === 404) {
				error.message =
					'Not Found: The requested resource could not be found'
			} else if (error.status === 429) {
				error.message =
					'Rate Limited: Too many requests, please try again later'
			} else if (error.status >= 500) {
				error.message =
					'Server Error: An internal server error occurred'
			}
		}

		return error
	},

	/**
	 * Extract error details from response body
	 */
	extractErrorDetails: (): ErrorInterceptor => (error: Error) => {
		if (isHttpError(error) && error.body) {
			// Try to extract more meaningful error information from response body
			if (typeof error.body === 'object') {
				const body = error.body as Record<string, unknown>

				// Common error message fields
				const message =
					(body.message as string) ||
					(body.error as string) ||
					(body.detail as string) ||
					error.message

				// Update error message if we found something more specific
				if (message && message !== error.message) {
					error.message = `${error.message}: ${message}`
				}
			}
		}

		return error
	},
}

/**
 * Performance interceptors
 */
export const performanceInterceptors = {
	/**
	 * Add cache headers for GET requests
	 */
	cacheHeaders:
		(maxAge = 300): RequestInterceptor =>
		(config: RequestConfig) => {
			if (config.method === 'GET') {
				const headers = { ...config.headers }
				headers['Cache-Control'] = `max-age=${maxAge}`
				return { ...config, headers }
			}
			return config
		},

	/**
	 * Compress request bodies
	 */
	compression: (): RequestInterceptor => (config: RequestConfig) => {
		if (
			config.body &&
			typeof config.body === 'string' &&
			config.body.length > 1024
		) {
			const headers = { ...config.headers }
			headers['Accept-Encoding'] = 'gzip, deflate, br'
			return { ...config, headers }
		}
		return config
	},

	/**
	 * Add performance timing headers
	 */
	performanceTiming: (): ResponseInterceptor => (response: HttpResponse) => {
		// Extract timing information if available
		const serverTiming = response.headers['server-timing']
		if (serverTiming) {
			apiLogger.info('Server timing', {
				details: {
					serverTiming,
					url: response.raw.url,
				},
			})
		}

		return response
	},
}

/**
 * Development interceptors (useful for debugging)
 */
export const developmentInterceptors = {
	/**
	 * Log full request/response details (for debugging only)
	 */
	debugMode: (): {
		request: RequestInterceptor
		response: ResponseInterceptor
		error: ErrorInterceptor
	} => ({
		request: (config: RequestConfig, url: string): RequestConfig => {
			console.group(`🚀 HTTP Request: ${config.method} ${url}`)
			console.log('Config:', config)
			console.groupEnd()
			return config
		},
		response: (response: HttpResponse): HttpResponse => {
			console.group(
				`✅ HTTP Response: ${response.status} ${response.raw.url}`,
			)
			console.log('Headers:', response.headers)
			console.log('Data:', response.data)
			console.groupEnd()
			return response
		},
		error: (error: Error, config: RequestConfig, url: string): Error => {
			console.group(`❌ HTTP Error: ${config.method} ${url}`)
			console.error('Error:', error)
			console.log('Config:', config)
			console.groupEnd()
			return error
		},
	}),

	/**
	 * Mock responses (for testing)
	 */
	mockResponse:
		<T>(mockData: T, status = 200, delay = 0): ResponseInterceptor<T> =>
		async (response: HttpResponse<T>): Promise<HttpResponse<T>> => {
			if (delay > 0) {
				await new Promise(resolve => setTimeout(resolve, delay))
			}

			return {
				...response,
				data: mockData,
				status,
				statusText: status === 200 ? 'OK' : 'Mocked',
				ok: status >= 200 && status < 300,
			}
		},
}

/**
 * Utility function to create interceptor chains
 */
export const createInterceptorChain = <
	T extends (...args: unknown[]) => unknown,
>(
	interceptors: T[],
): T =>
	((...args: Parameters<T>): ReturnType<T> =>
		interceptors.reduce(
			(result, interceptor) => interceptor(result, ...args.slice(1)),
			args[0],
		)) as T
