/**
 * Conditional Request Handling (ETag/Last-Modified)
 * @module lib/cache/conditional-request
 */

import type { CacheEntry } from '../../types/index.js'

/**
 * Conditional headers to add to request
 */
export interface ConditionalHeaders {
	readonly 'If-None-Match'?: string
	readonly 'If-Modified-Since'?: string
}

/**
 * Caching headers extracted from response
 */
export interface CachingHeaders {
	readonly etag?: string
	readonly lastModified?: string
}

/**
 * Extract conditional request headers from cached entry
 * These headers tell the server to return 304 if unchanged
 */
export const extractConditionalHeaders = (
	entry: CacheEntry<unknown>,
): ConditionalHeaders => ({
	...(entry.etag && { 'If-None-Match': entry.etag }),
	...(entry.lastModified && { 'If-Modified-Since': entry.lastModified }),
})

/**
 * Check if response is 304 Not Modified
 */
export const isNotModified = (status: number): boolean => status === 304

/**
 * Extract caching headers from response for storage
 */
export const extractCachingHeaders = (headers: Headers): CachingHeaders => {
	const etag = headers.get('ETag')
	const lastModified = headers.get('Last-Modified')

	return {
		...(etag && { etag }),
		...(lastModified && { lastModified }),
	}
}

/**
 * Check if entry has conditional headers for revalidation
 */
export const hasConditionalHeaders = (entry: CacheEntry<unknown>): boolean =>
	Boolean(entry.etag) || Boolean(entry.lastModified)

/**
 * Merge conditional headers into existing headers record
 */
export const mergeConditionalHeaders = (
	existingHeaders: Record<string, string>,
	conditionalHeaders: ConditionalHeaders,
): Record<string, string> => {
	const merged = { ...existingHeaders }

	if (conditionalHeaders['If-None-Match']) {
		merged['If-None-Match'] = conditionalHeaders['If-None-Match']
	}

	if (conditionalHeaders['If-Modified-Since']) {
		merged['If-Modified-Since'] = conditionalHeaders['If-Modified-Since']
	}

	return merged
}
