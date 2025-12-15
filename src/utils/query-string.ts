/**
 * Query String Utilities
 * @module utils/query-string
 */

type QueryValue = string | number | boolean | undefined | null

/**
 * Build query string from params object
 * Filters out undefined and null values
 */
export const buildQueryString = (
	params: Record<string, QueryValue>,
): string => {
	const searchParams = new URLSearchParams()

	for (const [key, value] of Object.entries(params)) {
		if (value !== undefined && value !== null) {
			searchParams.append(key, String(value))
		}
	}

	const result = searchParams.toString()
	return result ? `?${result}` : ''
}

/**
 * Build full URL from base, path, and params
 */
export const buildUrl = (
	baseUrl: string,
	path: string,
	params?: Record<string, QueryValue>,
): string => {
	// Handle absolute URLs (path is already a full URL)
	if (path.startsWith('http://') || path.startsWith('https://')) {
		const queryString = params ? buildQueryString(params) : ''
		return `${path}${queryString}`
	}

	// Normalize base URL (remove trailing slash)
	const normalizedBase = baseUrl.replace(/\/$/, '')

	// Normalize path (ensure leading slash)
	const normalizedPath = path.startsWith('/') ? path : `/${path}`

	// Build query string
	const queryString = params ? buildQueryString(params) : ''

	return `${normalizedBase}${normalizedPath}${queryString}`
}
