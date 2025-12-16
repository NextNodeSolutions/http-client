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

/**
 * Extract Vary header values from request for storage
 * These are stored with the cache entry for later key reconstruction
 */
export const extractVaryHeaderValues = (
	config: RequestConfig,
	varyHeaders: readonly string[],
): Readonly<Record<string, string>> => {
	const values: Record<string, string> = {}

	for (const header of varyHeaders) {
		const value =
			config.headers?.[header] ?? config.headers?.[header.toLowerCase()]
		if (value !== undefined) {
			values[header] = value
		}
	}

	return values
}
