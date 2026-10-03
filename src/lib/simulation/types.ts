import type { GeodesicConstants, GeodesicKind } from '../physics/types';

export type BodyModel = 'schwarzschild' | 'newtonian';

export type BodyStatus =
	'active' | 'captured' | 'out-of-view' | 'escaped' | 'budget-exceeded' | 'numerical-error';

/** Estado terminal de una trayectoria precalculada. 'active' no es terminal. */
export type TerminalStatus = Exclude<BodyStatus, 'active' | 'out-of-view'>;

export type TerminationReason =
	| 'capture-cutoff'
	| 'escape-confirmed'
	| 'max-coordinate-time'
	| 'max-attempts'
	| 'max-derivative-evaluations'
	| 'cancelled'
	| 'step-underflow'
	| 'non-finite-state'
	| 'time-not-increasing'
	| 'constraint-drift';

export interface IntegrationDiagnostics {
	acceptedSteps: number;
	rejectedSteps: number;
	derivativeEvaluations: number;
	/** Residual normalizado máximo (geodésicas) o error relativo de energía (Newton). */
	maxConstraintResidual: number;
	/** Solo Newton: error relativo máximo de L_N. */
	maxAngularMomentumError: number;
	lastStep: number;
	terminationReason: TerminationReason;
}

export interface TurningPoint {
	type: 'pericenter' | 'apocenter';
	/** Edad en T desde el lanzamiento. */
	ageCoordinateTime: number;
	radiusRs: number;
	azimuthRad: number;
}

/**
 * Trayectoria precalculada. Muestras monótonas en T (edad desde el lanzamiento).
 * `parameter` es tiempo propio S para masivas Schwarzschild, parámetro afín para fotones
 * y NaN para Newton (no hay tiempo propio en el modelo clásico).
 */
export interface Trajectory {
	model: BodyModel;
	kind: GeodesicKind;
	/** Solo Schwarzschild. */
	constants: GeodesicConstants | null;
	/** Solo Newton: E_N y L_N iniciales. */
	newtonInvariants: { energy: number; angularMomentum: number } | null;
	count: number;
	ageCoordinateTime: Float64Array;
	radiusRs: Float64Array;
	azimuthRad: Float64Array;
	parameter: Float64Array;
	/** dx/dλ para geodésicas; dR/dT para Newton. */
	radialRate: Float64Array;
	status: TerminalStatus;
	turningPoints: TurningPoint[];
	diagnostics: IntegrationDiagnostics;
}

export interface TrajectoryPoint {
	ageCoordinateTime: number;
	radiusRs: number;
	azimuthRad: number;
	parameter: number;
	radialRate: number;
	/** true si la edad pedida supera el final calculado. */
	ended: boolean;
}
