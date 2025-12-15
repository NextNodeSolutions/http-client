/**
 * Request ID Generation
 * @module utils/request-id
 */

/**
 * Generate a unique request ID for tracing
 * Uses crypto.randomUUID if available, falls back to timestamp-based ID
 */
export const generateRequestId = (): string => {
	if (typeof crypto !== 'undefined' && crypto.randomUUID) {
		return crypto.randomUUID()
	}

	// Fallback for environments without crypto.randomUUID
	const timestamp = Date.now().toString(36)
	const random = Math.random().toString(36).substring(2, 10)
	return `${timestamp}-${random}`
}
