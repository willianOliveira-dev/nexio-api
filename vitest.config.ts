import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		globals: true,
		environment: 'node',
		include: ['tests/**/*.test.ts'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'lcov', 'json-summary'],
			include: ['src/**/*.ts'],
			exclude: [
				'node_modules',
				'dist',
				'**/*.d.ts',
				'**/*.config.ts',
				'src/lib/db/schemas/**/*.ts',
				'src/shared/schemas/**/*.ts',
				'src/shared/types/**/*.ts',
				'src/routes/**/*.ts',
				'src/server.ts',
				'src/app.ts',
			],
			thresholds: {
				lines: 70,
				functions: 70,
				branches: 60,
				statements: 70,
			},
		},
	},
	resolve: {
		alias: { '@': '/src' },
	},
});
