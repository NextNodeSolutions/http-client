/**
 * HTTP Client Loggers
 * @module utils/logger
 */

import { createLogger } from '@nextnode/logger'

// Main HTTP client logger
export const logger = createLogger()

// Specialized loggers for subsystems
export const clientLogger = createLogger({ prefix: 'HTTP' })
export const cacheLogger = createLogger({ prefix: 'CACHE' })
export const retryLogger = createLogger({ prefix: 'RETRY' })
export const interceptorLogger = createLogger({ prefix: 'INTERCEPTOR' })
export const validationLogger = createLogger({ prefix: 'VALIDATION' })

/**
 * Sensitive headers that should never be logged
 */
const SENSITIVE_HEADERS = new Set([
	'authorization',
	'cookie',
	'set-cookie',
	'x-api-key',
	'x-auth-token',
])

/**
 * Sanitize headers for logging (remove sensitive values)
 */
export const sanitizeHeaders = (
	headers: Headers | Record<string, string>,
): Record<string, string> => {
	const result: Record<string, string> = {}
	const entries =
		headers instanceof Headers ? headers.entries() : Object.entries(headers)

	for (const [key, value] of entries) {
		const lowerKey = key.toLowerCase()
		result[key] = SENSITIVE_HEADERS.has(lowerKey) ? '[REDACTED]' : value
	}

	return result
}

/**
 * Log HTTP request (sanitized)
 */
export const logRequest = (
	method: string,
	url: string,
	requestId: string,
	debug: boolean,
): void => {
	if (!debug) return

	clientLogger.info(`${method} ${url}`, {
		details: { requestId },
	})
}

/**
 * Log HTTP response
 */
export const logResponse = (
	method: string,
	url: string,
	status: number,
	duration: number,
	cached: boolean,
	debug: boolean,
): void => {
	if (!debug) return

	clientLogger.info(`${method} ${url} -> ${status}`, {
		details: {
			status,
			duration: `${duration.toFixed(2)}ms`,
			cached,
		},
	})
}

/**
 * Log HTTP error (no sensitive data)
 */
export const logHttpError = (
	error: unknown,
	context: { url?: string; method?: string; requestId?: string },
	debug: boolean,
): void => {
	if (!debug) return

	const message = error instanceof Error ? error.message : 'Unknown error'

	clientLogger.error('Request failed', {
		details: {
			error: message,
			...context,
		},
	})
}
