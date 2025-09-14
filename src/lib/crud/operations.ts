/**
 * CRUD operations with type safety, pagination, and caching
 */

import { success, failure } from '@/types/result.js'
import { createValidationError } from '@/lib/errors.js'
import { coreLogger } from '@/utils/logger.js'

import type { HttpClient } from '@/lib/fetch/client.js'
import type { Result } from '@/types/result.js'
import type { PaginationParams, PaginatedResponse } from '@/types/fetch.js'
import type { HttpClientError, ValidationError } from '@/types/errors.js'

/**
 * Base resource interface
 */
export interface BaseResource {
	id: string | number
	createdAt?: string
	updatedAt?: string
}

/**
 * Query filters
 */
export type QueryFilters = Record<string, unknown>

/**
 * CRUD operation options
 */
export interface CrudOptions {
	/** Custom validation function */
	validate?: (data: unknown) => ValidationError | null
	/** Transform data before sending */
	transform?: (data: unknown) => unknown
	/** Custom headers for this operation */
	headers?: Record<string, string>
	/** Skip caching for this operation */
	skipCache?: boolean
	/** Cache TTL in milliseconds */
	cacheTtl?: number
}

/**
 * Resource configuration
 */
export interface ResourceConfig {
	/** Base endpoint for the resource (e.g., '/users') */
	endpoint: string
	/** Primary key field name (defaults to 'id') */
	idField?: string
	/** Default pagination limit */
	defaultLimit?: number
	/** Maximum pagination limit */
	maxLimit?: number
}

/**
 * CRUD operations class
 */
export class CrudOperations<T extends BaseResource> {
	private cache = new Map<
		string,
		{ data: unknown; timestamp: number; ttl: number }
	>()
	private defaultCacheTtl = 300000 // 5 minutes

	constructor(
		private readonly httpClient: HttpClient,
		private readonly config: ResourceConfig,
	) {
		this.config = {
			idField: 'id',
			defaultLimit: 20,
			maxLimit: 100,
			...config,
		}
	}

	/**
	 * Create a new resource
	 */
	async create(
		data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>,
		options: CrudOptions = {},
	): Promise<Result<T, HttpClientError | ValidationError>> {
		coreLogger.info('Creating resource', {
			details: {
				endpoint: this.config.endpoint,
				hasData: Boolean(data),
			},
		})

		// Validation
		if (options.validate) {
			const validationError = options.validate(data)
			if (validationError) {
				return failure(validationError)
			}
		}

		// Transform data if needed
		const transformedData = options.transform
			? options.transform(data)
			: data

		const [error, response] = await this.httpClient.post<T>(
			this.config.endpoint,
			transformedData,
			{
				...(options.headers && { headers: options.headers }),
			},
		)

		if (error) {
			return failure(error)
		}

		// Clear relevant cache entries
		this.clearCacheByPattern(this.config.endpoint)

		coreLogger.info('Resource created successfully', {
			details: {
				endpoint: this.config.endpoint,
				resourceId: response?.data[this.config.idField! as keyof T],
			},
		})

		return success(response!.data)
	}

	/**
	 * Read a single resource by ID
	 */
	async read(
		id: string | number,
		options: CrudOptions = {},
	): Promise<Result<T, HttpClientError>> {
		const cacheKey = `${this.config.endpoint}/${id}`
		const url = `${this.config.endpoint}/${id}`

		coreLogger.info('Reading resource', {
			details: {
				endpoint: this.config.endpoint,
				resourceId: id,
			},
		})

		// Check cache first
		if (!options.skipCache) {
			const cached = this.getFromCache<T>(cacheKey)
			if (cached) {
				coreLogger.info('Resource found in cache', {
					details: { cacheKey },
				})
				return success(cached)
			}
		}

		const [error, response] = await this.httpClient.get<T>(url, {
			...(options.headers && { headers: options.headers }),
		})

		if (error) {
			return failure(error)
		}

		// Cache the result
		if (!options.skipCache) {
			this.setCache(cacheKey, response!.data, options.cacheTtl)
		}

		coreLogger.info('Resource read successfully', {
			details: {
				endpoint: this.config.endpoint,
				resourceId: id,
			},
		})

		return success(response!.data)
	}

