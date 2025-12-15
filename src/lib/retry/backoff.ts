/**
 * Exponential Backoff with Jitter
 * @module lib/retry/backoff
 */

/**
 * Calculate backoff delay with exponential growth and jitter
 *
 * Formula: min(maxDelay, baseDelay * 2^attempt) +/- jitter%
 *
 * @param attempt - Current attempt number (0-indexed)
 * @param baseDelay - Base delay in milliseconds
 * @param maxDelay - Maximum delay cap
 * @param jitter - Jitter factor (0-1), adds randomness to prevent thundering herd
 */
export const calculateBackoff = (
	attempt: number,
	baseDelay: number,
	maxDelay: number,
	jitter: number,
): number => {
	// Exponential backoff: baseDelay * 2^attempt
	const exponentialDelay = baseDelay * 2 ** attempt

	// Cap at maxDelay
	const cappedDelay = Math.min(exponentialDelay, maxDelay)

	// Add jitter: +/- jitter% randomness
	const jitterRange = cappedDelay * jitter
	const jitterOffset = (Math.random() * 2 - 1) * jitterRange

	return Math.round(cappedDelay + jitterOffset)
}

/**
 * Sleep for specified duration
 */
export const sleep = (ms: number): Promise<void> =>
	new Promise(resolve => setTimeout(resolve, ms))
