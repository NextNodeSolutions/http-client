import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

export default defineConfig({
	resolve: {
		alias: {
			'@': resolve(__dirname, './src'),
		},
	},
	test: {
		globals: true,
		environment: 'node',
		include: ['src/**/*.{test,spec}.ts'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html'],
			exclude: [
				'node_modules/**',
				'dist/**',
				'**/*.d.ts',
				'**/*.test.ts',
				'**/*.config.ts',
				'**/types.ts',
			],
		},
	},
})