	/**
	 * List resources with pagination and filtering
	 */
	async list(
		params: PaginationParams & QueryFilters = {},
		options: CrudOptions = {},
	): Promise<Result<PaginatedResponse<T>, HttpClientError>> {
		const {
			page = 1,
			limit = this.config.defaultLimit!,
			...filters
		} = params

		// Validate pagination parameters
		const validationError = this.validatePaginationParams({ page, limit })
		if (validationError) {
			return failure(validationError)
		}

		const cacheKey = this.buildCacheKey(this.config.endpoint, params)

		coreLogger.info('Listing resources', {
			details: {
				endpoint: this.config.endpoint,
				page,
				limit,
				filtersCount: Object.keys(filters).length,
			},
		})

		// Check cache first
		if (!options.skipCache) {
			const cached = this.getFromCache<PaginatedResponse<T>>(cacheKey)
			if (cached) {
				coreLogger.info('Resource list found in cache', {
					details: { cacheKey },
				})
				return success(cached)
			}
		}

		// Build query parameters
		const queryParams = new URLSearchParams()
		queryParams.set('page', page.toString())
		queryParams.set('limit', limit.toString())

		// Add filters
		Object.entries(filters).forEach(([key, value]) => {
			if (value !== undefined && value !== null) {
				queryParams.set(key, String(value))
			}
		})

		const url = `${this.config.endpoint}?${queryParams.toString()}`
		const [error, response] = await this.httpClient.get<
			PaginatedResponse<T>
		>(url, {
			...(options.headers && { headers: options.headers }),
		})

		if (error) {
			return failure(error)
		}

		// Cache the result
		if (!options.skipCache) {
			this.setCache(cacheKey, response!.data, options.cacheTtl)
		}

		coreLogger.info('Resources listed successfully', {
			details: {
				endpoint: this.config.endpoint,
				count: response!.data.data.length,
				total: response!.data.pagination.total,
			},
		})

		return success(response!.data)
	}

	/**
	 * Update a resource
	 */
	async update(
		id: string | number,
		data: Partial<Omit<T, 'id' | 'createdAt'>>,
		options: CrudOptions = {},
	): Promise<Result<T, HttpClientError | ValidationError>> {
		const url = `${this.config.endpoint}/${id}`

		coreLogger.info('Updating resource', {
			details: {
				endpoint: this.config.endpoint,
				resourceId: id,
				hasData: Boolean(data),
			},
		})

		// Validation
		if (options.validate) {
			const validationError = options.validate(data)
			if (validationError) {
				return failure(validationError)
			}
		}

		// Transform data if needed
		const transformedData = options.transform
			? options.transform(data)
			: data

		const [error, response] = await this.httpClient.put<T>(
			url,
			transformedData,
			{
				...(options.headers && { headers: options.headers }),
			},
		)

		if (error) {
			return failure(error)
		}

		// Clear relevant cache entries
		this.clearCacheByPattern(`${this.config.endpoint}/${id}`)
		this.clearCacheByPattern(this.config.endpoint)

		coreLogger.info('Resource updated successfully', {
			details: {
				endpoint: this.config.endpoint,
				resourceId: id,
			},
		})

		return success(response!.data)
	}

