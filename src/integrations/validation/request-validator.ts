/**
 * Request Body Validation
 * @module integrations/validation/request-validator
 */

import type {
	Schema,
	ValidationIssue,
	ValidationResult,
} from '@nextnode/validation'

import type { HttpError, HttpResult } from '../../types/index.js'

/**
 * Create HttpError from validation issues
 */
export const createValidationError = (
	issues: readonly ValidationIssue[],
	context: { url: string; method: string },
): HttpError => ({
	code: 'VALIDATION_ERROR',
	message: `Request body validation failed: ${issues.map(i => i.code).join(', ')}`,
	url: context.url,
	method: context.method,
})

/**
 * Validate request body against schema
 * Returns validated data or HttpResult with error
 */
export const validateRequestBody = <T>(
	body: unknown,
	schema: Schema<T>,
	context: { url: string; method: string },
): HttpResult<T> | { validated: true; data: T } => {
	const result: ValidationResult<T> = schema.safeParse(body)

	if (result.success) {
		return { validated: true, data: result.data }
	}

	return {
		success: false,
		error: createValidationError(result.issues, context),
	}
}

/**
 * Type guard to check if result is validation success
 */
export const isValidatedBody = <T>(
	result: HttpResult<T> | { validated: true; data: T },
): result is { validated: true; data: T } =>
	'validated' in result && result.validated === true
