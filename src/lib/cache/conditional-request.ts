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
): ConditionalHeaders => {
	const headers: ConditionalHeaders = {}

	if (entry.etag) {
		;(headers as { 'If-None-Match': string })['If-None-Match'] = entry.etag
	}

	if (entry.lastModified) {
		;(headers as { 'If-Modified-Since': string })['If-Modified-Since'] =
			entry.lastModified
	}

	return headers
}

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

	const result: CachingHeaders = {}
	if (etag) {
		;(result as { etag: string }).etag = etag
	}
	if (lastModified) {
		;(result as { lastModified: string }).lastModified = lastModified
	}
	return result
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
