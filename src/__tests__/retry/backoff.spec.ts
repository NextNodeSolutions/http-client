/**
 * Backoff Calculation Tests
 * @module __tests__/retry/backoff
 */

import { describe, expect, it } from 'vitest'

import { calculateBackoff } from '../../lib/retry/backoff.js'

describe('calculateBackoff', () => {
	describe('exponential growth', () => {
		it('should return baseDelay for first attempt', () => {
			const delay = calculateBackoff(0, 1000, 30000, 0)

			expect(delay).toBe(1000)
		})

		it('should double delay for each attempt', () => {
			const delay0 = calculateBackoff(0, 1000, 30000, 0)
			const delay1 = calculateBackoff(1, 1000, 30000, 0)
			const delay2 = calculateBackoff(2, 1000, 30000, 0)
			const delay3 = calculateBackoff(3, 1000, 30000, 0)

			expect(delay0).toBe(1000)
			expect(delay1).toBe(2000)
			expect(delay2).toBe(4000)
			expect(delay3).toBe(8000)
		})
	})

	describe('max delay capping', () => {
		it('should cap delay at maxDelay', () => {
			const delay = calculateBackoff(10, 1000, 5000, 0)

			expect(delay).toBe(5000)
		})

		it('should not exceed maxDelay even with high attempt count', () => {
			const delay = calculateBackoff(100, 1000, 30000, 0)

			expect(delay).toBe(30000)
		})
	})

	describe('jitter application', () => {
		it('should apply jitter within expected range', () => {
			const baseDelay = 1000
			const jitter = 0.1
			const attempts = 100

			for (let i = 0; i < attempts; i += 1) {
				const delay = calculateBackoff(0, baseDelay, 30000, jitter)

				// With 10% jitter, delay should be between 900 and 1100
				expect(delay).toBeGreaterThanOrEqual(baseDelay * (1 - jitter))
				expect(delay).toBeLessThanOrEqual(baseDelay * (1 + jitter))
			}
		})

		it('should return exact delay when jitter is 0', () => {
			const baseDelay = 1000

			// Multiple calls should always return same value with no jitter
			for (let i = 0; i < 10; i += 1) {
				expect(calculateBackoff(0, baseDelay, 30000, 0)).toBe(baseDelay)
			}
		})

		it('should handle 50% jitter correctly', () => {
			const baseDelay = 1000
			const jitter = 0.5

			for (let i = 0; i < 100; i += 1) {
				const delay = calculateBackoff(0, baseDelay, 30000, jitter)

				// With 50% jitter, delay should be between 500 and 1500
				expect(delay).toBeGreaterThanOrEqual(baseDelay * 0.5)
				expect(delay).toBeLessThanOrEqual(baseDelay * 1.5)
			}
		})
	})

	describe('edge cases', () => {
		it('should handle zero baseDelay', () => {
			const delay = calculateBackoff(0, 0, 30000, 0)

			expect(delay).toBe(0)
		})

		it('should handle very small delays', () => {
			const delay = calculateBackoff(0, 1, 30000, 0)

			expect(delay).toBe(1)
		})

		it('should handle maxDelay equal to baseDelay', () => {
			const delay = calculateBackoff(5, 1000, 1000, 0)

			expect(delay).toBe(1000)
		})
	})
})