	/**
	 * Partially update a resource
	 */
	async patch(
		id: string | number,
		data: Partial<Omit<T, 'id' | 'createdAt'>>,
		options: CrudOptions = {},
	): Promise<Result<T, HttpClientError | ValidationError>> {
		const url = `${this.config.endpoint}/${id}`

		coreLogger.info('Patching resource', {
			details: {
				endpoint: this.config.endpoint,
				resourceId: id,
				hasData: Boolean(data),
			},
		})

		// Validation
		if (options.validate) {
			const validationError = options.validate(data)
			if (validationError) {
				return failure(validationError)
			}
		}

		// Transform data if needed
		const transformedData = options.transform
			? options.transform(data)
			: data

		const [error, response] = await this.httpClient.patch<T>(
			url,
			transformedData,
			{
				...(options.headers && { headers: options.headers }),
			},
		)

		if (error) {
			return failure(error)
		}

		// Clear relevant cache entries
		this.clearCacheByPattern(`${this.config.endpoint}/${id}`)
		this.clearCacheByPattern(this.config.endpoint)

		coreLogger.info('Resource patched successfully', {
			details: {
				endpoint: this.config.endpoint,
				resourceId: id,
			},
		})

		return success(response!.data)
	}

	/**
	 * Delete a resource
	 */
	async delete(
		id: string | number,
		options: CrudOptions = {},
	): Promise<Result<void, HttpClientError>> {
		const url = `${this.config.endpoint}/${id}`

		coreLogger.info('Deleting resource', {
			details: {
				endpoint: this.config.endpoint,
				resourceId: id,
			},
		})

		const [error] = await this.httpClient.delete(url, {
			...(options.headers && { headers: options.headers }),
		})

		if (error) {
			return failure(error)
		}

		// Clear relevant cache entries
		this.clearCacheByPattern(`${this.config.endpoint}/${id}`)
		this.clearCacheByPattern(this.config.endpoint)

		coreLogger.info('Resource deleted successfully', {
			details: {
				endpoint: this.config.endpoint,
				resourceId: id,
			},
		})

		return success(undefined)
	}

	/**
	 * Bulk operations
	 */
	async bulkCreate(
		items: Array<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>,
		options: CrudOptions = {},
	): Promise<Result<T[], HttpClientError | ValidationError>> {
		const url = `${this.config.endpoint}/bulk`

		coreLogger.info('Bulk creating resources', {
			details: {
				endpoint: this.config.endpoint,
				count: items.length,
			},
		})

		// Validation
		if (options.validate) {
			for (const item of items) {
				const validationError = options.validate(item)
				if (validationError) {
					return failure(validationError)
				}
			}
		}

		// Transform data if needed
		const transformedData = options.transform
			? items.map(item => options.transform!(item))
			: items

		const [error, response] = await this.httpClient.post<T[]>(
			url,
			transformedData,
			{
				...(options.headers && { headers: options.headers }),
			},
		)

		if (error) {
			return failure(error)
		}

		// Clear relevant cache entries
		this.clearCacheByPattern(this.config.endpoint)

		coreLogger.info('Resources bulk created successfully', {
			details: {
				endpoint: this.config.endpoint,
				count: response!.data.length,
			},
		})

		return success(response!.data)
	}

	async bulkUpdate(
		updates: Array<{
			id: string | number
			data: Partial<Omit<T, 'id' | 'createdAt'>>
		}>,
		options: CrudOptions = {},
	): Promise<Result<T[], HttpClientError | ValidationError>> {
		const url = `${this.config.endpoint}/bulk`

		coreLogger.info('Bulk updating resources', {
			details: {
				endpoint: this.config.endpoint,
				count: updates.length,
			},
		})

		// Validation
		if (options.validate) {
			for (const update of updates) {
				const validationError = options.validate(update.data)
				if (validationError) {
					return failure(validationError)
				}
			}
		}

		// Transform data if needed
		const transformedData = options.transform
			? updates.map(update => ({
					...update,
					data: options.transform!(update.data),
				}))
			: updates

		const [error, response] = await this.httpClient.put<T[]>(
			url,
			transformedData,
			{
				...(options.headers && { headers: options.headers }),
			},
		)

		if (error) {
			return failure(error)
		}

		// Clear relevant cache entries
		this.clearCacheByPattern(this.config.endpoint)

		coreLogger.info('Resources bulk updated successfully', {
			details: {
				endpoint: this.config.endpoint,
				count: response!.data.length,
			},
		})

		return success(response!.data)
	}

