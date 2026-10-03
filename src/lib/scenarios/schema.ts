import {
	MASS_MAX_SOLAR,
	MASS_MIN_SOLAR,
	OBSERVER_MAX_RS,
	OBSERVER_MIN_RS,
	ORBIT_RADIUS_MAX_RS,
	ORBIT_RADIUS_MIN_RS,
	ORBIT_SPEED_MAX_C,
	PHOTON_EMITTER_MAX_RS,
	PHOTON_EMITTER_MIN_RS,
	PHOTON_IMPACT_MAX_RS
} from '../physics/constants';
import { maxImpactParameter } from '../physics/initialConditions';
import { fail, ok, type Result } from '../physics/types';

export type Experiment = 'clocks' | 'orbits' | 'photons';
export type OrbitModel = 'newtonian' | 'schwarzschild' | 'compare';
export type Quality = 'low' | 'balanced' | 'high';
export type DistanceLock = 'rs' | 'km';

/** Configuración persistible (docs/07). Solo condiciones iniciales y vista; nunca estado vivo. */
export interface ScenarioV1 {
	schemaVersion: 1;
	experiment: Experiment;
	massSolar: number;
	observer: { radiusRs: number; angleRad: number; distanceLock: DistanceLock };
	orbit: {
		model: OrbitModel;
		radiusRs: number;
		angleRad: number;
		speedLocalC: number;
		directionRad: number;
		comparison: 'same-coordinate-state';
	};
	photon: {
		emissionRadiusRs: number;
		emissionAngleRad: number;
		impactParameterRs: number;
		incoming: true;
	};
	view: {
		zoom: number;
		grid: boolean;
		disk: boolean;
		references: boolean;
		labels: boolean;
		trails: boolean;
		quality: Quality;
	};
	playback: { speed: number };
}

/** Metadata opcional documentada (docs/09); no sustituye parámetros. */
export interface ScenarioMetadata {
	presetId?: string;
	exportedBy?: string;
	appVersion?: string;
}

export const TWO_PI = 2 * Math.PI;

export function defaultScenario(): ScenarioV1 {
	return {
		schemaVersion: 1,
		experiment: 'clocks',
		massSolar: 10,
		observer: { radiusRs: 4, angleRad: 0, distanceLock: 'rs' },
		orbit: {
			model: 'schwarzschild',
			radiusRs: 6,
			angleRad: 0,
			speedLocalC: Math.sqrt(0.1),
			directionRad: Math.PI / 2,
			comparison: 'same-coordinate-state'
		},
		photon: {
			emissionRadiusRs: 12,
			emissionAngleRad: Math.PI,
			impactParameterRs: 3,
			incoming: true
		},
		view: {
			zoom: 1,
			grid: false,
			disk: true,
			references: true,
			labels: true,
			trails: true,
			quality: 'balanced'
		},
		playback: { speed: 1 }
	};
}

/** Normaliza un ángulo a [0, 2π). */
export function normalizeAngle(angle: number): number {
	const a = angle % TWO_PI;
	return a < 0 ? a + TWO_PI : a;
}

// ── Validación estricta ─────────────────────────────────────────

type Plain = Record<string, unknown>;

class ValidationError extends Error {
	constructor(
		readonly code: 'malformed-scenario' | 'out-of-range' | 'unsupported-schema' | 'invalid-impact',
		message: string,
		readonly field: string
	) {
		super(message);
	}
}

function isPlainObject(value: unknown): value is Plain {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
	const proto = Object.getPrototypeOf(value) as unknown;
	return proto === Object.prototype || proto === null;
}

