import { CAPTURE_CUTOFF_RS } from './constants';
import { metricFactor } from './schwarzschild';
import { isFiniteNumber } from './units';
import {
	fail,
	ok,
	type GeodesicConstants,
	type GeodesicState,
	type NewtonState,
	type Result
} from './types';

/**
 * Lanzamiento definido por un observador estático local:
 * x0 (rs), φ0 (rad), β = rapidez local (c) y α = dirección desde la radial exterior,
 * positiva hacia +φ (rad).
 */
export interface LocalLaunch {
	radiusRs: number;
	azimuthRad: number;
	speedLocalC: number;
	directionRad: number;
}

export interface GeodesicLaunch {
	constants: GeodesicConstants;
	state: GeodesicState;
}

/** Tolerancia de redondeo para asin (docs/04): nunca se usa para aceptar entradas fuera de dominio. */
const ASIN_ROUNDING_TOLERANCE = 1e-12;

function validateLaunchRadius(x: number): Result<number> {
	if (!isFiniteNumber(x)) return fail('invalid-number', 'El radio debe ser finito.', 'radiusRs');
	if (x <= CAPTURE_CUTOFF_RS) {
		return fail(
			'invalid-orbit-radius',
			'El lanzamiento debe estar fuera del cutoff de cálculo (x > 1,01 rs).',
			'radiusRs'
		);
	}
	return ok(x);
}

/**
 * Condiciones iniciales masivas (κ = 1) desde la tetrada estática:
 * E = γ√f0, ℓ = γ x0 βφ, v0 = γ√f0 βr, con βr = β cosα, βφ = β sinα.
 */
export function massiveFromLocal(launch: LocalLaunch): Result<GeodesicLaunch> {
	const radius = validateLaunchRadius(launch.radiusRs);
	if (!radius.ok) return radius;
	const { azimuthRad, speedLocalC: beta, directionRad: alpha } = launch;
	if (!isFiniteNumber(azimuthRad) || !isFiniteNumber(alpha)) {
		return fail('invalid-number', 'Los ángulos deben ser finitos.');
	}
	if (!isFiniteNumber(beta) || beta < 0) {
		return fail('invalid-number', 'La rapidez debe ser un número finito ≥ 0.', 'speedLocalC');
	}
	if (beta >= 1) {
		return fail(
			'superluminal-input',
			'Una partícula con masa necesita una rapidez local menor que c.',
			'speedLocalC'
		);
	}
	const x0 = radius.value;
	const sqrtF = Math.sqrt(metricFactor(x0));
	const gamma = 1 / Math.sqrt(1 - beta * beta);
	const betaR = beta * Math.cos(alpha);
	const betaPhi = beta * Math.sin(alpha);
	return ok({
		constants: {
			kind: 'massive',
			kappa: 1,
			energy: gamma * sqrtF,
			angularMomentum: gamma * x0 * betaPhi
		},
		state: {
			radiusRs: x0,
			radialDerivative: gamma * sqrtF * betaR,
			azimuthRad,
			coordinateTime: 0,
			parameter: 0
		}
	});
}

/**
 * Fotón (κ = 0) emitido en dirección local α con energía local inicial 1:
 * E = √f0, ℓ = x0 sinα, v0 = √f0 cosα. λ es afín, no tiempo propio.
 */
export function photonFromDirection(
	radiusRs: number,
	azimuthRad: number,
	directionRad: number
): Result<GeodesicLaunch> {
	const radius = validateLaunchRadius(radiusRs);
	if (!radius.ok) return radius;
	if (!isFiniteNumber(azimuthRad) || !isFiniteNumber(directionRad)) {
		return fail('invalid-number', 'Los ángulos deben ser finitos.');
	}
	const x0 = radius.value;
	const sqrtF = Math.sqrt(metricFactor(x0));
	return ok({
		constants: {
			kind: 'photon',
			kappa: 0,
			energy: sqrtF,
			angularMomentum: x0 * Math.sin(directionRad)
		},
		state: {
			radiusRs: x0,
			radialDerivative: sqrtF * Math.cos(directionRad),
			azimuthRad,
			coordinateTime: 0,
			parameter: 0
		}
	});
}

