/**
 * Error Module - Barrel Export
 * @module lib/errors
 */

export {
	HttpErrorCodes,
	isClientError,
	isServerError,
	RETRYABLE_STATUS_CODES,
} from './codes.js'

export { createHttpError, mapFetchError } from './mapping.js'
