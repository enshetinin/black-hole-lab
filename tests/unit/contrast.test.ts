import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/** Contraste WCAG 2.2 de los tokens finales de src/app.css (pares realmente usados). */
const css = readFileSync(new URL('../../src/app.css', import.meta.url), 'utf8');
function token(name: string): string {
	const m = css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6}|var\\(--([a-z-]+)\\))`));
	if (!m) throw new Error(`token ${name} no encontrado`);
	// Resuelve alias semánticos como --bg: var(--yev-ink).
	return m[2] ? token(m[2]) : m[1]!;
}
function luminance(hex: string): number {
	const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
	const [r, g, b] = c.map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)) as [
		number,
		number,
		number
	];
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function ratio(a: string, b: string): number {
	const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
	return (l1 + 0.05) / (l2 + 0.05);
}

describe('contraste de tokens (Yev Design, dialecto de aplicación)', () => {
	const backgrounds = ['bg', 'scene-bg', 'surface', 'surface-raised'];
	it.each(['text', 'muted', 'signal', 'warning', 'danger', 'success', 'info'])(
		'%s es texto legible (≥ 4,5:1) sobre los fondos',
		(fg) => {
			for (const bg of backgrounds) expect(ratio(token(fg), token(bg))).toBeGreaterThanOrEqual(4.5);
		}
	);
	it('el texto principal alcanza AAA (≥ 7:1)', () => {
		for (const bg of backgrounds) expect(ratio(token('text'), token(bg))).toBeGreaterThanOrEqual(7);
	});
	it.each(['data-gr', 'data-newton', 'data-photon', 'data-isco'])(
		'%s es un trazo distinguible (≥ 3:1) sobre la escena',
		(fg) => {
			expect(ratio(token(fg), token('scene-bg'))).toBeGreaterThanOrEqual(3);
		}
	);
	it('el borde de controles es un componente esencial visible (≥ 3:1)', () => {
		for (const bg of ['bg', 'scene-bg']) {
			expect(ratio(token('control-line'), token(bg))).toBeGreaterThanOrEqual(3);
		}
	});
	it('el botón primario (tinta sobre papel) es legible', () => {
		expect(ratio(token('yev-ink'), token('yev-paper'))).toBeGreaterThanOrEqual(7);
	});
});
