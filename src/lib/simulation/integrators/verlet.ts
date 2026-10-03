import { CAPTURE_CUTOFF_RS } from '../../physics/constants';
import { newtonAcceleration, newtonAngularMomentum, newtonEnergy } from '../../physics/newtonian';
import type { NewtonState } from '../../physics/types';
import { SampleBuffer, buildTrajectory, shouldStoreSample } from '../trajectory';
import type {
	IntegrationDiagnostics,
	TerminalStatus,
	TerminationReason,
	Trajectory,
	TurningPoint
} from '../types';

/**
 * Velocity Verlet de paso fijo en T para el modelo newtoniano (docs/05).
 * La captura en R ≤ cutoff es una frontera impuesta para comparar con el agujero negro.
 */
export interface VerletOptions {
	/** Paso fijo en T. */
	step: number;
	maxSteps: number;
	maxCoordinateTime: number;
	captureRadius: number;
	captureTolerance: number;
	exitRadius: number;
	/** Error relativo de energía a partir del cual se declara error numérico. */
	energyErrorLimit: number;
}

export const VERLET_DEFAULTS: VerletOptions = {
	step: 0.01,
	maxSteps: 400_000,
	maxCoordinateTime: 2000,
	captureRadius: CAPTURE_CUTOFF_RS,
	captureTolerance: 1e-5,
	exitRadius: 30,
	energyErrorLimit: 1e-2
};

interface Kinematics {
	x: number;
	y: number;
	vx: number;
	vy: number;
	ax: number;
	ay: number;
}

export class VerletIntegrator {
	readonly options: VerletOptions;
	private s: Kinematics;
	private t = 0;
	/** φ continuo (sin envolver) obtenido siguiendo atan2. */
	private phi: number;
	private readonly buffer = new SampleBuffer();
	private readonly turningPoints: TurningPoint[] = [];
	private readonly e0: number;
	private readonly l0: number;
	private readonly energyScale: number;
	private readonly angularScale: number;
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

	constructor(initial: NewtonState, options: Partial<VerletOptions> = {}) {
		this.options = { ...VERLET_DEFAULTS, ...options };
		const r0 = Math.hypot(initial.xRs, initial.yRs);
		if (!(r0 > this.options.captureRadius)) {
			throw new RangeError('El estado inicial debe estar fuera de la frontera de captura');
		}
		const a = newtonAcceleration(initial.xRs, initial.yRs);
		this.s = {
			x: initial.xRs,
			y: initial.yRs,
			vx: initial.vxC,
			vy: initial.vyC,
			ax: a.ax,
			ay: a.ay
		};
		this.phi = Math.atan2(initial.yRs, initial.xRs);
		this.e0 = newtonEnergy(initial);
		this.l0 = newtonAngularMomentum(initial);
		const v0 = Math.hypot(initial.vxC, initial.vyC);
		// Escalas no singulares: E ≈ 0 o L = 0 no dividen por cero.
		this.energyScale = Math.max(Math.abs(this.e0), 0.5 * v0 * v0, 1 / (2 * r0));
		this.angularScale = Math.max(Math.abs(this.l0), r0 * v0, 1e-12);
		this.store();
	}

	get done(): boolean {
		return this.status !== null;
	}

	currentState(): NewtonState {
		return { xRs: this.s.x, yRs: this.s.y, vxC: this.s.vx, vyC: this.s.vy, coordinateTime: this.t };
	}

	run(steps: number): boolean {
		for (let i = 0; i < steps && this.status === null; i++) this.advance();
		return this.status !== null;
	}

	cancel(reason: TerminationReason = 'cancelled'): void {
		if (this.status === null) this.finish('budget-exceeded', reason);
	}

	result(): Trajectory {
		if (this.status === null) throw new Error('La integración no ha terminado');
		return buildTrajectory({
			model: 'newtonian',
			kind: 'massive',
			constants: null,
			newtonInvariants: { energy: this.e0, angularMomentum: this.l0 },
			buffer: this.buffer,
			status: this.status,
			turningPoints: this.turningPoints,
			diagnostics: { ...this.diag }
		});
	}

	private radialRate(k: Kinematics): number {
		return (k.x * k.vx + k.y * k.vy) / Math.hypot(k.x, k.y);
	}

	private store(): void {
		const r = Math.hypot(this.s.x, this.s.y);
		this.buffer.push(this.t, r, this.phi, Number.NaN, this.radialRate(this.s));
	}

	private finish(status: TerminalStatus, reason: TerminationReason): void {
		this.status = status;
		this.diag.terminationReason = reason;
		if (this.buffer.lastT() < this.t) this.store();
	}

