import { fail, ok, type Result } from '../physics/types';
import { validateScenario, type ScenarioV1 } from './schema';

export const FRAGMENT_KEY = 'scenario';
/** Fragmentos más largos se rechazan antes de decodificar. */
export const MAX_FRAGMENT_LENGTH = 12_000;

function bytesToBase64Url(bytes: Uint8Array): string {
	let binary = '';
	for (const b of bytes) binary += String.fromCharCode(b);
	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(text: string): Uint8Array | null {
	if (!/^[A-Za-z0-9_-]*$/.test(text)) return null;
	const padded =
		text.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (text.length % 4)) % 4);
	try {
		const binary = atob(padded);
		const bytes = new Uint8Array(binary.length);
		for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
		return bytes;
	} catch {
		return null;
	}
}

/**
 * Codifica un escenario como JSON → UTF-8 → base64url. El orden de campos es el del
 * escenario validado, así que el resultado es determinista. Los números se escriben
 * con precisión completa (nunca se redondea B).
 */
export function encodeScenario(scenario: ScenarioV1): string {
	return bytesToBase64Url(new TextEncoder().encode(JSON.stringify(scenario)));
}

/** Fragmento completo `#scenario=…`. */
export function scenarioFragment(scenario: ScenarioV1): string {
	return `#${FRAGMENT_KEY}=${encodeScenario(scenario)}`;
}

export type FragmentResult = { present: false } | { present: true; result: Result<ScenarioV1> };

/** Lee un hash de URL. Sin `scenario=` no hay escenario; si lo hay, se valida por completo. */
export function decodeFragment(hash: string): FragmentResult {
	const raw = hash.startsWith('#') ? hash.slice(1) : hash;
	if (raw.length === 0) return { present: false };
	if (raw.length > MAX_FRAGMENT_LENGTH) {
		return {
			present: true,
			result: fail(
				'payload-too-large',
				'El enlace es demasiado largo para ser un escenario válido.'
			)
		};
	}
	const params = new URLSearchParams(raw);
	const encoded = params.get(FRAGMENT_KEY);
	if (encoded === null) return { present: false };
	const bytes = base64UrlToBytes(encoded);
	if (!bytes) {
		return {
			present: true,
			result: fail('malformed-scenario', 'El enlace no contiene un escenario legible.')
		};
	}
	let parsed: unknown;
	try {
		parsed = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
	} catch {
		return {
			present: true,
			result: fail('malformed-scenario', 'El enlace no contiene JSON válido.')
		};
	}
	const checked = validateScenario(parsed);
	return {
		present: true,
		result: checked.ok ? ok(checked.value.scenario) : checked
	};
}
