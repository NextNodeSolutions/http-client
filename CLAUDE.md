# CLAUDE.md - HTTP Client Library

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is **@nextnode/http-client**, a comprehensive TypeScript HTTP client library designed for NextNode projects. It provides normalized fetch operations, automatic retry logic, CRUD operations, and intelligent query building with comprehensive error handling.

**Key Features:**
- **Result Pattern**: All operations return `[error, data]` tuples instead of throwing exceptions
- **TypeScript strict mode** with maximum type safety and generic type support
- **CRUD Operations** with intelligent caching and bulk operations
- **Query Builder** with fluent API for complex filtering and pagination
- **Retry Logic** with exponential backoff and circuit breaker pattern
- **Comprehensive testing** with 120+ tests following NextNode patterns
- **Modern CI/CD** with automated version management and publishing

## Architecture Overview

### Phase-Based Implementation (Completed)

**✅ Phase 1: Foundation Types & Error Handling**
- Result pattern with `success()` and `failure()` helpers
- Comprehensive error hierarchy with specific error types
- Type definitions for HTTP operations and configurations

**✅ Phase 2: Base HTTP Client with Retry Logic**
- Core `HttpClient` class with configuration management
- Exponential backoff retry logic with jitter
- Interceptor system for requests, responses, and errors
- Circuit breaker pattern for failure prevention

**✅ Phase 3: CRUD Operations with Pagination & Query Builder**
- Generic `CrudOperations<T>` class with type safety
- Advanced `QueryBuilder` with fluent API
- Intelligent caching with TTL and invalidation
- Bulk operations and comprehensive filtering

**🚧 Phase 4: Supabase Integration Base (Planned)**
- Supabase client integration with auth handling
- Real-time subscriptions with auto-reconnect
- Row-level security (RLS) support

**🚧 Phase 5: Advanced Supabase Features (Planned)**
- Advanced query optimization
- Batch operations for Supabase
- Type-safe database schema integration

**🚧 Phase 6: Export and Finalization (Planned)**
- Final API cleanup and optimization
- Documentation completion
- Performance benchmarking

## Project Structure

```
src/
├── lib/                    # Core library modules
│   ├── core.ts            # Main exports and factory functions
│   ├── errors.ts          # Error classes and factories
│   ├── fetch/             # HTTP client implementation
│   │   ├── client.ts      # Main HttpClient class
│   │   ├── retry.ts       # Retry logic with backoff
│   │   └── interceptors.ts # Interceptor system
│   └── crud/              # CRUD operations
│       ├── operations.ts  # CrudOperations class
│       └── query-builder.ts # QueryBuilder with fluent API
├── types/                 # Type definitions
│   ├── index.ts          # Main type exports
│   ├── result.ts         # Result pattern types
│   ├── fetch.ts          # HTTP-related types
│   └── errors.ts         # Error type definitions
├── utils/                # Utility functions
│   ├── index.ts         # Utility exports
│   └── logger.ts        # Logging system
├── __tests__/           # Comprehensive test suite
│   ├── core.spec.ts     # Core exports tests
│   ├── fetch-client.spec.ts # HTTP client tests
│   ├── retry.spec.ts    # Retry logic tests
│   ├── crud-operations.spec.ts # CRUD tests
│   ├── query-builder.spec.ts # Query builder tests
│   ├── logger.spec.ts   # Logger tests
│   └── utils.spec.ts    # Utility tests
└── index.ts             # Main library export
```

## Development Commands

### Build & Development
```bash
pnpm build              # Build library (clean + tsc + tsc-alias)
pnpm clean              # Remove dist directory
pnpm type-check         # TypeScript validation
```

### Testing
```bash
pnpm test               # Run all tests (120+ tests)
pnpm test:watch         # Watch mode for tests
pnpm test:coverage      # Generate coverage report
pnpm test:ui            # Open Vitest UI
```

### Code Quality
```bash
pnpm lint               # ESLint with @nextnode/eslint-plugin (auto-fix)
pnpm format             # Format with Biome
```

