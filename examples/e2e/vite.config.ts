import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}']
	},
	server: {
		// add ws proxy to from vite to bun
		proxy: {
			'/ws': {
				target: 'http://localhost:9998',
				ws: true,
			}
		}
	}
});
