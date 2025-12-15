/**
 * Type Definitions - Barrel Export
 * @module types
 */

// Cache types
export type { CacheConfig, CacheEntry, CacheStats } from './cache.js'
// Client types
export type { HttpClient, HttpClientConfig } from './client.js'
// Interceptor types
export type {
	AfterResponseInterceptor,
	BeforeRequestInterceptor,
	InterceptorConfig,
	OnErrorInterceptor,
} from './interceptor.js'
// Request types
export type {
	HttpMethod,
	RequestConfig,
	RequestContext,
	RequestOptions,
} from './request.js'
// Response types
export type { ErrorContext, ResponseContext } from './response.js'
// Result types
export type {
	HttpError,
	HttpErrorCode,
	HttpResult,
	ResponseMeta,
} from './result.js'
// Retry types
export type { RetryConfig } from './retry.js'
