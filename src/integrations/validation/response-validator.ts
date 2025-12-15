/**
 * Response Validation
 * @module integrations/validation/response-validator
 */

import type {
	Schema,
	ValidationResult,
	ValidationIssue,
} from '@nextnode/validation'
import type { HttpError, HttpResult, ResponseMeta } from '../../types/index.js'

/**
 * Create HttpError from response validation issues
 */
export const createResponseValidationError = (
	issues: readonly ValidationIssue[],
	context: { url: string; method: string },
	response: ResponseMeta,
): HttpError => ({
	code: 'VALIDATION_ERROR',
	message: `Response validation failed: ${issues.map(i => i.code).join(', ')}`,
	status: response.status,
	statusText: response.statusText,
	url: context.url,
	method: context.method,
})

/**
 * Validate response data against schema
 * Returns validated result or error result
 */
export const validateResponse = <T>(
	data: unknown,
	schema: Schema<T>,
	response: ResponseMeta,
	context: { url: string; method: string },
): HttpResult<T> => {
	const result: ValidationResult<T> = schema.safeParse(data)

	if (result.success) {
		return {
			success: true,
			data: result.data,
			response,
		}
	}

	return {
		success: false,
		error: createResponseValidationError(result.issues, context, response),
		response,
	}
}
