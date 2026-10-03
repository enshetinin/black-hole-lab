import { fail, ok, type Result } from '../physics/types';
import { validateScenario, type ScenarioV1 } from './schema';

export const STORAGE_KEY = 'black-hole-lab:scenario:v1';
export const TUTORIAL_KEY = 'black-hole-lab:tutorial:v1';
export const SAVE_DEBOUNCE_MS = 300;

/** Subconjunto de Storage para inyectar en tests. */
export type KeyValueStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** Obtiene localStorage si existe y es accesible (modo privado o bloqueo pueden lanzar). */
export function getBrowserStorage(): KeyValueStore | null {
	try {
		return typeof localStorage === 'undefined' ? null : localStorage;
	} catch {
		return null;
	}
}

export function loadScenario(store: KeyValueStore | null): Result<ScenarioV1 | null> {
	if (!store) return fail('storage-unavailable', 'El almacenamiento local no está disponible.');
	let raw: string | null;
	try {
		raw = store.getItem(STORAGE_KEY);
	} catch {
		return fail('storage-unavailable', 'El almacenamiento local no está disponible.');
	}
	if (raw === null) return ok(null);
	if (raw.length > 64 * 1024)
		return fail('payload-too-large', 'El escenario guardado es demasiado grande.');
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		return fail('malformed-scenario', 'El escenario guardado está dañado.');
	}
	const checked = validateScenario(parsed);
	return checked.ok ? ok(checked.value.scenario) : checked;
}

export function saveScenario(store: KeyValueStore | null, scenario: ScenarioV1): Result<void> {
	if (!store) return fail('storage-unavailable', 'El almacenamiento local no está disponible.');
	try {
		store.setItem(STORAGE_KEY, JSON.stringify(scenario));
		return ok(undefined);
	} catch {
		return fail(
			'storage-unavailable',
			'No se pudo guardar el escenario (almacenamiento lleno o bloqueado).'
		);
	}
}

export function clearScenario(store: KeyValueStore | null): void {
	try {
		store?.removeItem(STORAGE_KEY);
	} catch {
		// Sin almacenamiento no hay nada que borrar; la app sigue funcionando.
	}
}

export function readFlag(store: KeyValueStore | null, key: string): boolean {
	try {
		return store?.getItem(key) === '1';
	} catch {
		return false;
	}
}

export function writeFlag(store: KeyValueStore | null, key: string, value: boolean): void {
	try {
		if (value) store?.setItem(key, '1');
		else store?.removeItem(key);
	} catch {
		// Preferencia no esencial.
	}
}

/** Guardado con debounce: ninguna escritura por frame. */
export function createDebouncedSaver(
	save: (s: ScenarioV1) => void,
	delayMs = SAVE_DEBOUNCE_MS,
	timers: Pick<typeof globalThis, 'setTimeout' | 'clearTimeout'> = globalThis
) {
	let handle: ReturnType<typeof setTimeout> | null = null;
	let pending: ScenarioV1 | null = null;
	return {
		schedule(s: ScenarioV1) {
			pending = s;
			if (handle !== null) timers.clearTimeout(handle);
			handle = timers.setTimeout(() => {
				handle = null;
				if (pending) save(pending);
				pending = null;
			}, delayMs);
		},
		cancel() {
			if (handle !== null) timers.clearTimeout(handle);
			handle = null;
			pending = null;
		}
	};
}
