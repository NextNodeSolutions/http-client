/**
 * Validation Integration Module
 * @module integrations/validation
 *
 * Provides integration with @nextnode/validation for:
 * - Request body validation
 * - Response schema validation
 *
 * @example
 * ```typescript
 * import { createHttpClient } from '@nextnode/http-client'
 * import { userSchema, createUserSchema } from './schemas'
 *
 * const api = createHttpClient({ baseUrl: 'https://api.example.com' })
 *
 * // Response validation
 * const result = await api.get('/users/123', {
 *   responseSchema: userSchema
 * })
 *
 * // Request body validation
 * const result = await api.post('/users', userData, {
 *   bodySchema: createUserSchema,
 *   responseSchema: userSchema
 * })
 * ```
 */

export {
	createValidationError,
	isValidatedBody,
	validateRequestBody,
} from './request-validator.js'

export {
	createResponseValidationError,
	validateResponse,
} from './response-validator.js'
