/**
 * Type Definitions - Barrel Export
 * @module types
 */

// Result types
export type {
	HttpError,
	HttpErrorCode,
	HttpResult,
	ResponseMeta,
} from './result.js'

// Request types
export type {
	HttpMethod,
	RequestConfig,
	RequestContext,
	RequestOptions,
} from './request.js'

// Response types
export type { ErrorContext, ResponseContext } from './response.js'

// Cache types
export type { CacheConfig, CacheEntry, CacheStats } from './cache.js'

// Retry types
export type { RetryConfig, RetryState } from './retry.js'

// Interceptor types
export type {
	AfterResponseInterceptor,
	BeforeRequestInterceptor,
	InterceptorConfig,
	OnErrorInterceptor,
} from './interceptor.js'

// Client types
export type {
	HttpClient,
	HttpClientConfig,
	ResolvedHttpClientConfig,
} from './client.js'
