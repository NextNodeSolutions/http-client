/**
 * Retry logic with exponential backoff and jitter
 */

import {
	isNetworkError,
	isTimeoutError,
	isHttpError,
	getErrorSeverity,
} from '@/types/errors.js'
import { createRetryExhaustionError } from '@/lib/errors.js'
import { failure } from '@/types/result.js'
import { apiLogger } from '@/utils/logger.js'

import type { HttpClientError ,
	ErrorSeverity} from '@/types/errors.js'
import type { Result } from '@/types/result.js'
import type { RequestConfig } from '@/types/fetch.js'

/**
 * Retry strategy configuration
 */
export interface RetryConfig {
	/** Maximum number of retry attempts */
	maxAttempts: number
	/** Base delay in milliseconds */
	baseDelay: number
	/** Maximum delay in milliseconds */
	maxDelay: number
	/** Exponential backoff factor */
	backoffFactor: number
	/** Add random jitter to delays */
	jitter: boolean
	/** Custom retry condition */
	shouldRetry?: (error: HttpClientError, attempt: number) => boolean
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
	maxAttempts: 3,
	baseDelay: 1000,
	maxDelay: 30000,
	backoffFactor: 2,
	jitter: true,
}

/**
 * Retry condition functions
 */
export const retryConditions = {
	/**
	 * Default retry condition - retry on network, timeout, and 5xx errors
	 */
	default: (error: HttpClientError): boolean => {
		if (isNetworkError(error) || isTimeoutError(error)) {
			return true
		}

		if (isHttpError(error)) {
			// Retry on server errors (5xx) and rate limiting (429)
			return error.status >= 500 || error.status === 429
		}

		return false
	},

	/**
	 * Conservative retry condition - only network and timeout errors
	 */
	conservative: (error: HttpClientError): boolean => isNetworkError(error) || isTimeoutError(error),

	/**
	 * Aggressive retry condition - retry on most errors except client errors
	 */
	aggressive: (error: HttpClientError): boolean => {
		if (isHttpError(error)) {
			// Don't retry on client errors (4xx) except rate limiting
			return error.status >= 500 || error.status === 429
		}
		return true
	},

	/**
	 * Retry only on specific status codes
	 */
	statusCodes: (codes: number[]) => (error: HttpClientError): boolean => {
		if (isHttpError(error)) {
			return codes.includes(error.status)
		}
		return isNetworkError(error) || isTimeoutError(error)
	},

	/**
	 * Retry based on error severity
	 */
	bySeverity: (severities: ErrorSeverity[]) => (error: HttpClientError): boolean => {
		const severity = getErrorSeverity(error)
		return severities.includes(severity)
	},
}

/**
 * Calculate retry delay with exponential backoff and optional jitter
 */
export const calculateRetryDelay = (
	attempt: number,
	config: RetryConfig,
): number => {
	const baseDelay = config.baseDelay * Math.pow(config.backoffFactor, attempt - 1)
	const delay = Math.min(baseDelay, config.maxDelay)

	if (config.jitter) {
		// Add ±25% jitter
		const jitterAmount = delay * 0.25
		const jitter = (Math.random() - 0.5) * 2 * jitterAmount
		return Math.max(0, delay + jitter)
	}

	return delay
}

/**
 * Sleep for specified milliseconds
 */
const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Execute function with retry logic
 */
export const withRetry = async <T>(
	operation: () => Promise<Result<T, HttpClientError>>,
	config: Partial<RetryConfig> = {},
	context: { url: string; method: string } = { url: 'unknown', method: 'unknown' },
): Promise<Result<T, HttpClientError>> => {
	const retryConfig: RetryConfig = { ...DEFAULT_RETRY_CONFIG, ...config }
	const shouldRetry = retryConfig.shouldRetry || retryConditions.default
	const errors: HttpClientError[] = []

	apiLogger.info('Starting operation with retry', {
		details: {
			maxAttempts: retryConfig.maxAttempts,
			baseDelay: retryConfig.baseDelay,
			url: context.url,
			method: context.method,
		},
	})

	for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt++) {
		try {
			apiLogger.info('Attempting operation', {
				details: {
					attempt,
					maxAttempts: retryConfig.maxAttempts,
					url: context.url,
				},
			})

			const result = await operation()

			if (result[0] === null) {
				// Success
				if (attempt > 1) {
					apiLogger.info('Operation succeeded after retry', {
						details: {
							attempt,
							totalAttempts: attempt,
							url: context.url,
						},
					})
				}
				return result
			}

			// Operation returned an error
			const error = result[0]
			errors.push(error)

			// Check if we should retry
			if (attempt < retryConfig.maxAttempts && shouldRetry(error, attempt)) {
				const delay = calculateRetryDelay(attempt, retryConfig)
				
				apiLogger.info('Operation failed, retrying', {
					details: {
						attempt,
						maxAttempts: retryConfig.maxAttempts,
						error: error.code,
						delay: `${Math.round(delay)}ms`,
						url: context.url,
					},
				})

				await sleep(delay)
				continue
			}

			// No more retries or shouldn't retry
			apiLogger.info('Operation failed, no more retries', {
				details: {
					attempt,
					maxAttempts: retryConfig.maxAttempts,
					error: error.code,
					url: context.url,
				},
			})

			// If we shouldn't retry, return the original error instead of retry exhaustion
			if (!shouldRetry(error, attempt)) {
				return failure(error)
			}

			break
		} catch (unexpectedError) {
			// This shouldn't happen if the operation properly returns Result<T, E>
			// But we'll handle it just in case
			const error = unexpectedError as HttpClientError
			errors.push(error)

			apiLogger.info('Unexpected error during operation', {
				details: {
					attempt,
					error: error.message,
					url: context.url,
				},
			})

			if (attempt >= retryConfig.maxAttempts) {
				break
			}

			const delay = calculateRetryDelay(attempt, retryConfig)
			await sleep(delay)
		}
	}

	// All attempts exhausted, create retry exhaustion error
	const retryExhaustionError = createRetryExhaustionError(
		context.url,
		context.method,
		retryConfig.maxAttempts,
		errors,
		{
			retryConfig,
			lastError: errors[errors.length - 1],
		},
	)

	return failure(retryExhaustionError)
}

