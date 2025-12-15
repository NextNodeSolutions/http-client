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
	// Uses crypto.getRandomValues for cryptographically secure random
	const timestamp = Date.now().toString(36)
	const array = new Uint8Array(8)
	crypto.getRandomValues(array)
	const random = Array.from(array, b => b.toString(16).padStart(2, '0')).join(
		'',
	)
	return `${timestamp}-${random}`
}
