import {
	GEODESIC_DIMENSION,
	IDX_PHI,
	IDX_T,
	IDX_V,
	IDX_X,
	geodesicDerivatives,
	normalizedConstraintResidual
} from '../../physics/geodesics';
import {
	massiveEscapeGuaranteed,
	photonEscapeGuaranteed,
	radialAcceleration
} from '../../physics/schwarzschild';
import { CAPTURE_CUTOFF_RS } from '../../physics/constants';
import type { GeodesicConstants, GeodesicState } from '../../physics/types';
import { SampleBuffer, buildTrajectory, shouldStoreSample } from '../trajectory';
import type {
	IntegrationDiagnostics,
	TerminalStatus,
	TerminationReason,
	Trajectory,
	TurningPoint
} from '../types';

/**
 * RK4 adaptativo con step doubling (docs/05). Integra en λ y acumula T.
 * Tolerancias por defecto: atol 1e−9, rtol 1e−8, h ∈ [1e−8, 0.1].
 */
export interface GeodesicIntegratorOptions {
	atol: number;
	rtol: number;
	hInitial: number;
	hMax: number;
	hMin: number;
	/** Pasos aceptados + rechazados. */
	maxAttempts: number;
	/** 12 evaluaciones por intento de step doubling: 200000 × 12. */
	maxDerivativeEvaluations: number;
	/** T máximo desde el lanzamiento: 2000 masivas, 400 fotones. */
	maxCoordinateTime: number;
	captureRadius: number;
	/** Tolerancia radial para localizar el cutoff. */
	captureTolerance: number;
	/** Radio exterior de fin de cálculo para trayectorias salientes confirmadas. */
	exitRadius: number;
	/** Residual normalizado a partir del cual se declara error numérico. */
	residualLimit: number;
	/** Límites geométricos del paso (criterios numéricos, no fuerzas). */
	maxRadialFraction: number;
	maxAzimuthStep: number;
}

export const MASSIVE_DEFAULTS: GeodesicIntegratorOptions = {
	atol: 1e-9,
	rtol: 1e-8,
	hInitial: 0.01,
	hMax: 0.1,
	hMin: 1e-8,
	maxAttempts: 200_000,
	maxDerivativeEvaluations: 2_400_000,
	maxCoordinateTime: 2000,
	captureRadius: CAPTURE_CUTOFF_RS,
	captureTolerance: 1e-5,
	exitRadius: 30,
	residualLimit: 1e-4,
	maxRadialFraction: 0.05,
	maxAzimuthStep: 0.03
};

export const PHOTON_DEFAULTS: GeodesicIntegratorOptions = {
	...MASSIVE_DEFAULTS,
	maxCoordinateTime: 400,
	exitRadius: 24
};

const SAFETY = 0.9;
const GROW_MAX = 2;
const SHRINK_MIN = 0.2;
/** |dv/dλ| mínimo para considerar un cambio de signo de v como punto de retorno real. */
const TURNING_ACCEL_MIN = 1e-10;

type Vec = Float64Array;
type StageResult = 0 | 1 | 2;
const STAGE_OK = 0;
const STAGE_CROSSED = 1;
const STAGE_NON_FINITE = 2;

export class GeodesicIntegrator {
	readonly options: GeodesicIntegratorOptions;
	readonly constants: GeodesicConstants;
	private y: Vec = new Float64Array(GEODESIC_DIMENSION);
	private lambda = 0;
	private h: number;
	private readonly buffer = new SampleBuffer();
	private readonly turningPoints: TurningPoint[] = [];
	private readonly diag: IntegrationDiagnostics = {
		acceptedSteps: 0,
		rejectedSteps: 0,
		derivativeEvaluations: 0,
		maxConstraintResidual: 0,
		maxAngularMomentumError: 0,
		lastStep: 0,
		terminationReason: 'cancelled'
	};
	private status: TerminalStatus | null = null;