/**
 * Create a retry wrapper for HTTP operations
 */
export const createRetryWrapper = <T extends (...args: any[]) => Promise<Result<any, HttpClientError>>>(
	operation: T,
	retryConfig: Partial<RetryConfig> = {},
): T => {
	const wrapper = (...args: Parameters<T>): Promise<ReturnType<T>> => {
		// Extract URL and method from arguments if possible
		const [url = 'unknown', config] = args
		const method = (config as RequestConfig)?.method || 'unknown'

		const context = {
			url: typeof url === 'string' ? url : 'unknown',
			method: typeof method === 'string' ? method : 'unknown',
		}

		return withRetry(() => operation(...args), retryConfig, context) as Promise<ReturnType<T>>
	}
	
	return wrapper as unknown as T
}

/**
 * Retry-enabled HTTP client methods
 */
export const retryableOperations = {
	/**
	 * Create a retryable version of an HTTP client
	 */
	wrapClient: <T extends Record<string, (...args: any[]) => Promise<Result<any, HttpClientError>>>>(
		client: T,
		retryConfig: Partial<RetryConfig> = {},
	): T => {
		const wrappedClient = {} as T

		for (const [methodName, method] of Object.entries(client)) {
			if (typeof method === 'function') {
				wrappedClient[methodName as keyof T] = createRetryWrapper(
					method,
					retryConfig,
				) as T[keyof T]
			}
		}

		return wrappedClient
	},

	/**
	 * Wrap individual operation with retry logic
	 */
	wrapOperation: <T>(
		operation: () => Promise<Result<T, HttpClientError>>,
		retryConfig: Partial<RetryConfig> = {},
		context?: { url: string; method: string },
	): Promise<Result<T, HttpClientError>> => withRetry(operation, retryConfig, context),
}

/**
 * Circuit breaker pattern for retry operations
 */
export class CircuitBreaker {
	private failures = 0
	private lastFailureTime = 0
	private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED'

	constructor(
		private readonly failureThreshold = 5,
		private readonly recoveryTimeout = 60000, // 1 minute
	) {}

	async execute<T>(
		operation: () => Promise<Result<T, HttpClientError>>,
	): Promise<Result<T, HttpClientError>> {
		if (this.state === 'OPEN') {
			if (Date.now() - this.lastFailureTime < this.recoveryTimeout) {
				return failure(
					createRetryExhaustionError(
						'circuit-breaker',
						'circuit-breaker',
						0,
						[],
						{ reason: 'Circuit breaker is OPEN' },
					),
				)
			}
			this.state = 'HALF_OPEN'
		}

		const result = await operation()

		if (result[0] === null) {
			// Success
			this.onSuccess()
			return result
		} else {
			// Failure
			this.onFailure()
			return result
		}
	}

	private onSuccess(): void {
		this.failures = 0
		this.state = 'CLOSED'
	}

	private onFailure(): void {
		this.failures += 1
		this.lastFailureTime = Date.now()

		if (this.failures >= this.failureThreshold) {
			this.state = 'OPEN'
			apiLogger.info('Circuit breaker opened', {
				details: {
					failures: this.failures,
					threshold: this.failureThreshold,
				},
			})
		}
	}

	getState(): string {
		return this.state
	}

	getFailureCount(): number {
		return this.failures
	}

	reset(): void {
		this.failures = 0
		this.lastFailureTime = 0
		this.state = 'CLOSED'
	}
}