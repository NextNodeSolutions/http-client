# @nextnode/http-client

A TypeScript HTTP client library with normalized fetch operations, automatic retry logic, intelligent caching, CRUD operations, and comprehensive error handling for NextNode projects.

## Features

- **🔄 Result Pattern**: All operations return `[error, data]` tuples instead of throwing exceptions
- **🚀 Retry Logic**: Intelligent retry with exponential backoff and jitter
- **📦 CRUD Operations**: Generic CRUD operations with type safety and caching
- **🔍 Query Builder**: Fluent API for building complex queries with filtering and pagination
- **🛡️ Circuit Breaker**: Prevents cascading failures with intelligent state management
- **⚡ Caching**: Intelligent caching with TTL and automatic invalidation
- **🔌 Interceptors**: Request/response/error interceptors for extensibility
- **📊 Type Safety**: Full TypeScript support with strict typing
- **🧪 Comprehensive Testing**: 120+ tests with >95% coverage

## Installation

```bash
pnpm add @nextnode/http-client
```

Or with npm:

```bash
npm install @nextnode/http-client
```

## Quick Start

### Basic HTTP Client

```typescript
import { HttpClient } from '@nextnode/http-client'

// Create client with configuration
const client = new HttpClient({
  baseUrl: 'https://api.example.com',
  timeout: 30000,
  retries: 3,
  defaultHeaders: {
    'Authorization': 'Bearer your-token'
  }
})

// Make requests using Result pattern
const [error, response] = await client.get('/users')
if (error) {
  console.error('Request failed:', error.message)
  return
}

console.log('Users:', response.data)
```

### CRUD Operations

```typescript
import { HttpClient, CrudOperations } from '@nextnode/http-client'

interface User {
  id: number
  name: string
  email: string
  createdAt: string
  updatedAt: string
}

const client = new HttpClient({ baseUrl: 'https://api.example.com' })
const usersCrud = new CrudOperations<User>(client, {
  endpoint: '/users',
  defaultLimit: 20,
  maxLimit: 100
})

// Create a new user
const [createError, newUser] = await usersCrud.create({
  name: 'John Doe',
  email: 'john@example.com'
})

// List users with pagination
const [listError, users] = await usersCrud.list({ 
  page: 1, 
  limit: 10 
})

// Update a user
const [updateError, updatedUser] = await usersCrud.update(1, {
  name: 'John Smith'
})

// Delete a user
const [deleteError] = await usersCrud.delete(1)
```

### Advanced Query Builder

```typescript
import { QueryBuilder, createQueryBuilder } from '@nextnode/http-client'

// Build complex queries with fluent API
const query = createQueryBuilder()
  .whereEquals('status', 'active')
  .whereGreaterThan('age', 18)
  .whereLike('name', 'John%')
  .orWhere(sub => 
    sub.whereEquals('role', 'admin')
       .whereGreaterThan('score', 90)
  )
  .orderByDesc('createdAt')
  .paginate(1, 20)

// Use with CRUD operations
const [error, results] = await usersCrud.list(query.build())

// Or convert to URL parameters
const urlParams = query.buildUrlParams()
console.log(urlParams.toString()) // page=1&limit=20&status=active&...
```

### Query Presets

```typescript
import { queryPresets } from '@nextnode/http-client'

// Get recent active users
const recentUsers = queryPresets
  .recent(7) // last 7 days
  .whereEquals('status', 'active')
  .paginate(1, 10)

// Search across multiple fields
const searchQuery = queryPresets
  .textSearch('john', ['name', 'email', 'description'])
  .orderByDesc('relevance')

// Date range queries
const dateRangeQuery = queryPresets
  .dateRange('createdAt', new Date('2024-01-01'), new Date('2024-12-31'))
```

## Configuration

### HTTP Client Options

```typescript
interface HttpClientConfig {
  baseUrl?: string                    // Base URL for all requests
  defaultHeaders?: Record<string, string>  // Default headers
  timeout?: number                    // Request timeout (default: 30000ms)
  retries?: number                    // Retry attempts (default: 3)
  retryDelay?: number                // Retry delay (default: 1000ms)
  credentials?: RequestCredentials    // Credentials mode (default: 'same-origin')
  enableCache?: boolean              // Enable caching (default: false)
  cacheTtl?: number                  // Cache TTL (default: 300000ms)
}
```

