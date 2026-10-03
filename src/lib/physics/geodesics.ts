import { metricFactor } from './schwarzschild';
import type { GeodesicConstants } from './types';

/**
 * Sistema de primer orden en λ para geodésicas ecuatoriales de Schwarzschild (docs/04):
 *   dx/dλ = v
 *   dv/dλ = −κ/(2x²) + ℓ²/x³ − 3ℓ²/(2x⁴)
 *   dφ/dλ = ℓ/x²
 *   dT/dλ = E/f
 * Estado empaquetado y = [x, v, φ, T]. λ es la variable independiente.
 * Precondición: x > 1. El integrador nunca la evalúa en x ≤ cutoff.
 */
export const GEODESIC_DIMENSION = 4;
export const IDX_X = 0;
export const IDX_V = 1;
export const IDX_PHI = 2;
export const IDX_T = 3;

export function geodesicDerivatives(
	y: ArrayLike<number>,
	constants: GeodesicConstants,
	out: Float64Array
): void {
	const x = y[IDX_X] as number;
	const v = y[IDX_V] as number;
	const l = constants.angularMomentum;
	const l2 = l * l;
	const x2 = x * x;
	out[IDX_X] = v;
	out[IDX_V] = -constants.kappa / (2 * x2) + l2 / (x2 * x) - (3 * l2) / (2 * x2 * x2);
	out[IDX_PHI] = l / x2;
	out[IDX_T] = constants.energy / metricFactor(x);
}

/**
 * Residual de normalización C = v² + f(κ + ℓ²/x²) − E², normalizado por max(1, E²).
 * Debe permanecer ~0: mide la precisión de la integración, no se corrige a mano.
 */
export function normalizedConstraintResidual(
	x: number,
	v: number,
	constants: GeodesicConstants
): number {
	const { kappa, energy: e, angularMomentum: l } = constants;
	const c = v * v + metricFactor(x) * (kappa + (l * l) / (x * x)) - e * e;
	return Math.abs(c) / Math.max(1, e * e);
}