	// Buffers de trabajo reutilizados: sin asignaciones por paso.
	private readonly k1 = new Float64Array(GEODESIC_DIMENSION);
	private readonly k2 = new Float64Array(GEODESIC_DIMENSION);
	private readonly k3 = new Float64Array(GEODESIC_DIMENSION);
	private readonly k4 = new Float64Array(GEODESIC_DIMENSION);
	private readonly tmp = new Float64Array(GEODESIC_DIMENSION);
	private readonly full = new Float64Array(GEODESIC_DIMENSION);
	private readonly half = new Float64Array(GEODESIC_DIMENSION);
	private readonly fine = new Float64Array(GEODESIC_DIMENSION);
	private readonly probe = new Float64Array(GEODESIC_DIMENSION);

	constructor(
		constants: GeodesicConstants,
		initial: GeodesicState,
		options: Partial<GeodesicIntegratorOptions> = {}
	) {
		const base = constants.kind === 'photon' ? PHOTON_DEFAULTS : MASSIVE_DEFAULTS;
		this.options = { ...base, ...options };
		this.constants = constants;
		this.y[IDX_X] = initial.radiusRs;
		this.y[IDX_V] = initial.radialDerivative;
		this.y[IDX_PHI] = initial.azimuthRad;
		this.y[IDX_T] = 0;
		this.lambda = 0;
		this.h = this.options.hInitial;
		if (!(initial.radiusRs > this.options.captureRadius)) {
			throw new RangeError('El estado inicial debe estar fuera del cutoff de captura');
		}
		this.storeSample();
	}

	get done(): boolean {
		return this.status !== null;
	}

	/** Estado actual (copia), útil para tests y diagnóstico. */
	currentState(): GeodesicState {
		return {
			radiusRs: this.y[IDX_X] as number,
			radialDerivative: this.y[IDX_V] as number,
			azimuthRad: this.y[IDX_PHI] as number,
			coordinateTime: this.y[IDX_T] as number,
			parameter: this.lambda
		};
	}

	/** Avanza como máximo `attempts` intentos. Devuelve true al terminar. */
	run(attempts: number): boolean {
		for (let i = 0; i < attempts && this.status === null; i++) this.attempt();
		return this.status !== null;
	}

	/** Detiene por cancelación externa (presupuesto de pared o job obsoleto). */
	cancel(reason: TerminationReason = 'cancelled'): void {
		if (this.status === null) this.finish('budget-exceeded', reason);
	}

	result(): Trajectory {
		if (this.status === null) throw new Error('La integración no ha terminado');
		return buildTrajectory({
			model: 'schwarzschild',
			kind: this.constants.kind,
			constants: this.constants,
			newtonInvariants: null,
			buffer: this.buffer,
			status: this.status,
			turningPoints: this.turningPoints,
			diagnostics: { ...this.diag }
		});
	}

	private finish(status: TerminalStatus, reason: TerminationReason): void {
		this.status = status;
		this.diag.terminationReason = reason;
		// La última muestra siempre se conserva para cerrar la curva en el evento.
		if (this.buffer.lastT() < (this.y[IDX_T] as number)) this.storeSample();
	}

	private storeSample(): void {
		this.buffer.push(
			this.y[IDX_T] as number,
			this.y[IDX_X] as number,
			this.y[IDX_PHI] as number,
			this.lambda,
			this.y[IDX_V] as number
		);
	}

