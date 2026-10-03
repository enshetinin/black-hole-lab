import type { NewtonState } from './types';

/**
 * Newton adimensional en rs y T: X″ = −X/(2R³), Y″ = −Y/(2R³) (GM/c² = 1/2 en unidades rs).
 * Sin softening. No tiene horizonte: la captura en R ≤ cutoff es una frontera impuesta
 * para comparar con el agujero negro.
 */
export function newtonAcceleration(xRs: number, yRs: number): { ax: number; ay: number } {
	const r2 = xRs * xRs + yRs * yRs;
	const r3 = r2 * Math.sqrt(r2);
	const k = -1 / (2 * r3);
	return { ax: k * xRs, ay: k * yRs };
}

/** Energía específica E_N = ½|V|² − 1/(2R). */
export function newtonEnergy(s: NewtonState): number {
	return 0.5 * (s.vxC * s.vxC + s.vyC * s.vyC) - 1 / (2 * Math.hypot(s.xRs, s.yRs));
}

/** Momento angular específico L_N = X·VY − Y·VX. */
export function newtonAngularMomentum(s: NewtonState): number {
	return s.xRs * s.vyC - s.yRs * s.vxC;
}

/** Velocidad newtoniana circular 1/√(2R) en c. */
export function newtonCircularSpeed(radiusRs: number): number {
	return 1 / Math.sqrt(2 * radiusRs);
}
