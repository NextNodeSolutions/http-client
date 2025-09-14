/**
 * Result type for error handling without exceptions
 * Pattern: [error, data] where only one is defined
 */

/**
 * Success result containing data
 */
export type Success<T> = readonly [null, T]

/**
 * Error result containing error information
 */
export type Failure<E> = readonly [E, null]

/**
 * Result type that represents either success with data or failure with error
 * Usage: const [error, data] = await someOperation()
 */
export type Result<T, E = Error> = Success<T> | Failure<E>

/**
 * Helper to create a success result
 */
export const success = <T>(data: T): Success<T> => [null, data] as const

/**
 * Helper to create a failure result
 */
export const failure = <E>(error: E): Failure<E> => [error, null] as const

/**
 * Type guard to check if result is success
 */
export const isSuccess = <T, E>(result: Result<T, E>): result is Success<T> =>
	result[0] === null

/**
 * Type guard to check if result is failure
 */
export const isFailure = <T, E>(result: Result<T, E>): result is Failure<E> =>
	result[0] !== null

/**
 * Async version of Result for Promise-based operations
 */
export type AsyncResult<T, E = Error> = Promise<Result<T, E>>
