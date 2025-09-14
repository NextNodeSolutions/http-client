/**
 * Tests for retry logic and circuit breaker
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import {
	withRetry,
	retryConditions,
	calculateRetryDelay,
	CircuitBreaker,
	DEFAULT_RETRY_CONFIG,
} from '@/lib/fetch/retry.js'
import { success, failure } from '@/types/result.js'
import {
	createHttpError,
	createNetworkError,
	createTimeoutError,
} from '@/lib/errors.js'
import { ErrorSeverity } from '@/types/errors.js'

// Mock logger to avoid noise in tests
vi.mock('@/utils/logger.js', () => ({
	apiLogger: {
		info: vi.fn(),
	},
}))

describe('Retry Logic', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	afterEach(() => {
		vi.restoreAllMocks()
	})

	describe('calculateRetryDelay', () => {
		it('should calculate exponential backoff delays', () => {
			const config = {
				...DEFAULT_RETRY_CONFIG,
				jitter: false, // Disable jitter for predictable tests
			}

			expect(calculateRetryDelay(1, config)).toBe(1000) // 1000 * 2^0
			expect(calculateRetryDelay(2, config)).toBe(2000) // 1000 * 2^1
			expect(calculateRetryDelay(3, config)).toBe(4000) // 1000 * 2^2
		})

		it('should respect maximum delay', () => {
			const config = {
				...DEFAULT_RETRY_CONFIG,
				maxDelay: 3000,
				jitter: false,
			}

			expect(calculateRetryDelay(3, config)).toBe(3000) // Capped at maxDelay
			expect(calculateRetryDelay(4, config)).toBe(3000) // Still capped
		})

		it('should add jitter when enabled', () => {
			const config = {
				...DEFAULT_RETRY_CONFIG,
				jitter: true,
			}

			const delay1 = calculateRetryDelay(1, config)
			const delay2 = calculateRetryDelay(1, config)

			// With jitter, delays should be different
			// (This might occasionally fail due to randomness, but very unlikely)
			expect(delay1).not.toBe(delay2)

			// Both should be within expected range (±25% of base delay)
			expect(delay1).toBeGreaterThanOrEqual(750)
			expect(delay1).toBeLessThanOrEqual(1250)
		})
	})

	describe('retryConditions', () => {
		it('should retry on network errors by default', () => {
			const networkError = createNetworkError('http://test.com', 'GET')
			expect(retryConditions.default(networkError)).toBe(true)
		})

		it('should retry on timeout errors by default', () => {
			const timeoutError = createTimeoutError('http://test.com', 5000)
			expect(retryConditions.default(timeoutError)).toBe(true)
		})

		it('should retry on 5xx HTTP errors by default', () => {
			const serverError = createHttpError(
				500,
				'Internal Server Error',
				'http://test.com',
				'GET',
			)
			expect(retryConditions.default(serverError)).toBe(true)
		})

		it('should retry on 429 (rate limit) by default', () => {
			const rateLimitError = createHttpError(
				429,
				'Too Many Requests',
				'http://test.com',
				'GET',
			)
			expect(retryConditions.default(rateLimitError)).toBe(true)
		})

		it('should not retry on 4xx errors (except 429) by default', () => {
			const badRequestError = createHttpError(
				400,
				'Bad Request',
				'http://test.com',
				'GET',
			)
			const notFoundError = createHttpError(
				404,
				'Not Found',
				'http://test.com',
				'GET',
			)

			expect(retryConditions.default(badRequestError)).toBe(false)
			expect(retryConditions.default(notFoundError)).toBe(false)
		})

		it('should implement conservative retry condition', () => {
			const networkError = createNetworkError('http://test.com', 'GET')
			const serverError = createHttpError(
				500,
				'Internal Server Error',
				'http://test.com',
				'GET',
			)

			expect(retryConditions.conservative(networkError)).toBe(true)
			expect(retryConditions.conservative(serverError)).toBe(false) // Conservative doesn't retry HTTP errors
		})

		it('should implement status code based retry condition', () => {
			const retryOn502And503 = retryConditions.statusCodes([502, 503])

			const error502 = createHttpError(
				502,
				'Bad Gateway',
				'http://test.com',
				'GET',
			)
			const error503 = createHttpError(
				503,
				'Service Unavailable',
				'http://test.com',
				'GET',
			)
			const error500 = createHttpError(
				500,
				'Internal Server Error',
				'http://test.com',
				'GET',
			)

			expect(retryOn502And503(error502)).toBe(true)
			expect(retryOn502And503(error503)).toBe(true)
			expect(retryOn502And503(error500)).toBe(false)
		})

		it('should implement severity based retry condition', () => {
			const retryOnLowSeverity = retryConditions.bySeverity([
				ErrorSeverity.LOW,
			])

			const timeoutError = createTimeoutError('http://test.com', 5000)
			const rateLimitError = createHttpError(
				429,
				'Too Many Requests',
				'http://test.com',
				'GET',
			)
			const serverError = createHttpError(
				500,
				'Internal Server Error',
				'http://test.com',
				'GET',
			)

			expect(retryOnLowSeverity(timeoutError)).toBe(true) // Low severity
			expect(retryOnLowSeverity(rateLimitError)).toBe(true) // Low severity
			expect(retryOnLowSeverity(serverError)).toBe(false) // High severity
		})
	})

	describe('withRetry', () => {
		it('should succeed without retry on first attempt', async () => {
			const successfulOperation = vi
				.fn()
				.mockResolvedValue(success({ data: 'success' }))

			const result = await withRetry(successfulOperation)

			expect(successfulOperation).toHaveBeenCalledTimes(1)
			expect(result[0]).toBeNull()
			expect(result[1]).toEqual({ data: 'success' })
		})

		it('should retry on retryable errors', async () => {
			const networkError = createNetworkError('http://test.com', 'GET')
			const failingOperation = vi
				.fn()
				.mockResolvedValueOnce(failure(networkError))
				.mockResolvedValueOnce(failure(networkError))
				.mockResolvedValueOnce(
					success({ data: 'success after retries' }),
				)

			// Use minimal delay for faster tests
			const result = await withRetry(failingOperation, {
				maxAttempts: 3,
				baseDelay: 1, // Very small delay
				jitter: false,
			})

			expect(failingOperation).toHaveBeenCalledTimes(3)
			expect(result[0]).toBeNull()
			expect(result[1]).toEqual({ data: 'success after retries' })
		})

		it('should exhaust retries on persistent failures', async () => {
			const networkError = createNetworkError('http://test.com', 'GET')
			const alwaysFailingOperation = vi
				.fn()
				.mockResolvedValue(failure(networkError))

			const result = await withRetry(alwaysFailingOperation, {
				maxAttempts: 2,
				baseDelay: 1, // Very small delay
				jitter: false,
			})

			expect(alwaysFailingOperation).toHaveBeenCalledTimes(2)
			expect(result[0]).toBeDefined()
			expect(result[0]!.code).toBe('RETRY_EXHAUSTION_ERROR')
		})

		it('should not retry on non-retryable errors', async () => {
			const badRequestError = createHttpError(
				400,
				'Bad Request',
				'http://test.com',
				'GET',
			)
			const nonRetryableOperation = vi
				.fn()
				.mockResolvedValue(failure(badRequestError))

			const result = await withRetry(nonRetryableOperation, {
				maxAttempts: 3,
				baseDelay: 1,
				jitter: false,
			})

			expect(nonRetryableOperation).toHaveBeenCalledTimes(1) // No retries
			expect(result[0]).toBeDefined()
			expect(result[0]!.code).toBe('HTTP_ERROR')
		})

		it('should use custom retry condition', async () => {
			const serverError = createHttpError(
				500,
				'Internal Server Error',
				'http://test.com',
				'GET',
			)
			const customShouldRetry = vi.fn().mockReturnValue(false) // Never retry
			const failingOperation = vi
				.fn()
				.mockResolvedValue(failure(serverError))

			const result = await withRetry(failingOperation, {
				maxAttempts: 3,
				baseDelay: 1,
				jitter: false,
				shouldRetry: customShouldRetry,
			})

			expect(failingOperation).toHaveBeenCalledTimes(1)
			expect(customShouldRetry).toHaveBeenCalledWith(serverError, 1)
			expect(result[0]!.code).toBe('HTTP_ERROR')
		})
	})

	describe('CircuitBreaker', () => {
		let circuitBreaker: CircuitBreaker

		beforeEach(() => {
			circuitBreaker = new CircuitBreaker(3, 5000) // 3 failures, 5 second recovery
		})

		it('should start in CLOSED state', () => {
			expect(circuitBreaker.getState()).toBe('CLOSED')
			expect(circuitBreaker.getFailureCount()).toBe(0)
		})

		it('should track failures and open circuit', async () => {
			const failingOperation = vi
				.fn()
				.mockResolvedValue(
					failure(createNetworkError('http://test.com', 'GET')),
				)

			// Execute 3 failing operations
			for (let i = 0; i < 3; i++) {
				await circuitBreaker.execute(failingOperation)
			}

			expect(circuitBreaker.getState()).toBe('OPEN')
			expect(circuitBreaker.getFailureCount()).toBe(3)
		})

		it('should reject calls when circuit is OPEN', async () => {
			const operation = vi
				.fn()
				.mockResolvedValue(success({ data: 'success' }))

			// Force circuit to open
			for (let i = 0; i < 3; i++) {
				await circuitBreaker.execute(
					vi
						.fn()
						.mockResolvedValue(
							failure(
								createNetworkError('http://test.com', 'GET'),
							),
						),
				)
			}

			const result = await circuitBreaker.execute(operation)

			expect(operation).not.toHaveBeenCalled()
			expect(result[0]).toBeDefined()
			expect(result[0]!.code).toBe('RETRY_EXHAUSTION_ERROR')
		})

		it('should transition to HALF_OPEN after recovery timeout', async () => {
			// Create circuit breaker with very short recovery timeout for testing
			const shortRecoveryBreaker = new CircuitBreaker(3, 10) // 10ms recovery
			const operation = vi
				.fn()
				.mockResolvedValue(success({ data: 'success' }))

			// Force circuit to open
			for (let i = 0; i < 3; i++) {
				await shortRecoveryBreaker.execute(
					vi
						.fn()
						.mockResolvedValue(
							failure(
								createNetworkError('http://test.com', 'GET'),
							),
						),
				)
			}

			expect(shortRecoveryBreaker.getState()).toBe('OPEN')

			// Wait for recovery timeout
			await new Promise(resolve => setTimeout(resolve, 15))

			await shortRecoveryBreaker.execute(operation)

			expect(shortRecoveryBreaker.getState()).toBe('CLOSED') // Success should close circuit
			expect(shortRecoveryBreaker.getFailureCount()).toBe(0)
		})

		it('should reset circuit breaker', async () => {
			// Force circuit to open
			for (let i = 0; i < 3; i++) {
				await circuitBreaker.execute(
					vi
						.fn()
						.mockResolvedValue(
							failure(
								createNetworkError('http://test.com', 'GET'),
							),
						),
				)
			}

			expect(circuitBreaker.getState()).toBe('OPEN')

			circuitBreaker.reset()

			expect(circuitBreaker.getState()).toBe('CLOSED')
			expect(circuitBreaker.getFailureCount()).toBe(0)
		})

		it('should reset failure count on successful operation', async () => {
			const failingOperation = vi
				.fn()
				.mockResolvedValue(
					failure(createNetworkError('http://test.com', 'GET')),
				)
			const successOperation = vi
				.fn()
				.mockResolvedValue(success({ data: 'success' }))

			// Execute 2 failing operations (not enough to open circuit)
			await circuitBreaker.execute(failingOperation)
			await circuitBreaker.execute(failingOperation)
			expect(circuitBreaker.getFailureCount()).toBe(2)

			// Execute successful operation
			await circuitBreaker.execute(successOperation)

			expect(circuitBreaker.getState()).toBe('CLOSED')
			expect(circuitBreaker.getFailureCount()).toBe(0)
		})
	})
})
