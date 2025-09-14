/**
 * Core library functionality tests - HTTP Client exports
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

import {
	HttpClient,
	createHttpClient,
	createCrudOperations,
} from '../lib/core.js'

// Mock the logger
vi.mock('../utils/logger.js', () => ({
	coreLogger: {
		info: vi.fn(),
	},
	apiLogger: {
		info: vi.fn(),
	},
	logError: vi.fn(),
}))

describe('Core Library Exports', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe('HttpClient', () => {
		it('should export HttpClient class', () => {
			expect(HttpClient).toBeDefined()
			expect(typeof HttpClient).toBe('function')
		})

		it('should create HttpClient instance', () => {
			const client = new HttpClient()
			expect(client).toBeInstanceOf(HttpClient)
		})

		it('should create HttpClient with configuration', () => {
			const client = new HttpClient({
				baseUrl: 'https://api.example.com',
				timeout: 10000,
			})

			const config = client.getConfig()
			expect(config.baseUrl).toBe('https://api.example.com')
			expect(config.timeout).toBe(10000)
		})
	})

	describe('createHttpClient factory', () => {
		it('should export createHttpClient function', () => {
			expect(createHttpClient).toBeDefined()
			expect(typeof createHttpClient).toBe('function')
		})

		it('should create HttpClient instance', () => {
			const client = createHttpClient()
			expect(client).toBeInstanceOf(HttpClient)
		})

		it('should create client with provided options', () => {
			const client = createHttpClient({
				baseUrl: 'https://api.example.com',
				timeout: 5000,
				defaultHeaders: { 'X-API-Key': 'test' },
			})

			const config = client.getConfig()
			expect(config.baseUrl).toBe('https://api.example.com')
			expect(config.timeout).toBe(5000)
			expect(config.defaultHeaders).toHaveProperty('X-API-Key', 'test')
		})
	})

	describe('createCrudOperations factory', () => {
		it('should export createCrudOperations function', () => {
			expect(createCrudOperations).toBeDefined()
			expect(typeof createCrudOperations).toBe('function')
		})

		it('should create CRUD operations instance', () => {
			const mockClient = new HttpClient()
			const crud = createCrudOperations(mockClient, {
				endpoint: '/users',
			})

			expect(crud).toBeDefined()
		})
	})
})
