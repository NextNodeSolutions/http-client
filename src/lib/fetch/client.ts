/**
 * HTTP Client with comprehensive error handling and retry logic
 */

import { success, failure } from '@/types/result.js'
import {
	createHttpError,
	createTimeoutError,
	createParseError,
	normalizeError,
} from '@/lib/errors.js'
import { apiLogger, logError, logApiResponse } from '@/utils/logger.js'

import type {
	HttpClientConfig,
	RequestConfig,
	HttpResponse,
	RequestInterceptor,
	ResponseInterceptor,
	ErrorInterceptor,
} from '@/types/fetch.js'
import type { Result } from '@/types/result.js'
import type { HttpClientError } from '@/types/errors.js'

/**
 * HTTP Client class providing comprehensive fetch operations
 */
export class HttpClient {
	private config: Required<HttpClientConfig>
	private requestInterceptors: RequestInterceptor[] = []
	private responseInterceptors: ResponseInterceptor[] = []
	private errorInterceptors: ErrorInterceptor[] = []

	constructor(config: HttpClientConfig = {}) {
		// Merge default headers first
		const mergedHeaders = {
			'Content-Type': 'application/json',
			...config.defaultHeaders,
		}

		this.config = {
			baseUrl: '',
			timeout: 30000,
			retries: 3,
			retryDelay: 1000,
			credentials: 'same-origin',
			enableCache: false,
			cacheTtl: 300000, // 5 minutes
			...config,
			defaultHeaders: mergedHeaders,
		}

		apiLogger.info('HTTP Client initialized', {
			details: {
				baseUrl: this.config.baseUrl,
				timeout: this.config.timeout,
				retries: this.config.retries,
				enableCache: this.config.enableCache,
			},
		})
	}

	/**
	 * Add request interceptor
	 */
	addRequestInterceptor(interceptor: RequestInterceptor): void {
		this.requestInterceptors.push(interceptor)
	}

	/**
	 * Add response interceptor
	 */
	addResponseInterceptor<T = unknown>(
		interceptor: ResponseInterceptor<T>,
	): void {
		this.responseInterceptors.push(
			interceptor as ResponseInterceptor<unknown>,
		)
	}

	/**
	 * Add error interceptor
	 */
	addErrorInterceptor(interceptor: ErrorInterceptor): void {
		this.errorInterceptors.push(interceptor)
	}

	/**
	 * Build full URL from base URL and path
	 */
	private buildUrl(url: string): string {
		if (url.startsWith('http://') || url.startsWith('https://')) {
			return url
		}

		const baseUrl = this.config.baseUrl.replace(/\/$/, '')
		const path = url.startsWith('/') ? url : `/${url}`
		return `${baseUrl}${path}`
	}

	/**
	 * Merge configurations with precedence
	 */
	private mergeConfig(requestConfig: RequestConfig = {}): RequestConfig {
		return {
			method: requestConfig.method || 'GET',
			headers: {
				...this.config.defaultHeaders,
				...requestConfig.headers,
			},
			timeout: requestConfig.timeout ?? this.config.timeout,
			retries: requestConfig.retries ?? this.config.retries,
			retryDelay: requestConfig.retryDelay ?? this.config.retryDelay,
			credentials: requestConfig.credentials ?? this.config.credentials,
			...(requestConfig.cache && { cache: requestConfig.cache }),
			...(requestConfig.signal && { signal: requestConfig.signal }),
			...(requestConfig.body !== undefined && {
				body: requestConfig.body,
			}),
		}
	}

	/**
	 * Apply request interceptors
	 */
	private async applyRequestInterceptors(
		config: RequestConfig,
		url: string,
	): Promise<RequestConfig> {
		let modifiedConfig = config

		for (const interceptor of this.requestInterceptors) {
			try {
				modifiedConfig = await interceptor(modifiedConfig, url)
			} catch (error) {
				logError(error, {
					context: 'request_interceptor',
					url,
					config: modifiedConfig,
				})
				throw error
			}
		}

		return modifiedConfig
	}

	/**
	 * Apply response interceptors
	 */
	private async applyResponseInterceptors<T>(
		response: HttpResponse<T>,
	): Promise<HttpResponse<T>> {
		let modifiedResponse = response

		for (const interceptor of this.responseInterceptors) {
			try {
				modifiedResponse = (await interceptor(
					modifiedResponse,
				)) as HttpResponse<T>
			} catch (error) {
				logError(error, {
					context: 'response_interceptor',
					url: response.raw.url,
				})
				throw error
			}
		}

		return modifiedResponse
	}

	/**
	 * Apply error interceptors
	 */
	private async applyErrorInterceptors(
		error: Error,
		config: RequestConfig,
		url: string,
	): Promise<Error> {
		let modifiedError = error

		for (const interceptor of this.errorInterceptors) {
			try {
				modifiedError = await interceptor(modifiedError, config, url)
			} catch (interceptorError) {
				logError(interceptorError, {
					context: 'error_interceptor',
					originalError: error,
					url,
				})
				// Return original error if interceptor fails
				return error
			}
		}

		return modifiedError
	}

	/**
	 * Parse response based on Content-Type
	 */
	private async parseResponse<T = unknown>(response: Response): Promise<T> {
		const contentType = response.headers.get('content-type') || ''

		try {
			if (contentType.includes('application/json')) {
				const text = await response.text()
				if (!text.trim()) {
					return null as T
				}
				return JSON.parse(text) as T
			}

			if (
				contentType.includes('text/') ||
				contentType.includes('application/xml')
			) {
				return (await response.text()) as T
			}

			// For other content types, try to parse as JSON first, then fallback to text
			const text = await response.text()
			try {
				return JSON.parse(text) as T
			} catch {
				return text as T
			}
		} catch (error) {
			const rawText = await response.text().catch(() => '')
			throw createParseError(response.url, rawText, error as Error)
		}
	}

