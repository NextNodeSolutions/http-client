/**
 * Cache Key Generation
 * @module lib/cache/cache-key
 */

import type { RequestConfig } from '../../types/index.js'

/**
 * Generate cache key from request configuration
 * Includes method, URL, and sorted query params
 */
export const generateCacheKey = (config: RequestConfig): string => {
	const parts = [config.method, config.url]

	// Add sorted params if present
	if (config.params) {
		const sortedParams = Object.entries(config.params)
			.filter(([, value]) => value !== undefined && value !== null)
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([key, value]) => `${key}=${String(value)}`)
			.join('&')

		if (sortedParams) {
			parts.push(sortedParams)
		}
	}

	return parts.join('|')
}
