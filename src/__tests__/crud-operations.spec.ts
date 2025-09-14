/**
 * Tests for CRUD operations
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { CrudOperations, createCrudOperations } from '@/lib/crud/operations.js'
import { createValidationError, createHttpError } from '@/lib/errors.js'

import type { HttpClient } from '@/lib/fetch/client.js'
import type {
	BaseResource,
	ResourceConfig,
	CrudOptions,
} from '@/lib/crud/operations.js'
import type { HttpResponse } from '@/types/fetch.js'

// Mock logger to avoid noise in tests
vi.mock('@/utils/logger.js', () => ({
	coreLogger: {
		info: vi.fn(),
	},
	apiLogger: {
		info: vi.fn(),
	},
	logError: vi.fn(),
}))

// Test resource type
interface TestUser extends BaseResource {
	id: string
	name: string
	email: string
	age?: number
	createdAt: string
	updatedAt: string
}

describe('CrudOperations', () => {
	let mockHttpClient: HttpClient
	let crudOps: CrudOperations<TestUser>
	let config: ResourceConfig

	beforeEach(() => {
		// Mock HttpClient methods
		mockHttpClient = {
			get: vi.fn(),
			post: vi.fn(),
			put: vi.fn(),
			patch: vi.fn(),
			delete: vi.fn(),
			request: vi.fn(),
		} as unknown as HttpClient

		config = {
			endpoint: '/users',
			idField: 'id',
			defaultLimit: 20,
			maxLimit: 100,
		}

		crudOps = new CrudOperations(mockHttpClient, config)
	})

	afterEach(() => {
		vi.clearAllMocks()
	})

	describe('create', () => {
		it('should create a new resource', async () => {
			const newUser = { name: 'John Doe', email: 'john@example.com' }
			const createdUser: TestUser = {
				id: '1',
				name: 'John Doe',
				email: 'john@example.com',
				createdAt: '2024-01-01T00:00:00Z',
				updatedAt: '2024-01-01T00:00:00Z',
			}
			const mockResponse: HttpResponse<TestUser> = {
				data: createdUser,
				status: 201,
				statusText: 'Created',
				headers: {},
				ok: true,
				raw: {} as Response,
			}

			vi.mocked(mockHttpClient.post).mockResolvedValue([
				null,
				mockResponse,
			])

			const [error, result] = await crudOps.create(newUser)

			expect(error).toBeNull()
			expect(result).toEqual(createdUser)
			expect(mockHttpClient.post).toHaveBeenCalledWith(
				'/users',
				newUser,
				{
					headers: undefined,
				},
			)
		})

		it('should handle validation errors', async () => {
			const newUser = { name: '', email: 'invalid-email' }
			const validationError = createValidationError('Validation failed', {
				name: ['Name is required'],
				email: ['Email is invalid'],
			})

			const options: CrudOptions = {
				validate: vi.fn().mockReturnValue(validationError),
			}

			const [error, result] = await crudOps.create(newUser, options)

			expect(result).toBeNull()
			expect(error).toEqual(validationError)
			expect(options.validate).toHaveBeenCalledWith(newUser)
			expect(mockHttpClient.post).not.toHaveBeenCalled()
		})

		it('should transform data before sending', async () => {
			const newUser = { name: 'john doe', email: 'JOHN@EXAMPLE.COM' }
			const transformedUser = {
				name: 'John Doe',
				email: 'john@example.com',
			}
			const createdUser: TestUser = {
				id: '1',
				...transformedUser,
				createdAt: '2024-01-01T00:00:00Z',
				updatedAt: '2024-01-01T00:00:00Z',
			}
			const mockResponse: HttpResponse<TestUser> = {
				data: createdUser,
				status: 201,
				statusText: 'Created',
				headers: {},
				ok: true,
				raw: {} as Response,
			}

			const options: CrudOptions = {
				transform: (data: unknown) => {
					const user = data as typeof newUser
					return {
						name: user.name
							.split(' ')
							.map(n => n.charAt(0).toUpperCase() + n.slice(1))
							.join(' '),
						email: user.email.toLowerCase(),
					}
				},
			}

			vi.mocked(mockHttpClient.post).mockResolvedValue([
				null,
				mockResponse,
			])

			const [error, result] = await crudOps.create(newUser, options)

			expect(error).toBeNull()
			expect(result).toEqual(createdUser)
			expect(mockHttpClient.post).toHaveBeenCalledWith(
				'/users',
				transformedUser,
				{
					headers: undefined,
				},
			)
		})
	})

	describe('read', () => {
		it('should read a resource by ID', async () => {
			const user: TestUser = {
				id: '1',
				name: 'John Doe',
				email: 'john@example.com',
				createdAt: '2024-01-01T00:00:00Z',
				updatedAt: '2024-01-01T00:00:00Z',
			}
			const mockResponse: HttpResponse<TestUser> = {
				data: user,
				status: 200,
				statusText: 'OK',
				headers: {},
				ok: true,
				raw: {} as Response,
			}

			vi.mocked(mockHttpClient.get).mockResolvedValue([
				null,
				mockResponse,
			])

			const [error, result] = await crudOps.read('1')

			expect(error).toBeNull()
			expect(result).toEqual(user)
			expect(mockHttpClient.get).toHaveBeenCalledWith('/users/1', {
				headers: undefined,
			})
		})

		it('should handle HTTP errors', async () => {
			const httpError = createHttpError(
				404,
				'Not Found',
				'/users/999',
				'GET',
			)
			vi.mocked(mockHttpClient.get).mockResolvedValue([httpError, null])

			const [error, result] = await crudOps.read('999')

			expect(result).toBeNull()
			expect(error).toEqual(httpError)
		})

		it('should use cache when available', async () => {
			const user: TestUser = {
				id: '1',
				name: 'John Doe',
				email: 'john@example.com',
				createdAt: '2024-01-01T00:00:00Z',
				updatedAt: '2024-01-01T00:00:00Z',
			}
			const mockResponse: HttpResponse<TestUser> = {
				data: user,
				status: 200,
				statusText: 'OK',
				headers: {},
				ok: true,
				raw: {} as Response,
			}

			vi.mocked(mockHttpClient.get).mockResolvedValue([
				null,
				mockResponse,
			])

			// First call - should hit API and cache
			const [error1, result1] = await crudOps.read('1')
			expect(error1).toBeNull()
			expect(result1).toEqual(user)
			expect(mockHttpClient.get).toHaveBeenCalledTimes(1)

			// Second call - should use cache
			const [error2, result2] = await crudOps.read('1')
			expect(error2).toBeNull()
			expect(result2).toEqual(user)
			expect(mockHttpClient.get).toHaveBeenCalledTimes(1) // Still only once
		})

		it('should skip cache when requested', async () => {
			const user: TestUser = {
				id: '1',
				name: 'John Doe',
				email: 'john@example.com',
				createdAt: '2024-01-01T00:00:00Z',
				updatedAt: '2024-01-01T00:00:00Z',
			}
			const mockResponse: HttpResponse<TestUser> = {
				data: user,
				status: 200,
				statusText: 'OK',
				headers: {},
				ok: true,
				raw: {} as Response,
			}

			vi.mocked(mockHttpClient.get).mockResolvedValue([
				null,
				mockResponse,
			])

			// Call with skipCache option
			const [error, result] = await crudOps.read('1', { skipCache: true })

			expect(error).toBeNull()
			expect(result).toEqual(user)

			// Call again - should hit API because cache was skipped
			await crudOps.read('1', { skipCache: true })
			expect(mockHttpClient.get).toHaveBeenCalledTimes(2)
		})
	})

	describe('list', () => {
		it('should list resources with pagination', async () => {
			const users: TestUser[] = [
				{
					id: '1',
					name: 'John Doe',
					email: 'john@example.com',
					createdAt: '2024-01-01T00:00:00Z',
					updatedAt: '2024-01-01T00:00:00Z',
				},
				{
					id: '2',
					name: 'Jane Smith',
					email: 'jane@example.com',
					createdAt: '2024-01-02T00:00:00Z',
					updatedAt: '2024-01-02T00:00:00Z',
				},
			]
			const paginatedResponse = {
				data: users,
				pagination: {
					page: 1,
					limit: 20,
					total: 2,
					totalPages: 1,
					hasNext: false,
					hasPrev: false,
				},
			}
			const mockResponse: HttpResponse<typeof paginatedResponse> = {
				data: paginatedResponse,
				status: 200,
				statusText: 'OK',
				headers: {},
				ok: true,
				raw: {} as Response,
			}

			vi.mocked(mockHttpClient.get).mockResolvedValue([
				null,
				mockResponse,
			])

			const [error, result] = await crudOps.list()

			expect(error).toBeNull()
			expect(result).toEqual(paginatedResponse)
			expect(mockHttpClient.get).toHaveBeenCalledWith(
				'/users?page=1&limit=20',
				{
					headers: undefined,
				},
			)
		})

		it('should handle custom pagination and filters', async () => {
			const mockResponse: HttpResponse<{
				data: TestUser[]
				pagination: unknown
			}> = {
				data: { data: [], pagination: {} },
				status: 200,
				statusText: 'OK',
				headers: {},
				ok: true,
				raw: {} as Response,
			}

			vi.mocked(mockHttpClient.get).mockResolvedValue([
				null,
				mockResponse,
			])

			await crudOps.list({
				page: 2,
				limit: 10,
				name: 'John',
				age: 25,
			})

			expect(mockHttpClient.get).toHaveBeenCalledWith(
				'/users?page=2&limit=10&name=John&age=25',
				{
					headers: undefined,
				},
			)
		})

		it('should validate pagination parameters', async () => {
			const [error, result] = await crudOps.list({ page: 0, limit: -1 })

			expect(result).toBeNull()
			expect(error).toBeDefined()
			expect(error!.code).toBe('VALIDATION_ERROR')
		})

		it('should reject limit exceeding maximum', async () => {
			const [error, result] = await crudOps.list({ limit: 200 })

			expect(result).toBeNull()
			expect(error).toBeDefined()
			expect(error!.code).toBe('VALIDATION_ERROR')
		})
	})

	describe('update', () => {
		it('should update a resource', async () => {
			const updatedUser: TestUser = {
				id: '1',
				name: 'John Updated',
				email: 'john.updated@example.com',
				createdAt: '2024-01-01T00:00:00Z',
				updatedAt: '2024-01-01T01:00:00Z',
			}
			const mockResponse: HttpResponse<TestUser> = {
				data: updatedUser,
				status: 200,
				statusText: 'OK',
				headers: {},
				ok: true,
				raw: {} as Response,
			}

			vi.mocked(mockHttpClient.put).mockResolvedValue([
				null,
				mockResponse,
			])

			const updateData = {
				name: 'John Updated',
				email: 'john.updated@example.com',
			}
			const [error, result] = await crudOps.update('1', updateData)

			expect(error).toBeNull()
			expect(result).toEqual(updatedUser)
			expect(mockHttpClient.put).toHaveBeenCalledWith(
				'/users/1',
				updateData,
				{
					headers: undefined,
				},
			)
		})
	})

	describe('patch', () => {
		it('should partially update a resource', async () => {
			const patchedUser: TestUser = {
				id: '1',
				name: 'John Patched',
				email: 'john@example.com',
				createdAt: '2024-01-01T00:00:00Z',
				updatedAt: '2024-01-01T01:00:00Z',
			}
			const mockResponse: HttpResponse<TestUser> = {
				data: patchedUser,
				status: 200,
				statusText: 'OK',
				headers: {},
				ok: true,
				raw: {} as Response,
			}

			vi.mocked(mockHttpClient.patch).mockResolvedValue([
				null,
				mockResponse,
			])

			const patchData = { name: 'John Patched' }
			const [error, result] = await crudOps.patch('1', patchData)

			expect(error).toBeNull()
			expect(result).toEqual(patchedUser)
			expect(mockHttpClient.patch).toHaveBeenCalledWith(
				'/users/1',
				patchData,
				{
					headers: undefined,
				},
			)
		})
	})

	describe('delete', () => {
		it('should delete a resource', async () => {
			const mockResponse: HttpResponse<void> = {
				data: undefined,
				status: 204,
				statusText: 'No Content',
				headers: {},
				ok: true,
				raw: {} as Response,
			}

			vi.mocked(mockHttpClient.delete).mockResolvedValue([
				null,
				mockResponse,
			])

			const [error, result] = await crudOps.delete('1')

			expect(error).toBeNull()
			expect(result).toBeUndefined()
			expect(mockHttpClient.delete).toHaveBeenCalledWith('/users/1', {
				headers: undefined,
			})
		})
	})

	describe('bulk operations', () => {
		describe('bulkCreate', () => {
			it('should create multiple resources', async () => {
				const newUsers = [
					{ name: 'John Doe', email: 'john@example.com' },
					{ name: 'Jane Smith', email: 'jane@example.com' },
				]
				const createdUsers: TestUser[] = [
					{
						id: '1',
						name: 'John Doe',
						email: 'john@example.com',
						createdAt: '2024-01-01T00:00:00Z',
						updatedAt: '2024-01-01T00:00:00Z',
					},
					{
						id: '2',
						name: 'Jane Smith',
						email: 'jane@example.com',
						createdAt: '2024-01-01T00:00:00Z',
						updatedAt: '2024-01-01T00:00:00Z',
					},
				]
				const mockResponse: HttpResponse<TestUser[]> = {
					data: createdUsers,
					status: 201,
					statusText: 'Created',
					headers: {},
					ok: true,
					raw: {} as Response,
				}

				vi.mocked(mockHttpClient.post).mockResolvedValue([
					null,
					mockResponse,
				])

				const [error, result] = await crudOps.bulkCreate(newUsers)

				expect(error).toBeNull()
				expect(result).toEqual(createdUsers)
				expect(mockHttpClient.post).toHaveBeenCalledWith(
					'/users/bulk',
					newUsers,
					{
						headers: undefined,
					},
				)
			})
		})

		describe('bulkUpdate', () => {
			it('should update multiple resources', async () => {
				const updates = [
					{ id: '1', data: { name: 'John Updated' } },
					{ id: '2', data: { name: 'Jane Updated' } },
				]
				const updatedUsers: TestUser[] = [
					{
						id: '1',
						name: 'John Updated',
						email: 'john@example.com',
						createdAt: '2024-01-01T00:00:00Z',
						updatedAt: '2024-01-01T01:00:00Z',
					},
					{
						id: '2',
						name: 'Jane Updated',
						email: 'jane@example.com',
						createdAt: '2024-01-01T00:00:00Z',
						updatedAt: '2024-01-01T01:00:00Z',
					},
				]
				const mockResponse: HttpResponse<TestUser[]> = {
					data: updatedUsers,
					status: 200,
					statusText: 'OK',
					headers: {},
					ok: true,
					raw: {} as Response,
				}

				vi.mocked(mockHttpClient.put).mockResolvedValue([
					null,
					mockResponse,
				])

				const [error, result] = await crudOps.bulkUpdate(updates)

				expect(error).toBeNull()
				expect(result).toEqual(updatedUsers)
				expect(mockHttpClient.put).toHaveBeenCalledWith(
					'/users/bulk',
					updates,
					{
						headers: undefined,
					},
				)
			})
		})

		describe('bulkDelete', () => {
			it('should delete multiple resources', async () => {
				const ids = ['1', '2', '3']
				const mockResponse: HttpResponse<void> = {
					data: undefined,
					status: 204,
					statusText: 'No Content',
					headers: {},
					ok: true,
					raw: {} as Response,
				}

				vi.mocked(mockHttpClient.request).mockResolvedValue([
					null,
					mockResponse,
				])

				const [error, result] = await crudOps.bulkDelete(ids)

				expect(error).toBeNull()
				expect(result).toBeUndefined()
				expect(mockHttpClient.request).toHaveBeenCalledWith(
					'/users/bulk',
					{
						method: 'DELETE',
						body: { ids },
					},
				)
			})
		})
	})

	describe('cache management', () => {
		it('should provide cache statistics', () => {
			const stats = crudOps.getCacheStats()
			expect(stats).toHaveProperty('size')
			expect(stats).toHaveProperty('keys')
			expect(stats.size).toBe(0)
			expect(Array.isArray(stats.keys)).toBe(true)
		})

		it('should clear cache', () => {
			// This would need a more complex setup to properly test caching
			// For now, we just test that the method doesn't throw
			expect(() => crudOps.clearCache()).not.toThrow()
			expect(() => crudOps.clearCache('specific-key')).not.toThrow()
		})
	})

	describe('factory function', () => {
		it('should create CRUD operations instance', () => {
			const crud = createCrudOperations<TestUser>(mockHttpClient, config)
			expect(crud).toBeInstanceOf(CrudOperations)
		})
	})
})
