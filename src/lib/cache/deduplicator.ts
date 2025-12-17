/**
 * Request Deduplication
 * @module lib/cache/deduplicator
 */

import type { HttpResult, RequestConfig } from '../../types/index.js'
import { cacheLogger } from '../../utils/logger.js'
import { generateCacheKey } from './cache-key.js'

/**
 * Deduplicator interface
 */
export interface Deduplicator {
	dedupe<T>(
		config: RequestConfig,
		executor: () => Promise<HttpResult<T>>,
	): Promise<HttpResult<T>>
	clear(): void
	getInFlightCount(): number
}

/**
 * Create request deduplicator
 * Prevents duplicate in-flight requests for the same resource
 */
export const createDeduplicator = (debug = false): Deduplicator => {
	const inFlight = new Map<string, Promise<HttpResult<unknown>>>()

	const dedupe = async <T>(
		config: RequestConfig,
		executor: () => Promise<HttpResult<T>>,
	): Promise<HttpResult<T>> => {
		const key = generateCacheKey(config)

		// Return existing promise if request is in-flight
		const existing = inFlight.get(key)
		if (existing) {
			if (debug) {
				cacheLogger.info('Request deduplicated', { details: { key } })
			}
			return existing as Promise<HttpResult<T>>
		}

		// Create new request and track it
		const promise = executor().finally(() => {
			inFlight.delete(key)
		})

		inFlight.set(key, promise)

		if (debug) {
			cacheLogger.info('Request tracked for deduplication', {
				details: { key, inFlightCount: inFlight.size },
			})
		}

		return promise
	}

	const clear = (): void => {
		inFlight.clear()
	}

	const getInFlightCount = (): number => inFlight.size

	return {
		dedupe,
		clear,
		getInFlightCount,
	}
}