function object(value: unknown, field: string, keys: readonly string[]): Plain {
	if (!isPlainObject(value)) {
		throw new ValidationError('malformed-scenario', `${field} debe ser un objeto.`, field);
	}
	for (const key of Object.keys(value)) {
		if (!keys.includes(key)) {
			throw new ValidationError(
				'malformed-scenario',
				`Campo desconocido: ${field}.${key}.`,
				`${field}.${key}`
			);
		}
	}
	for (const key of keys) {
		if (!Object.prototype.hasOwnProperty.call(value, key)) {
			throw new ValidationError(
				'malformed-scenario',
				`Falta el campo ${field}.${key}.`,
				`${field}.${key}`
			);
		}
	}
	return value;
}

function finite(value: unknown, field: string): number {
	if (typeof value !== 'number' || !Number.isFinite(value)) {
		throw new ValidationError('malformed-scenario', `${field} debe ser un número finito.`, field);
	}
	return value;
}

function range(value: unknown, field: string, min: number, max: number): number {
	const n = finite(value, field);
	if (n < min || n > max) {
		throw new ValidationError('out-of-range', `${field} debe estar entre ${min} y ${max}.`, field);
	}
	return n;
}

function bool(value: unknown, field: string): boolean {
	if (typeof value !== 'boolean') {
		throw new ValidationError('malformed-scenario', `${field} debe ser true o false.`, field);
	}
	return value;
}

function oneOf<T extends string>(value: unknown, field: string, options: readonly T[]): T {
	if (typeof value !== 'string' || !(options as readonly string[]).includes(value)) {
		throw new ValidationError(
			'malformed-scenario',
			`${field} debe ser uno de: ${options.join(', ')}.`,
			field
		);
	}
	return value as T;
}

const TOP_KEYS = [
	'schemaVersion',
	'experiment',
	'massSolar',
	'observer',
	'orbit',
	'photon',
	'view',
	'playback'
] as const;
const METADATA_KEYS = ['presetId', 'exportedBy', 'appVersion'] as const;

/**
 * Valida un valor desconocido como ScenarioV1 completo. No hay coerción ("false" ≠ false),
 * ni merge con estado previo, ni campos desconocidos (salvo metadata documentada).
 */