### CRUD Configuration

```typescript
interface ResourceConfig {
  endpoint: string                    // API endpoint (e.g., '/users')
  idField?: string                   // ID field name (default: 'id')
  defaultLimit?: number              // Default pagination limit (default: 20)
  maxLimit?: number                  // Maximum pagination limit (default: 100)
  enableCache?: boolean              // Enable caching (default: true)
  cacheTtl?: number                  // Cache TTL in milliseconds
}
```

## Advanced Features

### Interceptors

```typescript
// Request interceptor
client.addRequestInterceptor((config, url) => {
  config.headers = {
    ...config.headers,
    'X-Request-ID': generateRequestId()
  }
  return config
})

// Response interceptor
client.addResponseInterceptor((response) => {
  console.log(`Response from ${response.raw.url}: ${response.status}`)
  return response
})

// Error interceptor
client.addErrorInterceptor((error, config, url) => {
  console.error(`Request to ${url} failed:`, error.message)
  return error
})
```

### Bulk Operations

```typescript
// Create multiple records
const [error, users] = await usersCrud.bulkCreate([
  { name: 'User 1', email: 'user1@example.com' },
  { name: 'User 2', email: 'user2@example.com' }
])

// Update multiple records
const [updateError, updatedUsers] = await usersCrud.bulkUpdate([
  { id: 1, data: { name: 'Updated User 1' } },
  { id: 2, data: { name: 'Updated User 2' } }
])

// Delete multiple records
const [deleteError] = await usersCrud.bulkDelete([1, 2, 3])
```

### Caching

```typescript
// Manual cache management
const crudWithCache = new CrudOperations(client, {
  endpoint: '/users',
  enableCache: true,
  cacheTtl: 600000 // 10 minutes
})

// Skip cache for specific request
const [error, users] = await crudWithCache.list(
  { page: 1 }, 
  { skipCache: true }
)
```

### Error Handling

The library uses a Result pattern that returns `[error, data]` tuples instead of throwing exceptions:

```typescript
const [error, data] = await client.get('/api/data')

if (error) {
  // Handle specific error types
  switch (error.type) {
    case 'NETWORK_ERROR':
      console.error('Network issue:', error.message)
      break
    case 'TIMEOUT_ERROR':
      console.error('Request timed out')
      break
    case 'HTTP_ERROR':
      console.error('HTTP error:', error.status, error.statusText)
      break
    case 'VALIDATION_ERROR':
      console.error('Validation failed:', error.details)
      break
  }
  return
}

// Use data safely - error is null here
console.log('Success:', data)
```

## API Reference

### Core Classes

- **`HttpClient`**: Main HTTP client with retry logic and caching
- **`CrudOperations<T>`**: Generic CRUD operations with type safety
- **`QueryBuilder`**: Fluent API for building complex queries

### Factory Functions

- **`createHttpClient(config?)`**: Create HTTP client instance
- **`createCrudOperations<T>(client, config)`**: Create CRUD operations instance
- **`createQueryBuilder()`**: Create query builder instance

### Error Types

- **`NetworkError`**: Network connectivity issues
- **`TimeoutError`**: Request timeout
- **`HttpError`**: HTTP status errors (4xx, 5xx)
- **`ParseError`**: Response parsing errors
- **`ValidationError`**: Input validation errors
- **`CancellationError`**: Request cancellation
- **`RetryExhaustionError`**: All retries failed
- **`ConfigError`**: Configuration errors

## Development

### Building

```bash
pnpm build              # Build library
pnpm clean              # Clean build files
pnpm type-check         # TypeScript validation
```

### Testing

```bash
pnpm test               # Run tests
pnpm test:watch         # Watch mode
pnpm test:coverage      # Coverage report
pnpm test:ui            # Vitest UI
```

### Code Quality

```bash
pnpm lint               # ESLint with auto-fix
pnpm format             # Format with Biome
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Run tests (`pnpm test`)
4. Commit your changes (`git commit -m 'Add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

## License

MIT

---

Built with ❤️ by [NextNode](https://nextnode.com)