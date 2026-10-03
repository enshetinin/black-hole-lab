import { describe, expect, it, vi } from 'vitest';
import { CRITICAL_IMPACT_RS } from '../../src/lib/physics/constants';
import { incomingPhotonDirection } from '../../src/lib/physics/initialConditions';
import { defaultScenario, validateScenario, type ScenarioV1 } from '../../src/lib/scenarios/schema';
import { PRESETS, presetScenario } from '../../src/lib/scenarios/presets';
import {
	MAX_FRAGMENT_LENGTH,
	decodeFragment,
	encodeScenario,
	scenarioFragment
} from '../../src/lib/scenarios/url';
import {
	STORAGE_KEY,
	clearScenario,
	createDebouncedSaver,
	loadScenario,
	saveScenario,
	type KeyValueStore
} from '../../src/lib/scenarios/storage';
import { parseScenarioJson, scenarioToJson } from '../../src/lib/scenarios/export';
import { GeodesicIntegrator } from '../../src/lib/simulation/integrators/rk4';
import { photonFromImpact } from '../../src/lib/physics/initialConditions';

function memoryStore(): KeyValueStore & { data: Map<string, string> } {
	const data = new Map<string, string>();
	return {
		data,
		getItem: (k) => data.get(k) ?? null,
		setItem: (k, v) => void data.set(k, v),
		removeItem: (k) => void data.delete(k)
	};
}

const throwingStore: KeyValueStore = {
	getItem: () => {
		throw new Error('SecurityError');
	},
	setItem: () => {
		throw new Error('QuotaExceededError');
	},
	removeItem: () => {
		throw new Error('SecurityError');
	}
};

function mutated(mutate: (s: Record<string, unknown>) => void): unknown {
	const s = JSON.parse(JSON.stringify(defaultScenario())) as Record<string, unknown>;
	mutate(s);
	return s;
}

describe('validación de ScenarioV1', () => {
	it('acepta los valores iniciales documentados', () => {
		const r = validateScenario(defaultScenario());
		expect(r.ok).toBe(true);
		const d = defaultScenario();
		expect(d.massSolar).toBe(10);
		expect(d.observer.radiusRs).toBe(4);
		expect(d.orbit.speedLocalC).toBeCloseTo(Math.sqrt(0.1), 15);
		expect(d.photon.impactParameterRs).toBe(3);
		expect(d.view.grid).toBe(false);
	});

	it.each([
		['masa fuera de rango', (s: Record<string, unknown>) => (s.massSolar = 101), 'out-of-range'],
		[
			'masa como string',
			(s: Record<string, unknown>) => (s.massSolar = '10'),
			'malformed-scenario'
		],
		['NaN no es JSON', (s: Record<string, unknown>) => (s.massSolar = null), 'malformed-scenario'],
		[
			'booleano como string',
			(s: Record<string, unknown>) => ((s.view as Record<string, unknown>).grid = 'false'),
			'malformed-scenario'
		],
		['campo desconocido', (s: Record<string, unknown>) => (s.masSolar = 10), 'malformed-scenario'],
		['falta un campo', (s: Record<string, unknown>) => delete s.playback, 'malformed-scenario'],
		[
			'array en lugar de objeto',
			(s: Record<string, unknown>) => (s.observer = [4, 0, 'rs']),
			'malformed-scenario'
		],
		[
			'observador en el horizonte',
			(s: Record<string, unknown>) => ((s.observer as Record<string, unknown>).radiusRs = 1),
			'out-of-range'
		],
		[
			'β superlumínica',
			(s: Record<string, unknown>) => ((s.orbit as Record<string, unknown>).speedLocalC = 1),
			'out-of-range'
		],
		[
			'enum inválido',
			(s: Record<string, unknown>) => (s.experiment = 'kerr'),
			'malformed-scenario'
		],
		['schema futuro', (s: Record<string, unknown>) => (s.schemaVersion = 2), 'unsupported-schema'],
		[
			'incoming falso',
			(s: Record<string, unknown>) => ((s.photon as Record<string, unknown>).incoming = false),
			'malformed-scenario'
		]
	])('rechaza %s', (_name, mutate, code) => {
		const r = validateScenario(mutated(mutate));
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.code).toBe(code);
	});

	it('rechaza dependencias B/x₀ imposibles', () => {
		// |B| ≤ x0/√f0: con x0 = 6, el máximo es ≈ 6,57 > 5, pero B fuera de [−5,5] se rechaza.
		const r = validateScenario(
			mutated((s) => ((s.photon as Record<string, unknown>).impactParameterRs = 5.5))
		);
		expect(r.ok).toBe(false);
	});

	it('no mezcla __proto__ ni constructor', () => {
		const json = JSON.stringify(defaultScenario()).replace('{', '{"__proto__":{"polluted":true},');
		const r = validateScenario(JSON.parse(json));
		expect(r.ok).toBe(false);
		expect(({} as Record<string, unknown>).polluted).toBeUndefined();
		expect(validateScenario(Object.create({ schemaVersion: 1 })).ok).toBe(false);
		expect(validateScenario(null).ok).toBe(false);
		expect(validateScenario([]).ok).toBe(false);
	});

	it('acepta metadata documentada y normaliza ángulos', () => {
		const r = validateScenario(
			mutated((s) => {
				s.presetId = 'clocks-far';
				(s.observer as Record<string, unknown>).angleRad = -Math.PI / 2;
			})
		);
		expect(r.ok).toBe(true);
		if (r.ok) {
			expect(r.value.metadata.presetId).toBe('clocks-far');
			expect(r.value.scenario.observer.angleRad).toBeCloseTo((3 * Math.PI) / 2, 12);
		}
	});
});

