/**
 * Tests for Query Builder
 */

import { describe, it, expect } from 'vitest'

import {
	QueryBuilder,
	createQueryBuilder,
	queryPresets,
} from '@/lib/crud/query-builder.js'

describe('QueryBuilder', () => {
	let builder: QueryBuilder

	beforeEach(() => {
		builder = new QueryBuilder()
	})

	describe('basic filtering', () => {
		it('should add simple equality filters', () => {
			const params = builder
				.whereEquals('name', 'John')
				.whereEquals('age', 25)
				.build()

			expect(params).toEqual({
				name: 'John',
				age: 25,
			})
		})

		it('should add comparison filters', () => {
			const params = builder
				.whereGreaterThan('age', 18)
				.whereLessThanOrEqual('score', 100)
				.build()

			expect(params.$complex).toEqual([
				{ field: 'age', operator: 'gt', value: 18 },
				{ field: 'score', operator: 'lte', value: 100 },
			])
		})

		it('should add LIKE filters', () => {
			const params = builder
				.whereLike('name', 'John%')
				.whereILike('email', '%example.com')
				.build()

			expect(params.$complex).toEqual([
				{ field: 'name', operator: 'like', value: 'John%' },
				{ field: 'email', operator: 'ilike', value: '%example.com' },
			])
		})

		it('should add IN filters', () => {
			const params = builder
				.whereIn('status', ['active', 'pending'])
				.whereNotIn('role', ['admin'])
				.build()

			expect(params.$complex).toEqual([
				{
					field: 'status',
					operator: 'in',
					value: ['active', 'pending'],
				},
				{ field: 'role', operator: 'nin', value: ['admin'] },
			])
		})

		it('should add NULL filters', () => {
			const params = builder
				.whereNull('deletedAt')
				.whereNotNull('createdAt')
				.build()

			expect(params.$complex).toEqual([
				{ field: 'deletedAt', operator: 'null' },
				{ field: 'createdAt', operator: 'nnull' },
			])
		})

		it('should add between filters', () => {
			const params = builder.whereBetween('age', 18, 65).build()

			expect(params.$complex).toEqual([
				{ field: 'age', operator: 'gte', value: 18 },
				{ field: 'age', operator: 'lte', value: 65 },
			])
		})

		it('should add date range filters', () => {
			const startDate = new Date('2024-01-01')
			const endDate = new Date('2024-12-31')

			const params = builder
				.whereDateRange('createdAt', startDate, endDate)
				.build()

			expect(params.$complex).toEqual([
				{
					field: 'createdAt',
					operator: 'gte',
					value: '2024-01-01T00:00:00.000Z',
				},
				{
					field: 'createdAt',
					operator: 'lte',
					value: '2024-12-31T00:00:00.000Z',
				},
			])
		})
	})

	describe('complex filtering', () => {
		it('should handle OR conditions', () => {
			const params = builder
				.whereEquals('status', 'active')
				.orWhere(sub =>
					sub
						.whereEquals('role', 'admin')
						.whereGreaterThan('score', 90),
				)
				.build()

			expect(params.status).toBe('active')
			expect(params.$complex).toEqual([
				{
					conditions: [
						{ field: 'role', operator: 'eq', value: 'admin' },
						{ field: 'score', operator: 'gt', value: 90 },
					],
					operator: 'or',
				},
			])
		})

		it('should handle AND conditions explicitly', () => {
			const params = builder
				.andWhere(sub =>
					sub.whereGreaterThan('age', 18).whereLessThan('age', 65),
				)
				.build()

			expect(params.$complex).toEqual([
				{
					conditions: [
						{ field: 'age', operator: 'gt', value: 18 },
						{ field: 'age', operator: 'lt', value: 65 },
					],
					operator: 'and',
				},
			])
		})

		it('should handle nested complex conditions', () => {
			const params = builder
				.whereEquals('active', true)
				.orWhere(sub1 =>
					sub1
						.whereEquals('role', 'admin')
						.andWhere(sub2 =>
							sub2
								.whereGreaterThan('lastLogin', '2024-01-01')
								.whereNotNull('permissions'),
						),
				)
				.build()

			expect(params.active).toBe(true)
			expect(params.$complex).toBeDefined()
		})
	})

	describe('sorting', () => {
		it('should add single sort field', () => {
			const params = builder.orderByDesc('createdAt').build()

			expect(params.sortBy).toBe('createdAt')
			expect(params.sortOrder).toBe('desc')
		})

		it('should add multiple sort fields', () => {
			const params = builder
				.orderByDesc('priority')
				.orderByAsc('createdAt')
				.build()

			expect(params.sortBy).toBe('priority,createdAt')
			expect(params.sortOrder).toBe('desc,asc')
		})

		it('should use default ascending order', () => {
			const params = builder.orderBy('name').build()

			expect(params.sortBy).toBe('name')
			expect(params.sortOrder).toBe('asc')
		})
	})

	describe('pagination', () => {
		it('should set page-based pagination', () => {
			const params = builder.paginate(2, 25).build()

			expect(params.page).toBe(2)
			expect(params.limit).toBe(25)
		})

		it('should set offset-based pagination', () => {
			const params = builder.offset(50, 10).build()

			expect(params.offset).toBe(50)
			expect(params.limit).toBe(10)
		})

		it('should set cursor-based pagination', () => {
			const params = builder.cursor('eyJpZCI6MTIzfQ', 20).build()

			expect(params.cursor).toBe('eyJpZCI6MTIzfQ')
			expect(params.limit).toBe(20)
		})

		it('should set limit only', () => {
			const params = builder.limit(15).build()

			expect(params.limit).toBe(15)
		})
	})

	describe('url parameters', () => {
		it('should build URL search parameters', () => {
			const urlParams = builder
				.whereEquals('name', 'John')
				.whereGreaterThan('age', 18)
				.orderByDesc('createdAt')
				.paginate(1, 20)
				.buildUrlParams()

			const params = Object.fromEntries(urlParams.entries())

			expect(params.name).toBe('John')
			expect(params.page).toBe('1')
			expect(params.limit).toBe('20')
			expect(params.sortBy).toBe('createdAt')
			expect(params.sortOrder).toBe('desc')
			expect(params['$complex']).toBeDefined()
		})

		it('should serialize complex objects as JSON', () => {
			const urlParams = builder
				.whereIn('status', ['active', 'pending'])
				.buildUrlParams()

			const complexParam = urlParams.get('$complex')
			expect(complexParam).toBeDefined()
			expect(() => JSON.parse(complexParam!)).not.toThrow()
		})
	})

	describe('query management', () => {
		it('should clone query builder', () => {
			const original = builder
				.whereEquals('name', 'John')
				.orderByDesc('createdAt')

			const clone = original.clone()
			const originalParams = original.build()
			const cloneParams = clone.build()

			expect(cloneParams).toEqual(originalParams)

			// Modify clone to ensure independence
			clone.whereEquals('age', 25)
			const modifiedCloneParams = clone.build()
			const unchangedOriginalParams = original.build()

			expect(modifiedCloneParams).not.toEqual(unchangedOriginalParams)
		})

		it('should reset query builder', () => {
			builder
				.whereEquals('name', 'John')
				.orderByDesc('createdAt')
				.paginate(2, 10)

			const beforeReset = builder.build()
			expect(Object.keys(beforeReset).length).toBeGreaterThan(3) // Should have multiple keys

			const afterReset = builder.reset().build()
			expect(Object.keys(afterReset)).toHaveLength(0)
		})

		it('should provide query summary', () => {
			builder
				.whereEquals('name', 'John')
				.whereGreaterThan('age', 18)
				.whereLike('email', '%example.com')
				.orderByDesc('createdAt')
				.orderByAsc('name')
				.paginate(1, 20)

			const summary = builder.getSummary()

			expect(summary.filtersCount).toBe(3)
			expect(summary.sortFields).toEqual(['createdAt', 'name'])
			expect(summary.pagination).toEqual({ page: 1, limit: 20 })
			expect(summary.complexity).toBe('medium')
		})

		it('should detect complex queries', () => {
			builder
				.whereEquals('active', true)
				.orWhere(sub =>
					sub
						.whereEquals('role', 'admin')
						.whereGreaterThan('score', 90),
				)
				.andWhere(sub => sub.whereNotNull('lastLogin'))

			const summary = builder.getSummary()
			expect(summary.complexity).toBe('complex')
		})
	})

	describe('factory function', () => {
		it('should create new query builder', () => {
			const newBuilder = createQueryBuilder()
			expect(newBuilder).toBeInstanceOf(QueryBuilder)
		})
	})

	describe('query presets', () => {
		it('should create recent items query', () => {
			const query = queryPresets.recent(30)
			const params = query.build()

			expect(params.$complex).toBeDefined()
			expect(params.sortBy).toBe('createdAt')
			expect(params.sortOrder).toBe('desc')
		})

		it('should create active items query', () => {
			const query = queryPresets.active()
			const params = query.build()

			expect(params.$complex).toEqual([
				{ field: 'deletedAt', operator: 'ne', value: null },
			])
		})

		it('should create text search query', () => {
			const query = queryPresets.textSearch('john', [
				'name',
				'email',
				'description',
			])
			const params = query.build()

			expect(params.$complex).toBeDefined()
			// Should create OR conditions for each field
			expect(params.$complex[0].operator).toBe('or')
			expect(params.$complex[0].conditions).toHaveLength(3)
		})

		it('should create date range query', () => {
			const start = new Date('2024-01-01')
			const end = new Date('2024-12-31')
			const query = queryPresets.dateRange('createdAt', start, end)
			const params = query.build()

			expect(params.$complex).toBeDefined()
			expect(params.$complex).toHaveLength(2)
			expect(params.$complex[0].operator).toBe('gte')
			expect(params.$complex[1].operator).toBe('lte')
		})

		it('should create paginated recent items query', () => {
			const query = queryPresets.recentPaginated(2, 15, 14)
			const params = query.build()

			expect(params.page).toBe(2)
			expect(params.limit).toBe(15)
			expect(params.$complex).toBeDefined()
			expect(params.sortBy).toBe('createdAt')
			expect(params.sortOrder).toBe('desc')
		})
	})
})
