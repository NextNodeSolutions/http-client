/**
 * Test setup file for global mocks and configuration
 */

import { vi } from 'vitest'

// Mock @nextnode/logger globally
vi.mock('@nextnode/logger', () => ({
	createLogger: vi.fn(
		(): { info: () => void; warn: () => void; error: () => void } => ({
			info: vi.fn(),
			warn: vi.fn(),
			error: vi.fn(),
		}),
	),
}))
