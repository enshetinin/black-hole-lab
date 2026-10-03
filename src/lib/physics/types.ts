/**
 * Tipos compartidos de la capa física. Unidades adimensionales del motor:
 * longitudes en rs, tiempo coordenado T = ct/rs, tiempo propio S = cτ/rs.
 */

export type ErrorCode =
	| 'invalid-number'
	| 'out-of-range'
	| 'observer-inside-horizon'
	| 'invalid-orbit-radius'
	| 'superluminal-input'
	| 'invalid-impact'
	| 'unsupported-schema'
	| 'malformed-scenario'
	| 'storage-unavailable'
	| 'clipboard-unavailable'
	| 'step-underflow'
	| 'non-finite-state'
	| 'budget-exceeded'
	| 'payload-too-large';

export type Result<T> =
	{ ok: true; value: T } | { ok: false; code: ErrorCode; message: string; field?: string };

export function ok<T>(value: T): Result<T> {
	return { ok: true, value };
}

export function fail<T = never>(code: ErrorCode, message: string, field?: string): Result<T> {
	return field === undefined ? { ok: false, code, message } : { ok: false, code, message, field };
}

export type GeodesicKind = 'massive' | 'photon';

/** Constantes del movimiento. Discriminadas para que kappa y kind sean coherentes. */
export type GeodesicConstants =
	| { kind: 'massive'; kappa: 1; energy: number; angularMomentum: number }
	| { kind: 'photon'; kappa: 0; energy: number; angularMomentum: number };

export interface GeodesicState {
	/** x = r/rs, radio areal. */
	radiusRs: number;
	/** dx/dλ. NO es una velocidad local. */
	radialDerivative: number;
	/** φ sin envolver, rad. */
	azimuthRad: number;
	/** T relativo al lanzamiento (rs/c). */
	coordinateTime: number;
	/** λ: tiempo propio S para masivas; parámetro afín para fotones. */
	parameter: number;
}

export interface NewtonState {
	xRs: number;
	yRs: number;
	/** dX/dT, en unidades de c. */
	vxC: number;
	vyC: number;
	/** T relativo al lanzamiento. */
	coordinateTime: number;
}

export type Stability = 'stable' | 'marginal' | 'unstable';
