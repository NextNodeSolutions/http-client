/**
 * Retry Types
 * @module types/retry
 */

import type { HttpError } from './result.js'

/**
 * Retry configuration
 */
export interface RetryConfig {
	/** Maximum retry attempts */
	readonly maxRetries?: number
	/** HTTP status codes to retry */
	readonly retryOn?: readonly number[]
	/** Base delay for exponential backoff (ms) */
	readonly baseDelay?: number
	/** Maximum delay cap (ms) */
	readonly maxDelay?: number
	/** Jitter factor (0-1) */
	readonly jitter?: number
	/** Custom retry condition */
	readonly shouldRetry?: (error: HttpError, attempt: number) => boolean
}

/**
 * Retry state tracking (internal)
 */
export interface RetryState {
	readonly attempt: number
	readonly lastError?: HttpError
	readonly nextDelay: number
}
