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

/**
 * Generate Vary-aware cache key
 * Includes specified header values in the cache key
 * This allows different cache entries for same URL with different headers
 *
 * @param config - Request configuration
 * @param varyHeaders - Headers to include in cache key
 *
 * @security **IMPORTANT**: For authenticated endpoints, you MUST include
 * 'Authorization' in varyHeaders to prevent cache poisoning between users.
 *
 * Without varyHeaders including Authorization:
 * 1. User A (admin) requests GET /api/users → cached with admin data
 * 2. User B (regular) requests GET /api/users → receives admin data from cache
 *
 * @example
 * ```typescript
 * // Correct configuration for authenticated endpoints
 * const client = createHttpClient({
 *   cache: {
 *     varyHeaders: ['Authorization', 'Accept-Language']
 *   }
 * })
 * ```
 */
export const generateVaryAwareCacheKey = (
	config: RequestConfig,
	varyHeaders: readonly string[],
): string => {
	// Start with base key
	const baseKey = generateCacheKey(config)

	// If no vary headers specified, return base key
	if (varyHeaders.length === 0) return baseKey

	// Extract values for specified headers
	const varyParts: string[] = []
	for (const header of varyHeaders) {
		const value =
			config.headers?.[header] ??
			config.headers?.[header.toLowerCase()] ??
			''
		varyParts.push(`${header}:${value}`)
	}

	// Sort for consistency
	varyParts.sort()

	// Append vary part to key
	return `${baseKey}|vary[${varyParts.join(',')}]`
}
