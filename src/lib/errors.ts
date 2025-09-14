/**
 * Error factory functions for creating standardized HTTP client errors
 */

import type {
	NetworkError,
	TimeoutError,
	HttpError,
	ParseError,
	ValidationError,
	CancellationError,
	RetryExhaustionError,
	ConfigError,
} from '@/types/errors.js'

/**
 * Create a network error
 */
export const createNetworkError = (
	url: string,
	method: string,
	cause?: Error,
	context?: Record<string, unknown>,
): NetworkError => {
	const error = new Error(
		`Network error: Failed to ${method} ${url}`,
	) as NetworkError

	Object.defineProperties(error, {
		code: { value: 'NETWORK_ERROR' as const, enumerable: true },
		url: { value: url, enumerable: true },
		method: { value: method, enumerable: true },
		cause: { value: cause, enumerable: true },
		context: { value: context, enumerable: true },
	})

	return error
}

/**
 * Create a timeout error
 */
export const createTimeoutError = (
	url: string,
	timeout: number,
	context?: Record<string, unknown>,
): TimeoutError => {
	const error = new Error(
		`Request timeout: ${url} exceeded ${timeout}ms`,
	) as TimeoutError

	Object.defineProperties(error, {
		code: { value: 'TIMEOUT_ERROR' as const, enumerable: true },
		url: { value: url, enumerable: true },
		timeout: { value: timeout, enumerable: true },
		context: { value: context, enumerable: true },
	})

	return error
}

/**
 * Create an HTTP error
 */
export const createHttpError = (
	status: number,
	statusText: string,
	url: string,
	method: string,
	body?: unknown,
	headers?: Record<string, string>,
	context?: Record<string, unknown>,
): HttpError => {
	const error = new Error(
		`HTTP ${status} ${statusText}: ${method} ${url}`,
	) as HttpError

	Object.defineProperties(error, {
		code: { value: 'HTTP_ERROR' as const, enumerable: true },
		status: { value: status, enumerable: true },
		statusText: { value: statusText, enumerable: true },
		url: { value: url, enumerable: true },
		method: { value: method, enumerable: true },
		body: { value: body, enumerable: true },
		headers: { value: headers, enumerable: true },
		context: { value: context, enumerable: true },
	})

	return error
}

/**
 * Create a JSON parse error
 */
export const createParseError = (
	url: string,
	rawResponse: string,
	cause?: Error,
	context?: Record<string, unknown>,
): ParseError => {
	const error = new Error(
		`Failed to parse JSON response from ${url}`,
	) as ParseError

	Object.defineProperties(error, {
		code: { value: 'PARSE_ERROR' as const, enumerable: true },
		url: { value: url, enumerable: true },
		rawResponse: { value: rawResponse, enumerable: true },
		cause: { value: cause, enumerable: true },
		context: { value: context, enumerable: true },
	})

	return error
}

/**
 * Create a validation error
 */
export const createValidationError = (
	message: string,
	errors: Record<string, string[]>,
	context?: Record<string, unknown>,
): ValidationError => {
	const error = new Error(message) as ValidationError

	Object.defineProperties(error, {
		code: { value: 'VALIDATION_ERROR' as const, enumerable: true },
		errors: { value: errors, enumerable: true },
		context: { value: context, enumerable: true },
	})

	return error
}

/**
 * Create a cancellation error
 */
export const createCancellationError = (
	url: string,
	method: string,
	context?: Record<string, unknown>,
): CancellationError => {
	const error = new Error(
		`Request cancelled: ${method} ${url}`,
	) as CancellationError

	Object.defineProperties(error, {
		code: { value: 'CANCELLATION_ERROR' as const, enumerable: true },
		url: { value: url, enumerable: true },
		method: { value: method, enumerable: true },
		context: { value: context, enumerable: true },
	})

	return error
}

/**
 * Create a retry exhaustion error
 */
export const createRetryExhaustionError = (
	url: string,
	method: string,
	attempts: number,
	attemptErrors: Error[],
	context?: Record<string, unknown>,
): RetryExhaustionError => {
	const error = new Error(
		`Retry exhausted: ${method} ${url} failed after ${attempts} attempts`,
	) as RetryExhaustionError

	Object.defineProperties(error, {
		code: { value: 'RETRY_EXHAUSTION_ERROR' as const, enumerable: true },
		url: { value: url, enumerable: true },
		method: { value: method, enumerable: true },
		attempts: { value: attempts, enumerable: true },
		attemptErrors: { value: attemptErrors, enumerable: true },
		context: { value: context, enumerable: true },
	})

	return error
}

/**
 * Create a configuration error
 */
export const createConfigError = (
	message: string,
	property?: string,
	context?: Record<string, unknown>,
): ConfigError => {
	const error = new Error(`Configuration error: ${message}`) as ConfigError

	Object.defineProperties(error, {
		code: { value: 'CONFIG_ERROR' as const, enumerable: true },
		property: { value: property, enumerable: true },
		context: { value: context, enumerable: true },
	})

	return error
}

/**
 * Convert a generic Error to appropriate HttpClientError based on context
 */
export const normalizeError = (
	error: Error | TypeError | DOMException,
	url: string,
	method: string,
	context?: Record<string, unknown>,
): NetworkError | CancellationError | TimeoutError => {
	// AbortError from fetch
	if (error.name === 'AbortError') {
		return createCancellationError(url, method, context)
	}

	// TimeoutError or custom timeout
	if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
		return createTimeoutError(url, 30000, context) // Default timeout
	}

	// Network errors (TypeError is common for network issues in fetch)
	if (error instanceof TypeError || error.message.includes('fetch')) {
		return createNetworkError(url, method, error, context)
	}

	// Default to network error
	return createNetworkError(url, method, error, context)
}

/**
 * Extract error details for logging and debugging
 */
export const extractErrorDetails = (error: Error): Record<string, unknown> => {
	const details: Record<string, unknown> = {
		name: error.name,
		message: error.message,
		stack: error.stack,
	}

	// Add HTTP client specific details if available
	if ('code' in error) {
		details.code = error.code
	}

	if ('status' in error) {
		details.status = error.status
	}

	if ('url' in error) {
		details.url = error.url
	}

	if ('method' in error) {
		details.method = error.method
	}

	if ('context' in error) {
		details.context = error.context
	}

	return details
}