	/**
	 * Un paso RK4 clásico de tamaño h desde `from` hacia `out`.
	 * Devuelve STAGE_CROSSED si cualquier etapa toca x ≤ cutoff (no se evalúan derivadas ahí)
	 * y STAGE_NON_FINITE si aparece un valor no finito: nunca se confunden.
	 */
	private rk4(from: Vec, h: number, out: Vec): StageResult {
		const { k1, k2, k3, k4, tmp, constants } = this;
		geodesicDerivatives(from, constants, k1);
		for (let i = 0; i < GEODESIC_DIMENSION; i++)
			tmp[i] = (from[i] as number) + 0.5 * h * (k1[i] as number);
		let check = this.checkStage(tmp);
		if (check !== STAGE_OK) return check;
		geodesicDerivatives(tmp, constants, k2);
		for (let i = 0; i < GEODESIC_DIMENSION; i++)
			tmp[i] = (from[i] as number) + 0.5 * h * (k2[i] as number);
		check = this.checkStage(tmp);
		if (check !== STAGE_OK) return check;
		geodesicDerivatives(tmp, constants, k3);
		for (let i = 0; i < GEODESIC_DIMENSION; i++)
			tmp[i] = (from[i] as number) + h * (k3[i] as number);
		check = this.checkStage(tmp);
		if (check !== STAGE_OK) return check;
		geodesicDerivatives(tmp, constants, k4);
		for (let i = 0; i < GEODESIC_DIMENSION; i++) {
			out[i] =
				(from[i] as number) +
				(h / 6) *
					((k1[i] as number) + 2 * (k2[i] as number) + 2 * (k3[i] as number) + (k4[i] as number));
		}
		return this.checkStage(out);
	}

	private checkStage(y: Vec): StageResult {
		for (let i = 0; i < GEODESIC_DIMENSION; i++) {
			if (!Number.isFinite(y[i] as number)) return STAGE_NON_FINITE;
		}
		return (y[IDX_X] as number) > this.options.captureRadius ? STAGE_OK : STAGE_CROSSED;
	}

	private limitStep(h: number): number {
		const o = this.options;
		const x = this.y[IDX_X] as number;
		const v = this.y[IDX_V] as number;
		const l = Math.abs(this.constants.angularMomentum);
		let limited = Math.min(h, o.hMax);
		limited = Math.min(limited, (o.maxRadialFraction * x) / Math.max(Math.abs(v), 1e-12));
		if (l > 0) limited = Math.min(limited, (o.maxAzimuthStep * x * x) / l);
		// Aproximación al cutoff: no saltar más del 90 % de la distancia restante.
		if (v < 0) {
			const gap = x - o.captureRadius;
			limited = Math.min(limited, Math.max((0.9 * gap) / -v, o.hMin));
		}
		return Math.max(limited, o.hMin);
	}

	private attempt(): void {
		const o = this.options;
		const d = this.diag;
		if (d.acceptedSteps + d.rejectedSteps >= o.maxAttempts) {
			this.finish('budget-exceeded', 'max-attempts');
			return;
		}
		if (d.derivativeEvaluations + 12 > o.maxDerivativeEvaluations) {
			this.finish('budget-exceeded', 'max-derivative-evaluations');
			return;
		}

		const h = this.limitStep(this.h);
		const { y, full, half, fine } = this;
		d.derivativeEvaluations += 12;

		let stage = this.rk4(y, h, full);
		if (stage === STAGE_OK) stage = this.rk4(y, h / 2, half);
		if (stage === STAGE_OK) stage = this.rk4(half, h / 2, fine);
		if (stage === STAGE_NON_FINITE) {
			this.finish('numerical-error', 'non-finite-state');
			return;
		}
		if (stage === STAGE_CROSSED) {
			// Un candidato cruza el cutoff: reducir y volver a intentar desde el estado aceptado.
			d.rejectedSteps++;
			this.h = h * 0.5;
			if (this.h < o.hMin) this.finish('captured', 'capture-cutoff');
			return;
		}

		let err = 0;
		for (let i = 0; i < GEODESIC_DIMENSION; i++) {
			const yi = y[i] as number;
			const fi = fine[i] as number;
			const scale =
				i === IDX_T
					? o.atol + o.rtol * Math.abs(fi - yi) // escala local del incremento temporal
					: o.atol + o.rtol * Math.max(Math.abs(yi), Math.abs(fi));
			const e = Math.abs(fi - (full[i] as number)) / 15 / scale;
			if (e > err) err = e;
		}

		if (!Number.isFinite(err)) {
			this.finish('numerical-error', 'non-finite-state');
			return;
		}

		if (err > 1) {
			d.rejectedSteps++;
			this.h = h * Math.max(SHRINK_MIN, SAFETY * Math.pow(err, -0.2));
			if (this.h < o.hMin) this.finish('numerical-error', 'step-underflow');
			return;
		}

		// Aceptar el resultado fino (dos medios pasos); ya se comprobó que es finito.
		if (!((fine[IDX_T] as number) > (y[IDX_T] as number))) {
			this.finish('numerical-error', 'time-not-increasing');
			return;
		}

		const vPrev = y[IDX_V] as number;
		this.detectTurningPoint(h, vPrev, fine[IDX_V] as number);

		y.set(fine);
		this.lambda += h;
		d.acceptedSteps++;
		d.lastStep = h;
		this.h = h * (err === 0 ? GROW_MAX : Math.min(GROW_MAX, SAFETY * Math.pow(err, -0.2)));

		const x = y[IDX_X] as number;
		const v = y[IDX_V] as number;
		const residual = normalizedConstraintResidual(x, v, this.constants);
		if (residual > d.maxConstraintResidual) d.maxConstraintResidual = residual;
		if (residual > o.residualLimit) {
			this.storeSample();
			this.finish('numerical-error', 'constraint-drift');
			return;
		}

		if (shouldStoreSample(this.buffer, y[IDX_T] as number, x, y[IDX_PHI] as number)) {
			this.storeSample();
		}

		this.checkTermination(x, v);
	}

