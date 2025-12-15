# @nextnode/http-client

A production-grade TypeScript HTTP client library with native fetch wrapper, intelligent caching strategies, automatic retry logic, interceptors, and comprehensive error handling.

## Features

- **Native Fetch Wrapper** - Zero HTTP dependencies, built on the Fetch API
- **Discriminated Union Error Handling** - Type-safe `{success, data/error}` pattern
- **Multiple Caching Strategies** - LRU cache with TTL, stale-while-revalidate, request deduplication
- **Automatic Retry** - Exponential backoff with jitter, configurable retry conditions
- **Interceptor Chain** - beforeRequest, afterResponse, and onError hooks
- **Validation Integration** - Optional `@nextnode/validation` integration for request/response schemas
- **Fluent API** - Chainable configuration methods for per-request customization
- **TypeScript First** - Full type safety with strict mode support

## Installation

```bash
pnpm add @nextnode/http-client
```

Or with npm:

```bash
npm install @nextnode/http-client
```

### Optional: Validation Support

To use request/response validation:

```bash
pnpm add @nextnode/validation
```

## Quick Start

```typescript
import { createHttpClient } from '@nextnode/http-client'

// Create a configured client
const api = createHttpClient({
  baseUrl: 'https://api.example.com',
  timeout: 30000,
  cache: { maxEntries: 100, ttl: 60000 },
  retry: { maxRetries: 3 }
})

// Make requests
const result = await api.get<User>('/users/123')

if (result.success) {
  console.log(result.data.name)
  console.log(result.response.cached) // true/false
} else {
  console.error(result.error.code) // 'CLIENT_ERROR', 'NETWORK_ERROR', etc.
}
```

## Usage

### Basic HTTP Methods

```typescript
// GET request
const users = await api.get<User[]>('/users')

// POST with body
const newUser = await api.post<User>('/users', { name: 'John', email: 'john@example.com' })

// PUT request
const updated = await api.put<User>('/users/123', { name: 'John Updated' })

// PATCH request
const patched = await api.patch<User>('/users/123', { email: 'newemail@example.com' })

// DELETE request
const deleted = await api.delete('/users/123')

// HEAD request
const head = await api.head('/users/123')
```

### Query Parameters

```typescript
const result = await api.get<User[]>('/users', {
  params: { page: 1, limit: 10, active: true }
})
// Fetches: /users?page=1&limit=10&active=true
```

### Fluent Configuration

Create customized client instances without modifying the original:

```typescript
// Add authentication
const authApi = api.withAuth('my-token')
// Authorization: Bearer my-token

// Basic auth
const basicApi = api.withBasicAuth('username', 'password')

// Custom headers
const customApi = api.withHeaders({ 'X-Custom-Header': 'value' })

// Custom timeout
const slowApi = api.withTimeout(60000)

// Skip cache for fresh data
const freshData = await api.noCache().get('/real-time-stats')

// Skip retry for non-idempotent operations
const result = await api.noRetry().post('/payments', paymentData)
```

### Multiple API Instances

```typescript
// Create separate clients for different services
export const stripeApi = createHttpClient({
  baseUrl: 'https://api.stripe.com/v1',
  headers: { Authorization: 'Bearer sk_live_...' }
})

export const internalApi = createHttpClient({
  baseUrl: 'https://api.myapp.com',
  timeout: 30000,
  cache: { maxEntries: 100, ttl: 60000 },
  retry: { maxRetries: 3 }
})
```

## Caching

### Cache Configuration

```typescript
const api = createHttpClient({
  cache: {
    maxEntries: 100,        // Max cached responses
    ttl: 60000,             // Time-to-live in ms
    staleWhileRevalidate: 30000,  // Serve stale, revalidate in background
    deduplicate: true       // Prevent duplicate in-flight requests
  }
})
```

### Cache Management

```typescript
// Clear all cached data
api.clearCache()

// Get cache statistics
const stats = api.getCacheStats()
console.log(stats)
// { size: 42, maxSize: 100, hits: 150, misses: 50, staleHits: 10, evictions: 5 }
```

### Per-Request Cache Control

```typescript
// Skip cache for this request
const fresh = await api.get('/data', { noCache: true })

// Or use fluent API
const fresh = await api.noCache().get('/data')
```

## Retry Logic

### Retry Configuration

```typescript
const api = createHttpClient({
  retry: {
    maxRetries: 3,          // Max retry attempts
    baseDelay: 1000,        // Initial delay in ms
    maxDelay: 30000,        // Max delay between retries
    jitter: 0.1,            // Random jitter factor (0-1)
    retryOn: [408, 429, 500, 502, 503, 504],  // Status codes to retry
    shouldRetry: (error, attempt) => {
      // Custom retry condition
      return error.code === 'NETWORK_ERROR' && attempt < 3
    }
  }
})
```

