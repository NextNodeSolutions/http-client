/**
 * Cache Storage Adapters
 * @module lib/cache/storage
 */

export { createLocalStorage, type LocalStorageConfig } from './local-storage.js'
export {
	createMemoryStorage,
	type MemoryStorageConfig,
} from './memory-storage.js'
