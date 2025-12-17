import { defineConfig } from 'tsup'

export default defineConfig({
	entry: {
		index: 'src/index.ts',
		validation: 'src/integrations/validation/index.ts',
	},
	format: ['esm'],
	dts: true,
	minify: true,
	treeshake: true,
	clean: true,
	sourcemap: false,
	target: 'es2023',
	splitting: true,
	external: ['@nextnode/logger', '@nextnode/validation'],
	outDir: 'dist',
})