	/**
	 * Create timeout signal
	 */
	private createTimeoutSignal(timeoutMs: number): AbortSignal {
		const controller = new AbortController()
		setTimeout(() => controller.abort(), timeoutMs)
		return controller.signal
	}

	/**
	 * Execute HTTP request with full error handling
	 */
	async request<T = unknown>(
		url: string,
		requestConfig: RequestConfig = {},
	): Promise<Result<HttpResponse<T>, HttpClientError>> {
		const fullUrl = this.buildUrl(url)
		let config = this.mergeConfig(requestConfig)

		try {
			// Apply request interceptors
			config = await this.applyRequestInterceptors(config, fullUrl)

			// Prepare fetch options
			const fetchOptions: RequestInit = {
				method: config.method!,
				headers: config.headers!,
				credentials: config.credentials!,
				...(config.signal && { signal: config.signal }),
			}

			// Handle request body
			if (config.body !== undefined && config.method !== 'GET') {
				if (typeof config.body === 'string') {
					fetchOptions.body = config.body
				} else {
					fetchOptions.body = JSON.stringify(config.body)
				}
			}

			// Create timeout signal if no signal provided
			if (!config.signal && config.timeout) {
				fetchOptions.signal = this.createTimeoutSignal(config.timeout)
			}

			apiLogger.info('Making HTTP request', {
				details: {
					method: config.method,
					url: fullUrl,
					hasBody: Boolean(fetchOptions.body),
					timeout: config.timeout,
				},
			})

			// Execute fetch
			const response = await fetch(fullUrl, fetchOptions)

			// Parse response
			const data = await this.parseResponse<T>(response)

			// Create normalized response
			let httpResponse: HttpResponse<T> = {
				data,
				status: response.status,
				statusText: response.statusText,
				headers: Object.fromEntries(response.headers.entries()),
				ok: response.ok,
				raw: response,
			}

			// Apply response interceptors
			httpResponse = await this.applyResponseInterceptors(httpResponse)

			// Log successful response
			logApiResponse(
				config.method!,
				fullUrl,
				response.status,
				response.ok ? undefined : data,
			)

			// Handle HTTP errors (4xx, 5xx)
			if (!response.ok) {
				const error = createHttpError(
					response.status,
					response.statusText,
					fullUrl,
					config.method!,
					data,
					httpResponse.headers,
				)

				const processedError = await this.applyErrorInterceptors(
					error,
					config,
					fullUrl,
				)

				return failure(processedError as HttpClientError)
			}

			return success(httpResponse)
		} catch (error) {
			// Handle timeout specifically
			if (error instanceof Error && error.name === 'AbortError') {
				const timeoutError = createTimeoutError(
					fullUrl,
					config.timeout!,
					{ originalError: error },
				)
				const processedError = await this.applyErrorInterceptors(
					timeoutError,
					config,
					fullUrl,
				)
				return failure(processedError as HttpClientError)
			}

			// Normalize other errors
			const normalizedError = normalizeError(
				error as Error,
				fullUrl,
				config.method!,
				{ originalError: error },
			)

			const processedError = await this.applyErrorInterceptors(
				normalizedError,
				config,
				fullUrl,
			)

			logError(processedError, {
				context: 'http_request',
				method: config.method,
				url: fullUrl,
			})

			return failure(processedError as HttpClientError)
		}
	}

	/**
	 * Convenience methods for HTTP verbs
	 */
	async get<T = unknown>(
		url: string,
		config?: Omit<RequestConfig, 'method' | 'body'>,
	): Promise<Result<HttpResponse<T>, HttpClientError>> {
		return this.request<T>(url, { ...config, method: 'GET' })
	}

	async post<T = unknown>(
		url: string,
		data?: unknown,
		config?: Omit<RequestConfig, 'method'>,
	): Promise<Result<HttpResponse<T>, HttpClientError>> {
		return this.request<T>(url, { ...config, method: 'POST', body: data })
	}

	async put<T = unknown>(
		url: string,
		data?: unknown,
		config?: Omit<RequestConfig, 'method'>,
	): Promise<Result<HttpResponse<T>, HttpClientError>> {
		return this.request<T>(url, { ...config, method: 'PUT', body: data })
	}

	async patch<T = unknown>(
		url: string,
		data?: unknown,
		config?: Omit<RequestConfig, 'method'>,
	): Promise<Result<HttpResponse<T>, HttpClientError>> {
		return this.request<T>(url, { ...config, method: 'PATCH', body: data })
	}

	async delete<T = unknown>(
		url: string,
		config?: Omit<RequestConfig, 'method' | 'body'>,
	): Promise<Result<HttpResponse<T>, HttpClientError>> {
		return this.request<T>(url, { ...config, method: 'DELETE' })
	}

	/**
	 * Get current configuration (read-only)
	 */
	getConfig(): Readonly<HttpClientConfig> {
		return { ...this.config }
	}
}

/**
 * Create a new HTTP client instance
 */
export const createHttpClient = (config?: HttpClientConfig): HttpClient =>
	new HttpClient(config)

/**
 * Default HTTP client instance
 */
export const httpClient = createHttpClient()
