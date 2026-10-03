import type { GeodesicConstants, GeodesicKind } from '../physics/types';
import type {
	BodyModel,
	IntegrationDiagnostics,
	TerminalStatus,
	Trajectory,
	TrajectoryPoint,
	TurningPoint
} from './types';

/**
 * Buffer creciente de muestras. Criterio de muestreo por geometría (Δφ, Δx, ΔT),
 * no por frame: la curva se interpola linealmente entre muestras cercanas.
 */
export class SampleBuffer {
	count = 0;
	t = new Float64Array(256);
	x = new Float64Array(256);
	phi = new Float64Array(256);
	param = new Float64Array(256);
	rate = new Float64Array(256);

	push(t: number, x: number, phi: number, param: number, rate: number): void {
		if (this.count === this.t.length) this.grow();
		const i = this.count++;
		this.t[i] = t;
		this.x[i] = x;
		this.phi[i] = phi;
		this.param[i] = param;
		this.rate[i] = rate;
	}

	lastT(): number {
		return this.count > 0 ? (this.t[this.count - 1] as number) : -Infinity;
	}

	private grow(): void {
		const n = this.t.length * 2;
		const copy = (a: Float64Array) => {
			const b = new Float64Array(n);
			b.set(a);
			return b;
		};
		this.t = copy(this.t);
		this.x = copy(this.x);
		this.phi = copy(this.phi);
		this.param = copy(this.param);
		this.rate = copy(this.rate);
	}
}

/** Separaciones máximas entre muestras guardadas. */
export const SAMPLE_SPACING = { dPhi: 0.02, dRadiusRel: 0.01, dT: 1 } as const;

export function shouldStoreSample(
	buffer: SampleBuffer,
	t: number,
	x: number,
	phi: number
): boolean {
	const i = buffer.count - 1;
	if (i < 0) return true;
	const x0 = buffer.x[i] as number;
	return (
		Math.abs(phi - (buffer.phi[i] as number)) >= SAMPLE_SPACING.dPhi ||
		Math.abs(x - x0) >= SAMPLE_SPACING.dRadiusRel * x0 ||
		t - (buffer.t[i] as number) >= SAMPLE_SPACING.dT
	);
}

export function buildTrajectory(input: {
	model: BodyModel;
	kind: GeodesicKind;
	constants: GeodesicConstants | null;
	newtonInvariants: { energy: number; angularMomentum: number } | null;
	buffer: SampleBuffer;
	status: TerminalStatus;
	turningPoints: TurningPoint[];
	diagnostics: IntegrationDiagnostics;
}): Trajectory {
	const { buffer: b } = input;
	const n = b.count;
	return {
		model: input.model,
		kind: input.kind,
		constants: input.constants,
		newtonInvariants: input.newtonInvariants,
		count: n,
		ageCoordinateTime: b.t.slice(0, n),
		radiusRs: b.x.slice(0, n),
		azimuthRad: b.phi.slice(0, n),
		parameter: b.param.slice(0, n),
		radialRate: b.rate.slice(0, n),
		status: input.status,
		turningPoints: input.turningPoints,
		diagnostics: input.diagnostics
	};
}

/** Duración en T de la trayectoria calculada. */
export function trajectoryDuration(traj: Trajectory): number {
	return traj.count > 0 ? (traj.ageCoordinateTime[traj.count - 1] as number) : 0;
}

/**
 * Índice i tal que t[i] ≤ age < t[i+1] (búsqueda binaria). Devuelve -1 si age < t[0].
 */
export function findSampleIndex(traj: Trajectory, age: number): number {
	const t = traj.ageCoordinateTime;
	let lo = 0;
	let hi = traj.count - 1;
	if (hi < 0 || age < (t[0] as number)) return -1;
	if (age >= (t[hi] as number)) return hi;
	while (hi - lo > 1) {
		const mid = (lo + hi) >> 1;
		if ((t[mid] as number) <= age) lo = mid;
		else hi = mid;
	}
	return lo;
}

/**
 * Interpola x, φ (sin envolver), λ y tasa radial en una edad T común.
 * Más allá del final devuelve el último punto con ended = true.
 */
export function sampleTrajectory(traj: Trajectory, age: number): TrajectoryPoint {
	const n = traj.count;
	if (n === 0) throw new Error('Trayectoria vacía');
	const i = findSampleIndex(traj, Math.max(0, age));
	const last = n - 1;
	if (i >= last || i < 0) {
		const k = i < 0 ? 0 : last;
		return {
			ageCoordinateTime: traj.ageCoordinateTime[k] as number,
			radiusRs: traj.radiusRs[k] as number,
			azimuthRad: traj.azimuthRad[k] as number,
			parameter: traj.parameter[k] as number,
			radialRate: traj.radialRate[k] as number,
			ended: i >= last && age > (traj.ageCoordinateTime[last] as number)
		};
	}
	const t0 = traj.ageCoordinateTime[i] as number;
	const t1 = traj.ageCoordinateTime[i + 1] as number;
	const s = t1 > t0 ? (age - t0) / (t1 - t0) : 0;
	const lerp = (a: Float64Array) =>
		(a[i] as number) + s * ((a[i + 1] as number) - (a[i] as number));
	return {
		ageCoordinateTime: age,
		radiusRs: lerp(traj.radiusRs),
		azimuthRad: lerp(traj.azimuthRad),
		parameter: lerp(traj.parameter),
		radialRate: lerp(traj.radialRate),
		ended: false
	};
}