	async bulkDelete(
		ids: Array<string | number>,
		options: CrudOptions = {},
	): Promise<Result<void, HttpClientError>> {
		const url = `${this.config.endpoint}/bulk`

		coreLogger.info('Bulk deleting resources', {
			details: {
				endpoint: this.config.endpoint,
				count: ids.length,
			},
		})

		const [error] = await this.httpClient.request(url, {
			method: 'DELETE',
			body: { ids },
			...(options.headers && { headers: options.headers }),
		})

		if (error) {
			return failure(error)
		}

		// Clear relevant cache entries
		this.clearCacheByPattern(this.config.endpoint)

		coreLogger.info('Resources bulk deleted successfully', {
			details: {
				endpoint: this.config.endpoint,
				count: ids.length,
			},
		})

		return success(undefined)
	}

	/**
	 * Cache management
	 */
	clearCache(key?: string): void {
		if (key) {
			this.cache.delete(key)
		} else {
			this.cache.clear()
		}
	}

	getCacheStats(): {
		size: number
		keys: string[]
		oldestEntry?: { key: string; age: number }
	} {
		const keys = Array.from(this.cache.keys())
		let oldestEntry: { key: string; age: number } | undefined

		if (keys.length > 0) {
			let oldestTime = Date.now()
			let oldestKey = keys[0]!

			for (const [key, value] of this.cache) {
				if (value.timestamp < oldestTime) {
					oldestTime = value.timestamp
					oldestKey = key
				}
			}

			oldestEntry = {
				key: oldestKey,
				age: Date.now() - oldestTime,
			}
		}

		return {
			size: this.cache.size,
			keys,
			...(oldestEntry && { oldestEntry }),
		}
	}

	/**
	 * Private methods
	 */
	private validatePaginationParams(params: {
		page: number
		limit: number
	}): ValidationError | null {
		const errors: Record<string, string[]> = {}

		if (params.page < 1) {
			errors.page = ['Page must be greater than 0']
		}

		if (params.limit < 1) {
			errors.limit = ['Limit must be greater than 0']
		}

		if (params.limit > this.config.maxLimit!) {
			errors.limit = errors.limit || []
			errors.limit.push(`Limit must not exceed ${this.config.maxLimit}`)
		}

		if (Object.keys(errors).length > 0) {
			return createValidationError(
				'Invalid pagination parameters',
				errors,
			)
		}

		return null
	}

	private buildCacheKey(
		endpoint: string,
		params: Record<string, unknown>,
	): string {
		const sortedParams = Object.keys(params)
			.sort()
			.map(key => `${key}=${params[key]}`)
			.join('&')

		return `${endpoint}?${sortedParams}`
	}

	private getFromCache<U>(key: string): U | null {
		const cached = this.cache.get(key)
		if (!cached) {
			return null
		}

		// Check if expired
		if (Date.now() - cached.timestamp > cached.ttl) {
			this.cache.delete(key)
			return null
		}

		return cached.data as U
	}

	private setCache(key: string, data: unknown, ttl?: number): void {
		this.cache.set(key, {
			data,
			timestamp: Date.now(),
			ttl: ttl || this.defaultCacheTtl,
		})
	}

	private clearCacheByPattern(pattern: string): void {
		const keysToDelete = Array.from(this.cache.keys()).filter(key =>
			key.includes(pattern),
		)

		for (const key of keysToDelete) {
			this.cache.delete(key)
		}
	}
}

/**
 * Factory function to create CRUD operations
 */
export const createCrudOperations = <T extends BaseResource>(
	httpClient: HttpClient,
	config: ResourceConfig,
): CrudOperations<T> => new CrudOperations<T>(httpClient, config)
