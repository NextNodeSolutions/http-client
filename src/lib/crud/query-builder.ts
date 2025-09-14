/**
 * Advanced query builder for CRUD operations
 */

import type { PaginationParams } from '@/types/fetch.js'
import type { QueryFilters } from './operations.js'

/**
 * Comparison operators
 */
export type ComparisonOperator =
	| 'eq' // equals
	| 'ne' // not equals
	| 'gt' // greater than
	| 'gte' // greater than or equal
	| 'lt' // less than
	| 'lte' // less than or equal
	| 'like' // SQL LIKE
	| 'ilike' // case-insensitive LIKE
	| 'in' // in array
	| 'nin' // not in array
	| 'null' // is null
	| 'nnull' // is not null

/**
 * Logical operators
 */
export type LogicalOperator = 'and' | 'or'

/**
 * Sort direction
 */
export type SortDirection = 'asc' | 'desc'

/**
 * Filter condition
 */
export interface FilterCondition {
	field: string
	operator: ComparisonOperator
	value?: unknown
}

/**
 * Complex filter with logical operators
 */
export interface ComplexFilter {
	conditions: Array<FilterCondition | ComplexFilter>
	operator: LogicalOperator
}

/**
 * Sort configuration
 */
export interface SortConfig {
	field: string
	direction: SortDirection
}

/**
 * Query builder class
 */
export class QueryBuilder {
	private filters: Array<FilterCondition | ComplexFilter> = []
	private sortConfig: SortConfig[] = []
	private paginationConfig: PaginationParams = {}

	/**
	 * Add a simple filter condition
	 */
	where(
		field: string,
		operator: ComparisonOperator,
		value?: unknown,
	): QueryBuilder {
		this.filters.push({ field, operator, value })
		return this
	}

	/**
	 * Add an equality filter (shorthand)
	 */
	whereEquals(field: string, value: unknown): QueryBuilder {
		return this.where(field, 'eq', value)
	}

	/**
	 * Add a not equals filter (shorthand)
	 */
	whereNotEquals(field: string, value: unknown): QueryBuilder {
		return this.where(field, 'ne', value)
	}

	/**
	 * Add a greater than filter (shorthand)
	 */
	whereGreaterThan(field: string, value: unknown): QueryBuilder {
		return this.where(field, 'gt', value)
	}

	/**
	 * Add a greater than or equal filter (shorthand)
	 */
	whereGreaterThanOrEqual(field: string, value: unknown): QueryBuilder {
		return this.where(field, 'gte', value)
	}

	/**
	 * Add a less than filter (shorthand)
	 */
	whereLessThan(field: string, value: unknown): QueryBuilder {
		return this.where(field, 'lt', value)
	}

	/**
	 * Add a less than or equal filter (shorthand)
	 */
	whereLessThanOrEqual(field: string, value: unknown): QueryBuilder {
		return this.where(field, 'lte', value)
	}

	/**
	 * Add a LIKE filter (shorthand)
	 */
	whereLike(field: string, pattern: string): QueryBuilder {
		return this.where(field, 'like', pattern)
	}

	/**
	 * Add a case-insensitive LIKE filter (shorthand)
	 */
	whereILike(field: string, pattern: string): QueryBuilder {
		return this.where(field, 'ilike', pattern)
	}

	/**
	 * Add an IN filter (shorthand)
	 */
	whereIn(field: string, values: unknown[]): QueryBuilder {
		return this.where(field, 'in', values)
	}

	/**
	 * Add a NOT IN filter (shorthand)
	 */
	whereNotIn(field: string, values: unknown[]): QueryBuilder {
		return this.where(field, 'nin', values)
	}

	/**
	 * Add an IS NULL filter (shorthand)
	 */
	whereNull(field: string): QueryBuilder {
		return this.where(field, 'null')
	}

	/**
	 * Add an IS NOT NULL filter (shorthand)
	 */
	whereNotNull(field: string): QueryBuilder {
		return this.where(field, 'nnull')
	}

	/**
	 * Add a between filter (convenience method)
	 */
	whereBetween(field: string, min: unknown, max: unknown): QueryBuilder {
		return this.where(field, 'gte', min).where(field, 'lte', max)
	}

	/**
	 * Add date range filters
	 */
	whereDateRange(
		field: string,
		startDate: Date,
		endDate: Date,
	): QueryBuilder {
		return this.where(field, 'gte', startDate.toISOString()).where(
			field,
			'lte',
			endDate.toISOString(),
		)
	}

	/**
	 * Add complex filter with logical operator
	 */
	whereComplex(
		operator: LogicalOperator,
		buildFn: (builder: QueryBuilder) => QueryBuilder,
	): QueryBuilder {
		const subBuilder = new QueryBuilder()
		buildFn(subBuilder)

		if (subBuilder.filters.length > 0) {
			this.filters.push({
				conditions: subBuilder.filters,
				operator,
			})
		}

		return this
	}

	/**
	 * Add OR condition group
	 */
	orWhere(buildFn: (builder: QueryBuilder) => QueryBuilder): QueryBuilder {
		return this.whereComplex('or', buildFn)
	}

	/**
	 * Add AND condition group (default behavior, but explicit)
	 */
	andWhere(buildFn: (builder: QueryBuilder) => QueryBuilder): QueryBuilder {
		return this.whereComplex('and', buildFn)
	}

	/**
	 * Add sorting
	 */
	orderBy(field: string, direction: SortDirection = 'asc'): QueryBuilder {
		this.sortConfig.push({ field, direction })
		return this
	}

	/**
	 * Add ascending sort (shorthand)
	 */
	orderByAsc(field: string): QueryBuilder {
		return this.orderBy(field, 'asc')
	}