	/** Un paso de Velocity Verlet de tamaño h desde k. */
	private verlet(k: Kinematics, h: number): Kinematics {
		const x = k.x + k.vx * h + 0.5 * k.ax * h * h;
		const y = k.y + k.vy * h + 0.5 * k.ay * h * h;
		const a = newtonAcceleration(x, y);
		this.diag.derivativeEvaluations++;
		return {
			x,
			y,
			vx: k.vx + 0.5 * (k.ax + a.ax) * h,
			vy: k.vy + 0.5 * (k.ay + a.ay) * h,
			ax: a.ax,
			ay: a.ay
		};
	}

	private advance(): void {
		const o = this.options;
		if (this.diag.acceptedSteps >= o.maxSteps) {
			this.finish('budget-exceeded', 'max-attempts');
			return;
		}
		let h = o.step;
		let next = this.verlet(this.s, h);
		let r = Math.hypot(next.x, next.y);

		// Localización del cruce de la frontera impuesta por bisección del subpaso.
		let captured = false;
		if (r <= o.captureRadius) {
			let lo = 0;
			let hi = h;
			for (let i = 0; i < 60 && hi - lo > 1e-14; i++) {
				const mid = 0.5 * (lo + hi);
				const k = this.verlet(this.s, mid);
				const rm = Math.hypot(k.x, k.y);
				if (rm > o.captureRadius) {
					lo = mid;
					next = k;
					r = rm;
					if (rm - o.captureRadius <= o.captureTolerance) break;
				} else hi = mid;
			}
			h = lo;
			captured = true;
			if (h === 0) {
				this.finish('captured', 'capture-cutoff');
				return;
			}
		}

		if (![next.x, next.y, next.vx, next.vy].every(Number.isFinite)) {
			this.finish('numerical-error', 'non-finite-state');
			return;
		}

		const prevRate = this.radialRate(this.s);
		const prevPhi = this.phi;
		let dphi = Math.atan2(next.y, next.x) - Math.atan2(this.s.y, this.s.x);
		if (dphi > Math.PI) dphi -= 2 * Math.PI;
		else if (dphi < -Math.PI) dphi += 2 * Math.PI;
		const prevT = this.t;
		const prevR = Math.hypot(this.s.x, this.s.y);

		this.s = next;
		this.t += h;
		this.phi += dphi;
		this.diag.acceptedSteps++;
		this.diag.lastStep = h;

		const state = this.currentState();
		const eErr = Math.abs(newtonEnergy(state) - this.e0) / this.energyScale;
		const lErr = Math.abs(newtonAngularMomentum(state) - this.l0) / this.angularScale;
		if (eErr > this.diag.maxConstraintResidual) this.diag.maxConstraintResidual = eErr;
		if (lErr > this.diag.maxAngularMomentumError) this.diag.maxAngularMomentumError = lErr;

		const rate = this.radialRate(next);
		this.detectTurningPoint(prevRate, rate, prevT, prevR, prevPhi, r);

		if (captured) {
			this.finish('captured', 'capture-cutoff');
			return;
		}
		if (eErr > o.energyErrorLimit) {
			this.finish('numerical-error', 'constraint-drift');
			return;
		}
		if (shouldStoreSample(this.buffer, this.t, r, this.phi)) this.store();
		// Kepler: con E_N ≥ 0 y movimiento saliente no hay retorno.
		if (r >= o.exitRadius && rate > 0 && newtonEnergy(state) >= 0) {
			this.finish('escaped', 'escape-confirmed');
			return;
		}
		if (this.t >= o.maxCoordinateTime) this.finish('budget-exceeded', 'max-coordinate-time');
	}

	private detectTurningPoint(
		prevRate: number,
		rate: number,
		prevT: number,
		prevR: number,
		prevPhi: number,
		r: number
	): void {
		const toPeri = prevRate < 0 && rate >= 0;
		const toApo = prevRate > 0 && rate <= 0;
		if (!toPeri && !toApo) return;
		// Ignora oscilaciones de redondeo en una circular exacta.
		if (Math.abs(prevRate - rate) < 1e-9) return;
		const s = prevRate / (prevRate - rate);
		this.turningPoints.push({
			type: toPeri ? 'pericenter' : 'apocenter',
			ageCoordinateTime: prevT + s * (this.t - prevT),
			radiusRs: prevR + s * (r - prevR),
			azimuthRad: prevPhi + s * (this.phi - prevPhi)
		});
	}
}
