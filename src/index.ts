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

// Type exports
export type {
	// Client types
	HttpClient,
	HttpClientConfig,
	// Request types
	HttpMethod,
	RequestConfig,
	RequestContext,
	RequestOptions,
	// Response types
	ErrorContext,
	ResponseContext,
	ResponseMeta,
	// Result types
	HttpError,
	HttpErrorCode,
	HttpResult,
	// Cache types
	CacheConfig,
	CacheStats,
	// Retry types
	RetryConfig,
	// Interceptor types
	AfterResponseInterceptor,
	BeforeRequestInterceptor,
	InterceptorConfig,
	OnErrorInterceptor,
} from './types/index.js'

// Error utilities
export { HttpErrorCodes } from './lib/errors/index.js'

// Logger exports (for debugging)
export {
	cacheLogger,
	clientLogger,
	interceptorLogger,
	logger,
	retryLogger,
	validationLogger,
} from './utils/logger.js'