	private checkTermination(x: number, v: number): void {
		const o = this.options;
		if (v < 0 && x - o.captureRadius <= o.captureTolerance) {
			this.finish('captured', 'capture-cutoff');
			return;
		}
		if (x >= o.exitRadius && v > 0) {
			const escapes =
				this.constants.kind === 'photon'
					? photonEscapeGuaranteed(x, v)
					: massiveEscapeGuaranteed(x, v, this.constants.energy, this.constants.angularMomentum);
			if (escapes) {
				this.finish('escaped', 'escape-confirmed');
				return;
			}
		}
		if ((this.y[IDX_T] as number) >= o.maxCoordinateTime) {
			this.finish('budget-exceeded', 'max-coordinate-time');
		}
	}

	/**
	 * Cambio de signo de v en un paso aceptado: localiza la raíz con regula falsi usando
	 * pasos RK4 de prueba desde el estado previo. No modifica el estado aceptado.
	 */
	private detectTurningPoint(h: number, vPrev: number, vNext: number): void {
		const toPeri = vPrev < 0 && vNext >= 0;
		const toApo = vPrev > 0 && vNext <= 0;
		if (!toPeri && !toApo) return;
		const x = this.y[IDX_X] as number;
		const accel = radialAcceleration(x, this.constants.angularMomentum, this.constants.kappa);
		if (Math.abs(accel) < TURNING_ACCEL_MIN) return; // equilibrio circular: ruido de redondeo

		let a = 0;
		let b = h;
		let va = vPrev;
		let vb = vNext;
		for (let iter = 0; iter < 8; iter++) {
			const s = a + (b - a) * (va / (va - vb));
			if (this.rk4(this.y, s, this.probe) !== STAGE_OK) return;
			this.diag.derivativeEvaluations += 4;
			const vs = this.probe[IDX_V] as number;
			if (Math.abs(vs) < 1e-13) break;
			if (Math.sign(vs) === Math.sign(va)) {
				a = s;
				va = vs;
			} else {
				b = s;
				vb = vs;
			}
		}
		this.turningPoints.push({
			type: toPeri ? 'pericenter' : 'apocenter',
			ageCoordinateTime: this.probe[IDX_T] as number,
			radiusRs: this.probe[IDX_X] as number,
			azimuthRad: this.probe[IDX_PHI] as number
		});
	}
}
