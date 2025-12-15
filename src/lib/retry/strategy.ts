/**
 * Retry Strategy
 * @module lib/retry/strategy
 */

import { RETRYABLE_STATUS_CODES } from '../errors/codes.js'
import { retryLogger } from '../../utils/logger.js'
import { calculateBackoff, sleep } from './backoff.js'

import type { HttpError, HttpResult, RetryConfig } from '../../types/index.js'

/**
 * Retry strategy interface
 */
export interface RetryStrategy {
	execute<T>(executor: () => Promise<HttpResult<T>>): Promise<HttpResult<T>>
}

/**
 * Default retry configuration values
 */
const DEFAULTS = {
	maxRetries: 3,
	baseDelay: 1000,
	maxDelay: 30000,
	jitter: 0.1,
} as const

/**
 * Create retry strategy
 */
export const createRetryStrategy = (
	config: RetryConfig,
	debug = false,
): RetryStrategy => {
	const maxRetries = config.maxRetries ?? DEFAULTS.maxRetries
	const retryOn = config.retryOn ?? RETRYABLE_STATUS_CODES
	const baseDelay = config.baseDelay ?? DEFAULTS.baseDelay
	const maxDelay = config.maxDelay ?? DEFAULTS.maxDelay
	const jitter = config.jitter ?? DEFAULTS.jitter

	/**
	 * Determine if request should be retried
	 */
	const shouldRetry = (error: HttpError, attempt: number): boolean => {
		// Custom retry condition takes precedence
		if (config.shouldRetry) {
			return config.shouldRetry(error, attempt)
		}

		// Don't retry if max attempts reached
		if (attempt >= maxRetries) {
			return false
		}

		// Retry on network errors
		if (error.code === 'NETWORK_ERROR' || error.code === 'TIMEOUT_ERROR') {
			return true
		}

		// Retry on specific status codes
		if (error.status && retryOn.includes(error.status)) {
			return true
		}

		return false
	}

	const execute = async <T>(
		executor: () => Promise<HttpResult<T>>,
	): Promise<HttpResult<T>> => {
		let attempt = 0
		let lastResult: HttpResult<T> | undefined

		while (attempt <= maxRetries) {
			const result = await executor()

			if (result.success) {
				return result
			}

			lastResult = result

			if (!shouldRetry(result.error, attempt)) {
				return result
			}

			const delay = calculateBackoff(attempt, baseDelay, maxDelay, jitter)

			if (debug) {
				retryLogger.info('Retrying request', {
					details: {
						attempt: attempt + 1,
						maxRetries,
						delay,
						errorCode: result.error.code,
						status: result.error.status,
					},
				})
			}

			await sleep(delay)
			attempt += 1
		}

		// Return last error result (should not reach here normally)
		return lastResult as HttpResult<T>
	}

	return { execute }
}
