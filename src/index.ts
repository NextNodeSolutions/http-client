/**
 * @nextnode/http-client
 * TypeScript HTTP client with caching, retry, and validation
 *
 * @example
 * ```typescript
 * import { createHttpClient } from '@nextnode/http-client'
 *
 * const api = createHttpClient({
 *   baseUrl: 'https://api.example.com',
 *   timeout: 30000,
 *   retry: { maxRetries: 3 }
 * })
 *
 * const result = await api.get<User>('/users/123')
 *
 * if (result.success) {
 *   console.log(result.data.name)
 * } else {
 *   console.error(result.error.code)
 * }
 * ```
 */

// Main factory
export { createHttpClient } from './http-client.js'
// Storage adapters
export {
	createLocalStorage,
	createMemoryStorage,
	type LocalStorageConfig,
	type MemoryStorageConfig,
} from './lib/cache/storage/index.js'
// Error utilities
export { HttpErrorCodes } from './lib/errors/index.js'
// Type exports
export type {
	// Interceptor types
	AfterResponseInterceptor,
	BeforeRequestInterceptor,
	// Cache types
	CacheConfig,
	CacheControlDirectives,
	CacheEntry,
	CacheMode,
	CacheStats,
	CacheStorage,
	// Response types
	ErrorContext,
	// Client types
	HttpClient,
	HttpClientConfig,
	// Result types
	HttpError,
	HttpErrorCode,
	// Request types
	HttpMethod,
	HttpResult,
	InterceptorConfig,
	OnErrorInterceptor,
	RequestConfig,
	RequestContext,
	RequestOptions,
	ResponseContext,
	ResponseMeta,
	// Retry types
	RetryConfig,
} from './types/index.js'
// Logger exports (for debugging)
export {
	cacheLogger,
	clientLogger,
	interceptorLogger,
	retryLogger,
} from './utils/logger.js'