### Version Management & Publishing
```bash
pnpm changeset          # Create changeset for version bump
pnpm changeset:version  # Update versions from changesets
pnpm changeset:publish  # Publish to NPM registry
```

## Core Design Patterns

### Result Pattern Implementation

The library uses a Result pattern instead of throwing exceptions:

```typescript
// All operations return [error, data] tuples
const [error, response] = await client.get('/api/users')
if (error) {
  // Handle error safely without try/catch
  console.error('Request failed:', error.message)
  return
}

// Data is guaranteed to be available when error is null
console.log('Success:', response.data)
```

### Generic Type Safety

Heavy use of TypeScript generics for type safety:

```typescript
// CRUD operations with strict typing
interface User extends BaseResource {
  id: number
  name: string
  email: string
  createdAt: string
  updatedAt: string
}

const usersCrud = new CrudOperations<User>(client, {
  endpoint: '/users'
})

// TypeScript ensures correct types
const [error, user] = await usersCrud.create({
  name: 'John',     // ✅ Required field
  email: 'john@...' // ✅ Required field
  // id is omitted automatically ✅
})
```

### Fluent Query Builder

Builder pattern with method chaining:

```typescript
const query = createQueryBuilder()
  .whereEquals('status', 'active')
  .whereGreaterThan('age', 18)
  .orWhere(sub => 
    sub.whereEquals('role', 'admin')
       .whereNotNull('permissions')
  )
  .orderByDesc('createdAt')
  .paginate(1, 20)
  .build() // Returns typed parameters object
```

## Testing Strategy

### Test Organization
- **120+ total tests** across 7 test files
- Each major component has comprehensive test coverage
- Tests follow existing NextNode patterns from `@nextnode/logger` and `@nextnode/config-manager`

### Test Quality Standards
```typescript
// Proper mock cleanup in every test file
afterEach(() => {
  vi.clearAllMocks()
  vi.restoreAllMocks()
})

// Comprehensive error testing
it('should handle network errors gracefully', async () => {
  mockFetch.mockRejectedValue(new Error('Network error'))
  
  const [error, response] = await client.get('/test')
  
  expect(error).toBeInstanceOf(NetworkError)
  expect(error.message).toBe('Network error')
  expect(response).toBeNull()
})
```

### Mock Strategy
- **Clean mocks**: Proper cleanup between tests to avoid interference
- **Real timers**: Avoided fake timers to prevent timing issues
- **Consistent patterns**: All tests follow same mocking conventions

## Type System Architecture

### Hierarchical Error Types
```typescript
// Base error type
abstract class HttpClientError extends Error {
  abstract readonly type: string
  abstract readonly code: string
}

// Specific error implementations
class NetworkError extends HttpClientError {
  readonly type = 'NETWORK_ERROR'
  readonly code = 'ERR_NETWORK'
}

class TimeoutError extends HttpClientError {
  readonly type = 'TIMEOUT_ERROR' 
  readonly code = 'ERR_TIMEOUT'
}
```

### Generic Interfaces
```typescript
// Base resource pattern for CRUD operations
interface BaseResource {
  id: string | number
  createdAt?: string
  updatedAt?: string
}

// Generic CRUD operations
class CrudOperations<T extends BaseResource> {
  async create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<Result<T, HttpClientError>>
  async list(params: PaginationParams): Promise<Result<PaginatedResponse<T>, HttpClientError>>
  // ... other methods with strict typing
}
```

## Logging System

Uses `@nextnode/logger` for consistent logging across the library:

```typescript
import { coreLogger, apiLogger, logError } from '@/utils/logger.js'

// Core functionality logging
coreLogger.info('Creating HTTP client', { 
  baseUrl: config.baseUrl,
  hasAuth: Boolean(config.defaultHeaders?.Authorization)
})

// API operation logging  
apiLogger.info('Making HTTP request', {
  method: 'GET',
  url: '/api/users',
  hasRetry: config.retries > 0
})

// Error logging with context
logError(error, {
  operation: 'http-request',
  url: request.url,
  method: request.method,
  retryCount: attempt
})
```

