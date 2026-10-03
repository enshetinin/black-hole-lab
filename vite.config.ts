import { defineConfig } from 'vitest/config';
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';

// Ruta base para alojar en un subdirectorio (p. ej. GitHub Pages: BASE_PATH=/black-hole-lab).
// Vacía por defecto: desarrollo, preview y E2E sirven en la raíz.
function basePath(value: string | undefined): '' | `/${string}` {
	if (value === undefined || value === '') return '';
	if (value.startsWith('/') && !value.endsWith('/')) return value as `/${string}`;
	throw new Error(`BASE_PATH debe empezar por "/" y no terminar en "/": ${value}`);
}
const base = basePath(process.env.BASE_PATH);

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Fuerza runes en el proyecto, excepto dependencias.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter({ pages: 'build', assets: 'build', strict: true }),
			paths: { base }
		})
	],
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'unit',
					environment: 'node',
					include: ['tests/unit/**/*.test.ts', 'src/**/*.test.ts']
				}
			}
		]
	}
});
