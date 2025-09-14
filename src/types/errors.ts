/**
 * Error type hierarchy for HTTP client operations
 */

/**
 * Base error interface for all HTTP client errors
 */
export interface BaseHttpError extends Error {
	/** Error code for programmatic handling */
	readonly code: string
	/** Additional context data */
	readonly context?: Record<string, unknown>
	/** Original error if this wraps another error */
	readonly cause?: Error
}

/**
 * Network-related errors (connection issues, DNS, etc.)
 */
export interface NetworkError extends BaseHttpError {
	readonly code: 'NETWORK_ERROR'
	/** The URL that failed */
	readonly url: string
	/** The HTTP method used */
	readonly method: string
}

/**
 * Timeout errors (request took too long)
 */
export interface TimeoutError extends BaseHttpError {
	readonly code: 'TIMEOUT_ERROR'
	/** Timeout duration in milliseconds */
	readonly timeout: number
	/** The URL that timed out */
	readonly url: string
}

/**
 * HTTP errors (4xx, 5xx status codes)
 */
export interface HttpError extends BaseHttpError {
	readonly code: 'HTTP_ERROR'
	/** HTTP status code */
	readonly status: number
	/** HTTP status text */
	readonly statusText: string
	/** Response body if available */
	readonly body?: unknown
	/** Response headers */
	readonly headers?: Record<string, string>
	/** The URL that returned the error */
	readonly url: string
	/** The HTTP method used */
	readonly method: string
}

/**
 * JSON parsing errors
 */
export interface ParseError extends BaseHttpError {
	readonly code: 'PARSE_ERROR'
	/** The raw response text that failed to parse */
	readonly rawResponse: string
	/** The URL of the request */
	readonly url: string
}

/**
 * Request validation errors (invalid parameters, etc.)
 */
export interface ValidationError extends BaseHttpError {
	readonly code: 'VALIDATION_ERROR'
	/** Validation error details */
	readonly errors: Record<string, string[]>
}

/**
 * Request cancellation errors
 */
export interface CancellationError extends BaseHttpError {
	readonly code: 'CANCELLATION_ERROR'
	/** The URL of the cancelled request */
	readonly url: string
	/** The HTTP method of the cancelled request */
	readonly method: string
}

/**
 * Retry exhaustion errors (all retries failed)
 */
export interface RetryExhaustionError extends BaseHttpError {
	readonly code: 'RETRY_EXHAUSTION_ERROR'
	/** Number of attempts made */
	readonly attempts: number
	/** Array of errors from each attempt */
	readonly attemptErrors: Error[]
	/** The URL that failed */
	readonly url: string
	/** The HTTP method used */
	readonly method: string
}

/**
 * Configuration errors (invalid client setup, etc.)
 */
export interface ConfigError extends BaseHttpError {
	readonly code: 'CONFIG_ERROR'
	/** The invalid configuration property */
	readonly property?: string
}

/**
 * Union type of all possible HTTP client errors
 */
export type HttpClientError =
	| NetworkError
	| TimeoutError
	| HttpError
	| ParseError
	| ValidationError
	| CancellationError
	| RetryExhaustionError
	| ConfigError

/**
 * Type guards for error identification
 */
export const isNetworkError = (error: Error): error is NetworkError =>
	'code' in error && error.code === 'NETWORK_ERROR'

export const isTimeoutError = (error: Error): error is TimeoutError =>
	'code' in error && error.code === 'TIMEOUT_ERROR'

export const isHttpError = (error: Error): error is HttpError =>
	'code' in error && error.code === 'HTTP_ERROR'

export const isParseError = (error: Error): error is ParseError =>
	'code' in error && error.code === 'PARSE_ERROR'

export const isValidationError = (error: Error): error is ValidationError =>
	'code' in error && error.code === 'VALIDATION_ERROR'

export const isCancellationError = (error: Error): error is CancellationError =>
	'code' in error && error.code === 'CANCELLATION_ERROR'

export const isRetryExhaustionError = (
	error: Error,
): error is RetryExhaustionError =>
	'code' in error && error.code === 'RETRY_EXHAUSTION_ERROR'

export const isConfigError = (error: Error): error is ConfigError =>
	'code' in error && error.code === 'CONFIG_ERROR'

export const isHttpClientError = (error: Error): error is HttpClientError =>
	isNetworkError(error) ||
	isTimeoutError(error) ||
	isHttpError(error) ||
	isParseError(error) ||
	isValidationError(error) ||
	isCancellationError(error) ||
	isRetryExhaustionError(error) ||
	isConfigError(error)

/**
 * Error severity levels for logging and handling
 */
export enum ErrorSeverity {
	LOW = 'low', // Retryable errors, temporary issues
	MEDIUM = 'medium', // Client errors, validation issues
	HIGH = 'high', // Server errors, configuration issues
	CRITICAL = 'critical', // System failures, security issues
}

/**
 * Get error severity for proper handling and logging
 */
export const getErrorSeverity = (error: HttpClientError): ErrorSeverity => {
	if (isHttpError(error)) {
		if (error.status >= 500) return ErrorSeverity.HIGH
		if (error.status === 429) return ErrorSeverity.LOW // Rate limiting
		if (error.status >= 400) return ErrorSeverity.MEDIUM
	}

	if (isTimeoutError(error) || isNetworkError(error)) {
		return ErrorSeverity.LOW // Usually retryable
	}

	if (isValidationError(error)) {
		return ErrorSeverity.MEDIUM
	}

	if (isConfigError(error)) {
		return ErrorSeverity.HIGH
	}

	return ErrorSeverity.MEDIUM
}