describe('URL', () => {
	it('round-trip conserva todos los números con precisión completa', () => {
		const s = presetScenario('photon-near-critical')!;
		const decoded = decodeFragment(scenarioFragment(s));
		expect(decoded.present).toBe(true);
		if (decoded.present && decoded.result.ok) {
			expect(decoded.result.value).toEqual(s);
			// El preset crítico no cruza de lado por redondeo.
			expect(decoded.result.value.photon.impactParameterRs).toBe(CRITICAL_IMPACT_RS * (1 + 1e-4));
		} else throw new Error('decode failed');
	});

	it('es determinista y compacto', () => {
		const s = defaultScenario();
		expect(encodeScenario(s)).toBe(encodeScenario(JSON.parse(JSON.stringify(s)) as ScenarioV1));
		expect(scenarioFragment(s).length).toBeLessThan(4000);
		expect(encodeScenario(s)).toMatch(/^[A-Za-z0-9_-]+$/);
	});

	it('sin fragmento de escenario no hay escenario', () => {
		expect(decodeFragment('').present).toBe(false);
		expect(decodeFragment('#contenido').present).toBe(false);
	});

	it('rechaza fragmentos ilegibles, JSON roto, inválidos y gigantes', () => {
		const cases = [
			'#scenario=%%%',
			'#scenario=' + btoa('{no json').replace(/=+$/, ''),
			'#scenario=' + encodeScenario({ ...defaultScenario(), massSolar: 1000 }),
			'#scenario=' + 'A'.repeat(MAX_FRAGMENT_LENGTH + 1)
		];
		for (const hash of cases) {
			const d = decodeFragment(hash);
			expect(d.present).toBe(true);
			if (d.present) expect(d.result.ok).toBe(false);
		}
		const big = decodeFragment('#scenario=' + 'A'.repeat(MAX_FRAGMENT_LENGTH + 1));
		expect(big.present && !big.result.ok && big.result.code).toBe('payload-too-large');
	});

	it('codifica bytes UTF-8 (sin btoa sobre Unicode) y decodifica metadata', () => {
		const withUnicode = { ...defaultScenario(), exportedBy: 'Laboratorio ☉ ñ' };
		const json = JSON.stringify(withUnicode);
		const bytes = new TextEncoder().encode(json);
		let bin = '';
		for (const b of bytes) bin += String.fromCharCode(b);
		const frag =
			'#scenario=' + btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
		const d = decodeFragment(frag);
		expect(d.present && d.result.ok).toBe(true);
	});
});

