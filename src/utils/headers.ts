/**
 * Header Utilities
 * @module utils/headers
 */

/**
 * Merge headers objects into a single Headers instance
 * Later headers override earlier ones
 */
export const mergeHeaders = (
	...headerSources: (Record<string, string> | Headers | undefined)[]
): Headers => {
	const result = new Headers()

	for (const source of headerSources) {
		if (!source) continue

		const entries =
			source instanceof Headers
				? source.entries()
				: Object.entries(source)

		for (const [key, value] of entries) {
			result.set(key, value)
		}
	}

	return result
}

/**
 * Create default headers for JSON requests
 */
export const createJsonHeaders = (): Headers =>
	new Headers({
		'Content-Type': 'application/json',
		Accept: 'application/json',
	})

/**
 * Create Authorization header with Bearer token
 */
export const createBearerAuthHeader = (
	token: string,
): Record<string, string> => ({
	Authorization: `Bearer ${token}`,
})

/**
 * Create Authorization header with Basic auth
 */
export const createBasicAuthHeader = (
	username: string,
	password: string,
): Record<string, string> => {
	const encoded = btoa(`${username}:${password}`)
	return {
		Authorization: `Basic ${encoded}`,
	}
}

/**
 * Check if response has JSON content type
 */
export const isJsonContentType = (headers: Headers): boolean => {
	const contentType = headers.get('content-type')
	return contentType?.includes('application/json') ?? false
}
