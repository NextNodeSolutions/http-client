/**
 * Cache-Control Header Parser
 * @module lib/cache/cache-control
 */

import type { CacheControlDirectives, CacheMode } from '../../types/index.js'

/**
 * Default Cache-Control directives (all false/undefined)
 */
const DEFAULT_DIRECTIVES: CacheControlDirectives = {
	noStore: false,
	noCache: false,
	private: false,
	public: false,
	mustRevalidate: false,
	immutable: false,
}

/**
 * Parse Cache-Control header into structured directives
 * Uses string methods for performance (no regex in hot path)
 */
export const parseCacheControl = (
	header: string | null,
): CacheControlDirectives => {
	if (!header) return DEFAULT_DIRECTIVES

	const directives: CacheControlDirectives = { ...DEFAULT_DIRECTIVES }
	let maxAge: number | undefined
	let sMaxAge: number | undefined

	// Split by comma and process each directive
	const parts = header.toLowerCase().split(',')

	for (const part of parts) {
		const trimmed = part.trim()

		if (trimmed === 'no-store') {
			;(directives as { noStore: boolean }).noStore = true
		} else if (trimmed === 'no-cache') {
			;(directives as { noCache: boolean }).noCache = true
		} else if (trimmed === 'private') {
			;(directives as { private: boolean }).private = true
		} else if (trimmed === 'public') {
			;(directives as { public: boolean }).public = true
		} else if (trimmed === 'must-revalidate') {
			;(directives as { mustRevalidate: boolean }).mustRevalidate = true
		} else if (trimmed === 'immutable') {
			;(directives as { immutable: boolean }).immutable = true
		} else if (trimmed.startsWith('max-age=')) {
			const value = Number.parseInt(trimmed.slice(8), 10)
			if (!Number.isNaN(value)) {
				maxAge = value * 1000 // Convert seconds to ms
			}
		} else if (trimmed.startsWith('s-maxage=')) {
			const value = Number.parseInt(trimmed.slice(9), 10)
			if (!Number.isNaN(value)) {
				sMaxAge = value * 1000 // Convert seconds to ms
			}
		}
	}

	// Only include maxAge/sMaxAge if they have values
	const result: CacheControlDirectives = { ...directives }
	if (maxAge !== undefined) {
		;(result as { maxAge: number }).maxAge = maxAge
	}
	if (sMaxAge !== undefined) {
		;(result as { sMaxAge: number }).sMaxAge = sMaxAge
	}
	return result
}

/**
 * Check if response is cacheable based on directives and mode
 */
export const isCacheableResponse = (
	directives: CacheControlDirectives,
	mode: CacheMode,
): boolean => {
	// 'off' mode - never cache
	if (mode === 'off') return false

	// 'manual' mode - don't auto-cache, require explicit opt-in
	if (mode === 'manual') return false

	// 'force' mode - cache unless explicitly forbidden by no-store
	if (mode === 'force') {
		return !directives.noStore
	}

	// 'standard' mode - respect HTTP caching semantics
	// no-store means don't cache at all
	if (directives.noStore) return false

	// private responses can be cached by browser but not shared caches
	// For client-side HTTP client, we treat it as cacheable
	// (we're not a shared/CDN cache)

	// If we have max-age or s-maxage, it's cacheable
	if (directives.maxAge !== undefined || directives.sMaxAge !== undefined) {
		return true
	}

	// If explicitly public, it's cacheable
	if (directives.public) return true

	// Default: cacheable (HTTP/1.1 allows caching of responses without
	// explicit Cache-Control for GET/HEAD requests)
	return true
}

/**
 * Calculate TTL from Cache-Control directives and response headers
 */
export const calculateTtl = (
	directives: CacheControlDirectives,
	headers: Headers,
	defaultTtl: number,
): number => {
	// Use s-maxage for shared caches, max-age for private
	// Since we're a client-side cache, prefer max-age
	if (directives.maxAge !== undefined) {
		return directives.maxAge
	}

	if (directives.sMaxAge !== undefined) {
		return directives.sMaxAge
	}

	// Check Expires header as fallback
	const expires = headers.get('Expires')
	if (expires) {
		const expiresTime = Date.parse(expires)
		if (!Number.isNaN(expiresTime)) {
			const now = Date.now()
			const ttl = expiresTime - now
			return ttl > 0 ? ttl : 0
		}
	}

	// Immutable means can be cached indefinitely
	if (directives.immutable) {
		return defaultTtl * 10 // Use 10x default for immutable
	}

	return defaultTtl
}

/**
 * Check if cached entry needs revalidation based on directives
 */
export const needsRevalidation = (
	directives: CacheControlDirectives,
): boolean => {
	// no-cache means always revalidate before using
	if (directives.noCache) return true

	// must-revalidate means revalidate when stale
	// (handled by normal staleness check, but flag it)
	if (directives.mustRevalidate) return true

	return false
}
