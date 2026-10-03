import { C_SI, ISCO_RS, PHOTON_SPHERE_RS } from './constants';
import { isFiniteNumber, schwarzschildRadiusMeters } from './units';
import { fail, ok, type Result, type Stability } from './types';

/**
 * f(x) = 1 − 1/x. Uso interno del motor, que garantiza x > 1 antes de llamarla.
 * No representa ningún reloj dentro del horizonte.
 */
export function metricFactor(x: number): number {
	return 1 - 1 / x;
}

/** Valida un radio exterior x > 1 (en rs). */
export function validateExteriorRadius(x: number): Result<number> {
	if (!isFiniteNumber(x)) return fail('invalid-number', 'El radio debe ser un número finito.');
	if (x <= 1) {
		return fail(
			'observer-inside-horizon',
			'No existe observador estático en el horizonte o dentro de él (x ≤ 1).'
		);
	}
	return ok(x);
}

/**
 * Ritmo de un reloj estático respecto a uno ideal muy lejano: q = dτ/dt = √(1 − 1/x).
 * Dominio x > 1 (rs). Nunca se extiende al interior.
 */
export function staticClockRate(x: number): Result<number> {
	const valid = validateExteriorRadius(x);
	if (!valid.ok) return valid;
	return ok(Math.sqrt(metricFactor(x)));
}

/** dt/dτ = 1/q: segundos de referencia por cada segundo local. Dominio x > 1. */
export function staticClockInverseRate(x: number): Result<number> {
	const q = staticClockRate(x);
	return q.ok ? ok(1 / q.value) : q;
}

/** Razón entre dos relojes estáticos finitos a y b (rs): √(f(a)/f(b)). */
export function staticClockRatio(a: number, b: number): Result<number> {
	const qa = staticClockRate(a);
	if (!qa.ok) return qa;
	const qb = staticClockRate(b);
	if (!qb.ok) return qb;
	return ok(qa.value / qb.value);
}

/**
 * Aceleración propia de un observador estático, a = GM/(r²√f), en m/s².
 * Entradas: x en rs (> 1), masa en M☉. Diverge al acercarse al horizonte.
 */
export function staticProperAcceleration(x: number, massSolar: number): Result<number> {
	const q = staticClockRate(x);
	if (!q.ok) return q;
	const rs = schwarzschildRadiusMeters(massSolar);
	const r = x * rs;
	// GM = rs c² / 2
	const gm = (rs * C_SI * C_SI) / 2;
	return ok(gm / (r * r * q.value));
}

/** Potencial radial V(x) = f(κ + ℓ²/x²). κ = 1 masiva, 0 fotón. */
export function radialPotential(x: number, angularMomentum: number, kappa: 0 | 1): number {
	return metricFactor(x) * (kappa + (angularMomentum * angularMomentum) / (x * x));
}

/** Aceleración radial dv/dλ = −V'(x)/2 = −κ/(2x²) + ℓ²/x³ − 3ℓ²/(2x⁴). */
export function radialAcceleration(x: number, angularMomentum: number, kappa: 0 | 1): number {
	const l2 = angularMomentum * angularMomentum;
	const x2 = x * x;
	return -kappa / (2 * x2) + l2 / (x2 * x) - (3 * l2) / (2 * x2 * x2);
}

export interface CircularOrbit {
	radiusRs: number;
	/** Rapidez orbital medida por un observador estático local, en c. */
	localSpeedC: number;
	/** Energía específica de Killing E. */
	energy: number;
	/** |ℓ| en unidades rs·c. */
	angularMomentum: number;
	/** dτ/dt del reloj orbital = √(1 − 3/(2x)). */
	properPerCoordinateTime: number;
	/** Período coordenado P_T = 2π√(2x³), en rs/c. */
	coordinatePeriod: number;
	/** Velocidad circular newtoniana 1/√(2x), en c. */
	newtonCircularSpeedC: number;
	stability: Stability;
}

/** Tolerancia para clasificar x = 3 como marginal. */
const MARGINAL_TOLERANCE = 1e-9;

/** Clasifica la estabilidad de una órbita circular masiva de Schwarzschild en x > 1.5. */
export function circularStability(x: number): Stability {
	if (Math.abs(x - ISCO_RS) <= MARGINAL_TOLERANCE) return 'marginal';
	return x > ISCO_RS ? 'stable' : 'unstable';
}

/**
 * Órbita circular geodésica masiva en x (rs). Dominio x > 1.5: no existen
 * órbitas circulares masivas en x ≤ 1.5.
 */
export function circularOrbit(x: number): Result<CircularOrbit> {
	if (!isFiniteNumber(x)) return fail('invalid-number', 'El radio debe ser un número finito.');
	if (x <= PHOTON_SPHERE_RS) {
		return fail(
			'invalid-orbit-radius',
			'No existen órbitas circulares de partículas con masa en x ≤ 1,5 rs.'
		);
	}
	const f = metricFactor(x);
	const properPerCoordinateTime = Math.sqrt(1 - 3 / (2 * x));
	return ok({
		radiusRs: x,
		localSpeedC: 1 / Math.sqrt(2 * (x - 1)),
		energy: f / properPerCoordinateTime,
		angularMomentum: x / Math.sqrt(2 * x - 3),
		properPerCoordinateTime,
		coordinatePeriod: 2 * Math.PI * Math.sqrt(2 * x * x * x),
		newtonCircularSpeedC: 1 / Math.sqrt(2 * x),
		stability: circularStability(x)
	});
}

/**
 * Radio de la órbita circular masiva inestable (máximo de V) para un ℓ dado, o null
 * si |ℓ| < √3 (sin extremos). Raíz menor de x² − 2ℓ²x + 3ℓ² = 0.
 */
export function unstableCircularRadius(angularMomentum: number): number | null {
	const l2 = angularMomentum * angularMomentum;
	const disc = l2 * l2 - 3 * l2;
	if (disc < 0) return null;
	return l2 - Math.sqrt(disc);
}

/**
 * Criterio suficiente de escape para una partícula masiva: E ≥ 1, movimiento saliente
 * y radio exterior al máximo del potencial. Entonces V(x') < 1 ≤ E² para todo x' > x,
 * por lo que no hay retorno exterior.
 */
export function massiveEscapeGuaranteed(
	x: number,
	radialDerivative: number,
	energy: number,
	angularMomentum: number
): boolean {
	if (energy < 1 || radialDerivative <= 0) return false;
	const barrier = unstableCircularRadius(angularMomentum);
	return barrier === null || x > barrier;
}

/**
 * Para un fotón saliente fuera de la esfera de fotones, V = fℓ²/x² decrece con x:
 * no hay retorno y el rayo escapa.
 */
export function photonEscapeGuaranteed(x: number, radialDerivative: number): boolean {
	return radialDerivative > 0 && x > PHOTON_SPHERE_RS;
}