### Per-Request Retry Override

```typescript
// Custom retry for this request
const result = await api.get('/flaky-endpoint', {
  retry: { maxRetries: 5, baseDelay: 2000 }
})

// Disable retry for this request
const result = await api.get('/data', { noRetry: true })
```

## Interceptors

```typescript
const api = createHttpClient({
  baseUrl: 'https://api.example.com',
  interceptors: {
    // Modify requests before sending
    beforeRequest: [
      (ctx) => {
        // Add auth from store
        ctx.headers.set('Authorization', `Bearer ${authStore.token}`)
        return ctx
      }
    ],

    // Transform response data
    afterResponse: [
      (ctx) => {
        console.log(`${ctx.request.method} ${ctx.request.url}: ${ctx.response.status}`)
        return ctx.data
      }
    ],

    // Handle errors
    onError: [
      (ctx) => {
        if (ctx.error.status === 401) {
          authStore.logout()
        }
        // Return undefined to let error propagate
        // Or return a result to recover
      }
    ]
  }
})
```

## Error Handling

### Error Types

```typescript
type HttpErrorCode =
  | 'NETWORK_ERROR'     // Network failure
  | 'TIMEOUT_ERROR'     // Request timeout
  | 'ABORT_ERROR'       // Request aborted
  | 'PARSE_ERROR'       // JSON parse failure
  | 'VALIDATION_ERROR'  // Schema validation failed
  | 'CLIENT_ERROR'      // 4xx responses
  | 'SERVER_ERROR'      // 5xx responses
  | 'UNKNOWN_ERROR'
```

### Handling Errors

```typescript
const result = await api.get<User>('/users/123')

if (!result.success) {
  switch (result.error.code) {
    case 'NETWORK_ERROR':
      console.log('Check your connection')
      break
    case 'TIMEOUT_ERROR':
      console.log('Request timed out')
      break
    case 'CLIENT_ERROR':
      if (result.error.status === 404) {
        console.log('User not found')
      }
      break
    case 'SERVER_ERROR':
      console.log('Server error, try again later')
      break
  }
}
```

## Validation Integration

Install `@nextnode/validation` for request/response validation:

```typescript
import { createHttpClient } from '@nextnode/http-client'
import { s } from '@nextnode/validation'

// Define schemas
const userSchema = s.object({
  id: s.number(),
  name: s.string(),
  email: s.email()
})

const createUserSchema = s.object({
  name: s.string().min(1),
  email: s.email()
})

// Use with client
const result = await api.post('/users', userData, {
  bodySchema: createUserSchema,     // Validate request body
  responseSchema: userSchema        // Validate response
})

if (!result.success && result.error.code === 'VALIDATION_ERROR') {
  console.log('Validation failed:', result.error.message)
}
```

## Configuration Reference

### HttpClientConfig

```typescript
interface HttpClientConfig {
  baseUrl?: string              // Base URL for all requests
  timeout?: number              // Default timeout in ms (default: 30000)
  headers?: Record<string, string>  // Default headers
  cache?: CacheConfig | false   // Cache config or false to disable
  retry?: RetryConfig | false   // Retry config or false to disable
  interceptors?: InterceptorConfig
  credentials?: RequestCredentials  // 'omit' | 'same-origin' | 'include'
  debug?: boolean               // Enable debug logging
}
```

### CacheConfig

```typescript
interface CacheConfig {
  maxEntries?: number           // Max cache entries (default: 100)
  ttl?: number                  // TTL in ms (default: 60000)
  staleWhileRevalidate?: number // SWR window in ms
  deduplicate?: boolean         // Dedupe in-flight requests
  keyGenerator?: (config: RequestConfig) => string  // Custom key generator
}
```

### RetryConfig

```typescript
interface RetryConfig {
  maxRetries?: number           // Max retries (default: 3)
  baseDelay?: number            // Base delay in ms (default: 1000)
  maxDelay?: number             // Max delay in ms (default: 30000)
  jitter?: number               // Jitter factor 0-1 (default: 0.1)
  retryOn?: number[]            // Status codes to retry
  shouldRetry?: (error: HttpError, attempt: number) => boolean
}
```

## Development

```bash
# Install dependencies
pnpm install

# Build
pnpm build

# Run tests
pnpm test

# Type check
pnpm type-check

# Lint
pnpm lint
```

## License

MIT
