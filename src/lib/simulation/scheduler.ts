import type { GeodesicLaunch } from '../physics/initialConditions';
import type { NewtonState } from '../physics/types';
import { GeodesicIntegrator, type GeodesicIntegratorOptions } from './integrators/rk4';
import { VerletIntegrator, type VerletOptions } from './integrators/verlet';
import type { Trajectory } from './types';

/** Reloj de pared y cesión de control inyectables (tests sin navegador). */
export interface JobClock {
	/** Milisegundos monotónicos. */
	now(): number;
	/** Cede el hilo principal entre fragmentos de cálculo. */
	yieldToHost(): Promise<void>;
}

export type TrajectorySpec =
	| {
			model: 'schwarzschild';
			launch: GeodesicLaunch;
			options?: Partial<GeodesicIntegratorOptions>;
	  }
	| { model: 'newtonian'; state: NewtonState; options?: Partial<VerletOptions> };

export type JobOutcome = { status: 'done'; trajectories: Trajectory[] } | { status: 'stale' };

interface Integrator {
	readonly done: boolean;
	run(n: number): boolean;
	cancel(): void;
	result(): Trajectory;
}

function createIntegrator(spec: TrajectorySpec): Integrator {
	return spec.model === 'schwarzschild'
		? new GeodesicIntegrator(spec.launch.constants, spec.launch.state, spec.options)
		: new VerletIntegrator(spec.state, spec.options);
}

/**
 * Precálculo incremental y cancelable (docs/05): fragmentos de ~4 ms con cesión entre ellos.
 * Cada `compute` invalida los anteriores mediante un generation id; un job obsoleto nunca
 * entrega resultados.
 */
export class TrajectoryJobRunner {
	private generation = 0;

	constructor(
		private readonly clock: JobClock,
		private readonly sliceMs = 4,
		/** Presupuesto de pared por job; al agotarlo las trayectorias quedan parciales. */
		private readonly wallBudgetMs = 4000,
		private readonly chunk = 64
	) {}

	/** Invalida cualquier job en curso. */
	cancelAll(): void {
		this.generation++;
	}

	async compute(specs: TrajectorySpec[]): Promise<JobOutcome> {
		const generation = ++this.generation;
		const integrators = specs.map(createIntegrator);
		const start = this.clock.now();
		let sliceStart = start;
		for (;;) {
			let pending = false;
			for (const integrator of integrators) {
				if (!integrator.done) {
					integrator.run(this.chunk);
					pending ||= !integrator.done;
				}
			}
			if (!pending) break;
			const now = this.clock.now();
			if (now - start > this.wallBudgetMs) {
				for (const integrator of integrators) integrator.cancel();
				break;
			}
			if (now - sliceStart >= this.sliceMs) {
				await this.clock.yieldToHost();
				if (generation !== this.generation) return { status: 'stale' };
				sliceStart = this.clock.now();
			}
		}
		if (generation !== this.generation) return { status: 'stale' };
		return { status: 'done', trajectories: integrators.map((i) => i.result()) };
	}
}