export function validateScenario(
	input: unknown
): Result<{ scenario: ScenarioV1; metadata: ScenarioMetadata }> {
	try {
		if (!isPlainObject(input)) {
			throw new ValidationError('malformed-scenario', 'El escenario debe ser un objeto JSON.', '');
		}
		if (input.schemaVersion !== 1) {
			throw new ValidationError(
				'unsupported-schema',
				typeof input.schemaVersion === 'number' && input.schemaVersion > 1
					? `Versión de escenario ${input.schemaVersion} no soportada por esta aplicación.`
					: 'schemaVersion debe ser 1.',
				'schemaVersion'
			);
		}
		const metadata: ScenarioMetadata = {};
		const core: Plain = {};
		for (const [key, value] of Object.entries(input)) {
			if ((METADATA_KEYS as readonly string[]).includes(key)) {
				if (typeof value !== 'string' || value.length > 64) {
					throw new ValidationError('malformed-scenario', `${key} debe ser un texto corto.`, key);
				}
				metadata[key as keyof ScenarioMetadata] = value;
			} else {
				core[key] = value;
			}
		}
		const root = object(core, 'escenario', TOP_KEYS);
		const observer = object(root.observer, 'observer', ['radiusRs', 'angleRad', 'distanceLock']);
		const orbit = object(root.orbit, 'orbit', [
			'model',
			'radiusRs',
			'angleRad',
			'speedLocalC',
			'directionRad',
			'comparison'
		]);
		const photon = object(root.photon, 'photon', [
			'emissionRadiusRs',
			'emissionAngleRad',
			'impactParameterRs',
			'incoming'
		]);
		const view = object(root.view, 'view', [
			'zoom',
			'grid',
			'disk',
			'references',
			'labels',
			'trails',
			'quality'
		]);
		const playback = object(root.playback, 'playback', ['speed']);

		const emissionRadiusRs = range(
			photon.emissionRadiusRs,
			'photon.emissionRadiusRs',
			PHOTON_EMITTER_MIN_RS,
			PHOTON_EMITTER_MAX_RS
		);
		const impact = range(
			photon.impactParameterRs,
			'photon.impactParameterRs',
			-PHOTON_IMPACT_MAX_RS,
			PHOTON_IMPACT_MAX_RS
		);
		if (Math.abs(impact) > maxImpactParameter(emissionRadiusRs)) {
			throw new ValidationError(
				'invalid-impact',
				'El parámetro de impacto no es alcanzable desde ese emisor.',
				'photon.impactParameterRs'
			);
		}
		if (photon.incoming !== true) {
			throw new ValidationError(
				'malformed-scenario',
				'photon.incoming debe ser true.',
				'photon.incoming'
			);
		}
		if (orbit.comparison !== 'same-coordinate-state') {
			throw new ValidationError(
				'malformed-scenario',
				"orbit.comparison debe ser 'same-coordinate-state'.",
				'orbit.comparison'
			);
		}

		const scenario: ScenarioV1 = {
			schemaVersion: 1,
			experiment: oneOf(root.experiment, 'experiment', ['clocks', 'orbits', 'photons'] as const),
			massSolar: range(root.massSolar, 'massSolar', MASS_MIN_SOLAR, MASS_MAX_SOLAR),
			observer: {
				radiusRs: range(observer.radiusRs, 'observer.radiusRs', OBSERVER_MIN_RS, OBSERVER_MAX_RS),
				angleRad: normalizeAngle(finite(observer.angleRad, 'observer.angleRad')),
				distanceLock: oneOf(observer.distanceLock, 'observer.distanceLock', ['rs', 'km'] as const)
			},
			orbit: {
				model: oneOf(orbit.model, 'orbit.model', [
					'newtonian',
					'schwarzschild',
					'compare'
				] as const),
				radiusRs: range(orbit.radiusRs, 'orbit.radiusRs', ORBIT_RADIUS_MIN_RS, ORBIT_RADIUS_MAX_RS),
				angleRad: normalizeAngle(finite(orbit.angleRad, 'orbit.angleRad')),
				speedLocalC: range(orbit.speedLocalC, 'orbit.speedLocalC', 0, ORBIT_SPEED_MAX_C),
				directionRad: finite(orbit.directionRad, 'orbit.directionRad'),
				comparison: 'same-coordinate-state'
			},
			photon: {
				emissionRadiusRs,
				emissionAngleRad: normalizeAngle(
					finite(photon.emissionAngleRad, 'photon.emissionAngleRad')
				),
				impactParameterRs: impact,
				incoming: true
			},
			view: {
				zoom: range(view.zoom, 'view.zoom', 0.5, 2),
				grid: bool(view.grid, 'view.grid'),
				disk: bool(view.disk, 'view.disk'),
				references: bool(view.references, 'view.references'),
				labels: bool(view.labels, 'view.labels'),
				trails: bool(view.trails, 'view.trails'),
				quality: oneOf(view.quality, 'view.quality', ['low', 'balanced', 'high'] as const)
			},
			playback: { speed: range(playback.speed, 'playback.speed', 0.25, 4) }
		};
		if (Math.abs(scenario.orbit.directionRad) > 2 * TWO_PI) {
			throw new ValidationError(
				'out-of-range',
				'orbit.directionRad fuera de rango.',
				'orbit.directionRad'
			);
		}
		return ok({ scenario, metadata });
	} catch (error) {
		if (error instanceof ValidationError) return fail(error.code, error.message, error.field);
		throw error;
	}
}

/** Copia profunda de un escenario válido (objetos planos de números, strings y booleanos). */
export function cloneScenario(s: ScenarioV1): ScenarioV1 {
	return {
		...s,
		observer: { ...s.observer },
		orbit: { ...s.orbit },
		photon: { ...s.photon },
		view: { ...s.view },
		playback: { ...s.playback }
	};
}