describe('localStorage', () => {
	it('guarda y carga un escenario válido', () => {
		const store = memoryStore();
		const s = presetScenario('orbit-precession')!;
		expect(saveScenario(store, s).ok).toBe(true);
		const r = loadScenario(store);
		expect(r.ok && r.value).toEqual(s);
		clearScenario(store);
		expect(store.data.has(STORAGE_KEY)).toBe(false);
	});

	it('un almacenamiento que lanza no rompe nada', () => {
		const load = loadScenario(throwingStore);
		expect(!load.ok && load.code).toBe('storage-unavailable');
		const save = saveScenario(throwingStore, defaultScenario());
		expect(!save.ok && save.code).toBe('storage-unavailable');
		expect(() => clearScenario(throwingStore)).not.toThrow();
		expect(loadScenario(null).ok).toBe(false);
	});

	it('un escenario guardado dañado o inválido se ignora con error', () => {
		const store = memoryStore();
		store.setItem(STORAGE_KEY, '{oops');
		expect(loadScenario(store).ok).toBe(false);
		store.setItem(STORAGE_KEY, JSON.stringify({ ...defaultScenario(), schemaVersion: 7 }));
		const r = loadScenario(store);
		expect(!r.ok && r.code).toBe('unsupported-schema');
	});

	it('debounce: una sola escritura tras varios cambios', () => {
		vi.useFakeTimers();
		const save = vi.fn();
		const saver = createDebouncedSaver(save, 300);
		for (let i = 0; i < 10; i++) saver.schedule({ ...defaultScenario(), massSolar: 10 + i });
		vi.advanceTimersByTime(299);
		expect(save).not.toHaveBeenCalled();
		vi.advanceTimersByTime(1);
		expect(save).toHaveBeenCalledTimes(1);
		expect((save.mock.calls[0]![0] as ScenarioV1).massSolar).toBe(19);
		saver.schedule(defaultScenario());
		saver.cancel();
		vi.advanceTimersByTime(1000);
		expect(save).toHaveBeenCalledTimes(1);
		vi.useRealTimers();
	});
});

describe('JSON import/export', () => {
	it('round-trip con metadata documentada', () => {
		const s = presetScenario('orbit-escape')!;
		const text = scenarioToJson(s);
		expect(JSON.parse(text)).toMatchObject({ schemaVersion: 1, exportedBy: 'Black Hole Lab' });
		const r = parseScenarioJson(text);
		expect(r.ok && r.value).toEqual(s);
	});

	it('rechaza archivos grandes, JSON roto e inválidos', () => {
		expect(parseScenarioJson('x'.repeat(70 * 1024)).ok).toBe(false);
		expect(parseScenarioJson('{').ok).toBe(false);
		expect(parseScenarioJson('[]').ok).toBe(false);
		const r = parseScenarioJson(
			JSON.stringify({ ...defaultScenario(), massSolar: '<img src=x onerror=alert(1)>' })
		);
		expect(r.ok).toBe(false);
	});
});

describe('presets', () => {
	it('todos son ScenarioV1 válidos, masa 10, ×1, equilibrada', () => {
		expect(PRESETS.length).toBe(10);
		for (const p of PRESETS) {
			const s = presetScenario(p.id);
			expect(s, p.id).not.toBeNull();
			expect(s!.massSolar).toBe(10);
			expect(s!.playback.speed).toBe(1);
			expect(s!.view.quality).toBe('balanced');
			expect(s!.experiment).toBe(p.experiment);
		}
	});

	it('los presets de fotones producen el resultado anunciado', () => {
		const expected: Record<string, string> = {
			'photon-captured': 'captured',
			'photon-scattered': 'escaped',
			'photon-near-critical': 'escaped'
		};
		for (const [id, status] of Object.entries(expected)) {
			const s = presetScenario(id)!;
			expect(
				incomingPhotonDirection(s.photon.emissionRadiusRs, s.photon.impactParameterRs).ok
			).toBe(true);
			const launch = photonFromImpact(
				s.photon.emissionRadiusRs,
				s.photon.emissionAngleRad,
				s.photon.impactParameterRs
			);
			if (!launch.ok) throw new Error(id);
			const it = new GeodesicIntegrator(launch.value.constants, launch.value.state);
			it.run(1e9);
			expect(it.result().status, id).toBe(status);
		}
	});
});