	/**
	 * Add descending sort (shorthand)
	 */
	orderByDesc(field: string): QueryBuilder {
		return this.orderBy(field, 'desc')
	}

	/**
	 * Set pagination
	 */
	paginate(page: number, limit: number): QueryBuilder {
		this.paginationConfig = { page, limit }
		return this
	}

	/**
	 * Set offset-based pagination
	 */
	offset(offset: number, limit: number): QueryBuilder {
		this.paginationConfig = { offset, limit }
		return this
	}

	/**
	 * Set cursor-based pagination
	 */
	cursor(cursor: string, limit: number): QueryBuilder {
		this.paginationConfig = { cursor, limit }
		return this
	}

	/**
	 * Limit results
	 */
	limit(limit: number): QueryBuilder {
		this.paginationConfig.limit = limit
		return this
	}

	/**
	 * Build the final query parameters
	 */
	build(): PaginationParams & QueryFilters {
		const params: PaginationParams & QueryFilters = {
			...this.paginationConfig,
		}

		// Add filters
		if (this.filters.length > 0) {
			const serializedFilters = this.serializeFilters(this.filters)
			// Merge serialized filters directly into params
			Object.assign(params, serializedFilters)
		}

		// Add sorting
		if (this.sortConfig.length > 0) {
			params.sortBy = this.sortConfig.map(s => s.field).join(',')
			params.sortOrder = this.sortConfig
				.map(s => s.direction)
				.join(',') as 'asc' | 'desc'
		}

		return params
	}

	/**
	 * Build URL search parameters
	 */
	buildUrlParams(): URLSearchParams {
		const params = this.build()
		const urlParams = new URLSearchParams()

		Object.entries(params).forEach(([key, value]) => {
			if (value !== undefined && value !== null) {
				if (typeof value === 'object') {
					urlParams.set(key, JSON.stringify(value))
				} else {
					urlParams.set(key, String(value))
				}
			}
		})

		return urlParams
	}

	/**
	 * Clone the query builder
	 */
	clone(): QueryBuilder {
		const clone = new QueryBuilder()
		clone.filters = [...this.filters]
		clone.sortConfig = [...this.sortConfig]
		clone.paginationConfig = { ...this.paginationConfig }
		return clone
	}

	/**
	 * Reset the query builder
	 */
	reset(): QueryBuilder {
		this.filters = []
		this.sortConfig = []
		this.paginationConfig = {}
		return this
	}

	/**
	 * Get a summary of the current query
	 */
	getSummary(): {
		filtersCount: number
		sortFields: string[]
		pagination: PaginationParams
		complexity: 'simple' | 'medium' | 'complex'
	} {
		const filtersCount = this.countFilters(this.filters)
		let complexity: 'simple' | 'medium' | 'complex' = 'simple'

		if (filtersCount > 5 || this.hasComplexFilters(this.filters)) {
			complexity = 'complex'
		} else if (filtersCount > 2 || this.sortConfig.length > 1) {
			complexity = 'medium'
		}

		return {
			filtersCount,
			sortFields: this.sortConfig.map(s => s.field),
			pagination: this.paginationConfig,
			complexity,
		}
	}

	/**
	 * Private methods
	 */
	private serializeFilters(
		filters: Array<FilterCondition | ComplexFilter>,
	): Record<string, unknown> {
		if (filters.length === 0) {
			return {}
		}

		// For simple API compatibility, try to flatten simple conditions
		const simpleFilters: Record<string, unknown> = {}
		const complexFilters: Array<FilterCondition | ComplexFilter> = []

		for (const filter of filters) {
			if ('field' in filter && filter.operator === 'eq') {
				// Simple equality filter
				simpleFilters[filter.field] = filter.value
			} else {
				complexFilters.push(filter)
			}
		}

		// If we have complex filters, use a structured format
		if (complexFilters.length > 0) {
			return {
				...simpleFilters,
				$complex: complexFilters,
			}
		}

		return simpleFilters
	}

	private countFilters(
		filters: Array<FilterCondition | ComplexFilter>,
	): number {
		let count = 0
		for (const filter of filters) {
			if ('field' in filter) {
				count += 1
			} else {
				count += this.countFilters(filter.conditions)
			}
		}
		return count
	}

	private hasComplexFilters(
		filters: Array<FilterCondition | ComplexFilter>,
	): boolean {
		return filters.some(filter => !('field' in filter))
	}
}

/**
 * Factory function to create a new query builder
 */
export const createQueryBuilder = (): QueryBuilder => new QueryBuilder()

/**
 * Common query builder presets
 */
export const queryPresets = {
	/**
	 * Recent items (created in the last N days)
	 */
	recent: (days = 7): QueryBuilder => {
		const date = new Date()
		date.setDate(date.getDate() - days)

		return createQueryBuilder()
			.whereGreaterThanOrEqual('createdAt', date.toISOString())
			.orderByDesc('createdAt')
	},

	/**
	 * Active items (not soft deleted)
	 */
	active: (): QueryBuilder =>
		createQueryBuilder().whereNotEquals('deletedAt', null),

	/**
	 * Search by text in multiple fields
	 */
	textSearch: (query: string, fields: string[]): QueryBuilder => {
		const builder = createQueryBuilder()

		return builder.orWhere(subBuilder => {
			for (const field of fields) {
				subBuilder.whereILike(field, `%${query}%`)
			}
			return subBuilder
		})
	},

	/**
	 * Date range query
	 */
	dateRange: (field: string, start: Date, end: Date): QueryBuilder =>
		createQueryBuilder().whereDateRange(field, start, end),

	/**
	 * Paginated recent items
	 */
	recentPaginated: (page = 1, limit = 20, days = 7): QueryBuilder =>
		queryPresets.recent(days).paginate(page, limit),
}