/** |B| máximo para un emisor finito en x0: x0/√f0. */
export function maxImpactParameter(radiusRs: number): number {
	return radiusRs / Math.sqrt(metricFactor(radiusRs));
}

/**
 * Dirección local α de un rayo entrante con impacto B = ℓ/E:
 * sinα = B√f0/x0, α = π − asin(·), cosα < 0. Rechaza |B| > x0/√f0.
 */
export function incomingPhotonDirection(radiusRs: number, impactRs: number): Result<number> {
	const radius = validateLaunchRadius(radiusRs);
	if (!radius.ok) return radius;
	if (!isFiniteNumber(impactRs)) {
		return fail('invalid-number', 'El parámetro de impacto debe ser finito.', 'impactParameterRs');
	}
	const x0 = radius.value;
	let s = (impactRs * Math.sqrt(metricFactor(x0))) / x0;
	if (Math.abs(s) > 1 + ASIN_ROUNDING_TOLERANCE) {
		return fail(
			'invalid-impact',
			`Con el emisor en ${x0} rs, |B| no puede superar ${maxImpactParameter(x0).toFixed(3)}.`,
			'impactParameterRs'
		);
	}
	s = Math.min(1, Math.max(-1, s));
	return ok(Math.PI - Math.asin(s));
}

/** Fotón entrante desde un emisor finito parametrizado por B (docs/04, Fotones). */
export function photonFromImpact(
	radiusRs: number,
	azimuthRad: number,
	impactRs: number
): Result<GeodesicLaunch> {
	const alpha = incomingPhotonDirection(radiusRs, impactRs);
	if (!alpha.ok) return alpha;
	return photonFromDirection(radiusRs, azimuthRad, alpha.value);
}

export interface NewtonLaunch {
	state: NewtonState;
	/** Velocidad coordenada radial dr/dT = f0 βr (c). */
	radialCoordinateSpeedC: number;
	/** Velocidad coordenada tangencial x0 dφ/dT = √f0 βφ (c). */
	tangentialCoordinateSpeedC: number;
}

/**
 * Estado newtoniano con el mismo evento y las mismas derivadas espaciales respecto a T
 * que la geodésica: dr/dT = f0 βr, x0 dφ/dT = √f0 βφ. No implica la misma tetrada local.
 */
export function newtonFromLocal(launch: LocalLaunch): Result<NewtonLaunch> {
	// Reutiliza la validación relativista: el producto limita las entradas igual en ambos modelos.
	const relativistic = massiveFromLocal(launch);
	if (!relativistic.ok) return relativistic;
	const { radiusRs: x0, azimuthRad: phi, speedLocalC: beta, directionRad: alpha } = launch;
	const f0 = metricFactor(x0);
	const vr = f0 * beta * Math.cos(alpha);
	const vt = Math.sqrt(f0) * beta * Math.sin(alpha);
	const cos = Math.cos(phi);
	const sin = Math.sin(phi);
	return ok({
		state: {
			xRs: x0 * cos,
			yRs: x0 * sin,
			vxC: vr * cos - vt * sin,
			vyC: vr * sin + vt * cos,
			coordinateTime: 0
		},
		radialCoordinateSpeedC: vr,
		tangentialCoordinateSpeedC: vt
	});
}

/**
 * Velocidad local medida por un observador estático en el estado dado:
 * βr = v/E, βφ = ℓ√f/(xE), β² = 1 − κf/E². Requiere x > 1.
 */
export function localVelocity(
	state: Pick<GeodesicState, 'radiusRs' | 'radialDerivative'>,
	constants: GeodesicConstants
): { radialC: number; tangentialC: number; speedC: number } {
	const x = state.radiusRs;
	const f = metricFactor(x);
	const radialC = state.radialDerivative / constants.energy;
	const tangentialC = (constants.angularMomentum * Math.sqrt(f)) / (x * constants.energy);
	return { radialC, tangentialC, speedC: Math.hypot(radialC, tangentialC) };
}

/** Rapidez local requerida para una órbita circular desde la velocidad newtoniana convertida. */
export function circularLaunchSpeed(radiusRs: number): number {
	// √f · β = 1/√(2x)  ⇒  β = 1/√(2(x−1)); coincide con βcirc relativista.
	return 1 / Math.sqrt(2 * (radiusRs - 1));
}
