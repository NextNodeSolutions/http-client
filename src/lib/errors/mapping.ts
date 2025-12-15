/**
 * Error Mapping - Native errors to HttpError
 * @module lib/errors/mapping
 */

import { HttpErrorCodes, isClientError, isServerError } from './codes.js'

import type { HttpError, HttpErrorCode } from '../../types/index.js'

/**
 * Simple error context for error creation
 */
interface ErrorMappingContext {
	url?: string
	method?: string
	requestId?: string
}

/**
 * Map native fetch errors to HttpError
 */
export const mapFetchError = (
	error: unknown,
	context: ErrorMappingContext,
): HttpError => {
	// AbortError (timeout or manual abort)
	if (error instanceof DOMException && error.name === 'AbortError') {
		return {
			code: HttpErrorCodes.ABORT_ERROR,
			message: 'Request was aborted',
			cause: error,
			...context,
		}
	}

	// TypeError (network failure - fetch throws TypeError for network issues)
	if (error instanceof TypeError) {
		return {
			code: HttpErrorCodes.NETWORK_ERROR,
			message: `Network error: ${error.message}`,
			cause: error,
			...context,
		}
	}

	// SyntaxError (JSON parse failure)
	if (error instanceof SyntaxError) {
		return {
			code: HttpErrorCodes.PARSE_ERROR,
			message: `Failed to parse response: ${error.message}`,
			cause: error,
			...context,
		}
	}

	// Unknown error
	const result: HttpError = {
		code: HttpErrorCodes.UNKNOWN_ERROR,
		message:
			error instanceof Error ? error.message : 'Unknown error occurred',
		...context,
	}

	if (error instanceof Error) {
		return { ...result, cause: error }
	}

	return result
}

/**
 * Create HttpError from HTTP status code
 */
export const createHttpError = (
	status: number,
	statusText: string,
	context: ErrorMappingContext & { body?: unknown },
): HttpError => {
	let code: HttpErrorCode

	if (isServerError(status)) {
		code = HttpErrorCodes.SERVER_ERROR
	} else if (isClientError(status)) {
		code = HttpErrorCodes.CLIENT_ERROR
	} else {
		code = HttpErrorCodes.UNKNOWN_ERROR
	}

	return {
		code,
		message: `HTTP ${status}: ${statusText}`,
		status,
		statusText,
		...context,
	}
}