## Configuration Management

### HTTP Client Configuration
```typescript
interface HttpClientConfig {
  baseUrl?: string                    // API base URL
  defaultHeaders?: Record<string, string> // Default headers
  timeout?: number                    // Request timeout (30s default)
  retries?: number                    // Retry attempts (3 default)
  retryDelay?: number                // Base retry delay (1s default)
  credentials?: RequestCredentials    // Credentials mode
  enableCache?: boolean              // Enable caching (false default)
  cacheTtl?: number                  // Cache TTL (5min default)
}
```

### CRUD Configuration
```typescript
interface ResourceConfig {
  endpoint: string                    // API endpoint (required)
  idField?: string                   // ID field name ('id' default)
  defaultLimit?: number              // Pagination limit (20 default)
  maxLimit?: number                  // Max pagination limit (100 default)
  enableCache?: boolean              // Enable caching (true default)
  cacheTtl?: number                  // Cache TTL (5min default)
}
```

## Performance Considerations

### Caching Strategy
- **TTL-based caching** with configurable expiration
- **Cache invalidation** on mutations (create, update, delete)
- **Pattern-based cache clearing** for related resources
- **Memory-efficient** cache with automatic cleanup

### Retry Logic
- **Exponential backoff** with jitter to prevent thundering herd
- **Configurable retry conditions** based on error type and status
- **Circuit breaker pattern** to prevent cascading failures
- **Request deduplication** to avoid duplicate requests

## Best Practices for Contributors

### Code Organization
- **Feature-based structure**: Group related functionality together
- **Type-first approach**: Define interfaces before implementations
- **Result pattern**: Never throw exceptions, always return Results
- **Generic types**: Use generics for reusable, type-safe code

### Error Handling
- **Specific error types**: Create specific error classes for different failure modes
- **Rich error context**: Include relevant context in error objects
- **Graceful degradation**: Handle errors without breaking the application
- **Logging**: Always log errors with appropriate context

### Testing Requirements
- **100% Result pattern coverage**: Test both success and error cases
- **Mock cleanup**: Always clean up mocks between tests
- **Real-world scenarios**: Test with realistic data and error conditions
- **Performance tests**: Include tests for retry logic and caching

### Documentation Standards
- **TSDoc comments** for all public APIs
- **Usage examples** in README for complex features
- **Type documentation** with clear parameter descriptions
- **Migration guides** for breaking changes

## Migration from Template

This library started from the NextNode library template but has been significantly customized:

### Key Changes from Template
- **Result pattern implementation** replacing standard Promise/Error pattern
- **CRUD operations layer** with intelligent caching and query building
- **Advanced retry logic** with circuit breaker pattern
- **Comprehensive error hierarchy** for HTTP client operations
- **120+ tests** following NextNode testing standards

### Maintained Template Features
- **Modern CI/CD** with automated version management
- **TypeScript strict mode** with path mapping (`@/` aliases)
- **ESLint + Biome** tooling configuration
- **Changesets** for version management
- **Husky + lint-staged** for git hooks

## Next Development Steps

### Phase 4: Supabase Integration Base
- Supabase client wrapper with authentication handling
- Real-time subscriptions with automatic reconnection
- Row-level security (RLS) integration
- Type-safe database operations

### Phase 5: Advanced Supabase Features  
- Database schema integration with TypeScript types
- Optimized query batching for Supabase
- Advanced real-time features (presence, broadcast)
- Performance monitoring and optimization

### Phase 6: Finalization
- API stability review and optimization
- Performance benchmarking against alternatives
- Documentation completion with advanced examples
- Migration guides for common use cases

The library is designed to provide real value-add over raw fetch or basic HTTP clients through intelligent retry logic, comprehensive error handling, and type-safe CRUD operations with advanced querying capabilities.