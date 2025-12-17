/**
 * HTTP Error Codes
 * @module lib/errors/codes
 */

import type { HttpErrorCode } from '../../types/index.js'

/**
 * Error codes enum for runtime use
 */
export const HttpErrorCodes = {
	NETWORK_ERROR: 'NETWORK_ERROR',
	TIMEOUT_ERROR: 'TIMEOUT_ERROR',
	ABORT_ERROR: 'ABORT_ERROR',
	PARSE_ERROR: 'PARSE_ERROR',
	VALIDATION_ERROR: 'VALIDATION_ERROR',
	CLIENT_ERROR: 'CLIENT_ERROR',
	SERVER_ERROR: 'SERVER_ERROR',
	UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const satisfies Record<HttpErrorCode, HttpErrorCode>

/**
 * Status codes that indicate retryable errors
 */
export const RETRYABLE_STATUS_CODES = [408, 429, 500, 502, 503, 504] as const

/**
 * Check if status code indicates a client error (4xx)
 */
export const isClientError = (status: number): boolean =>
	status >= 400 && status < 500

/**
 * Check if status code indicates a server error (5xx)
 */
export const isServerError = (status: number): boolean =>
	status >= 500 && status < 600
