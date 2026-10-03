import { describe, expect, it } from 'vitest';
import {
	CLOCK_STEP_SECONDS,
	LabEngine,
	MAX_MASSIVE_LAUNCHES,
	MAX_PHOTONS,
	ORBIT_T_PER_SECOND,
	type FrameScheduler
} from '../../src/lib/simulation/engine';
import { massiveFromLocal, photonFromImpact } from '../../src/lib/physics/initialConditions';
import { GeodesicIntegrator } from '../../src/lib/simulation/integrators/rk4';
import { TrajectoryJobRunner, type JobClock } from '../../src/lib/simulation/scheduler';
import type { Trajectory } from '../../src/lib/simulation/types';

/** Planificador manual: los frames solo ocurren cuando el test los dispara. */
class ManualFrames implements FrameScheduler {
	pending = new Map<number, (now: number) => void>();
	private id = 0;
	requests = 0;
	request(cb: (now: number) => void): number {
		this.requests++;
		this.pending.set(++this.id, cb);
		return this.id;
	}
	cancel(id: number): void {
		this.pending.delete(id);
	}
	flush(now: number): void {
		const callbacks = [...this.pending.values()];
		this.pending.clear();
		for (const cb of callbacks) cb(now);
	}
	/** Simula `seconds` de reproducción en frames de 1/60 s desde `start` ms. */
	run(startMs: number, seconds: number, fps = 60): number {
		let t = startMs;
		const frames = Math.round(seconds * fps);
		for (let i = 0; i <= frames; i++) {
			this.flush(t);
			t += 1000 / fps;
		}
		return t;
	}
}

function makeEngine(x = 4) {
	const frames = new ManualFrames();
	const engine = new LabEngine({ frames, observerRadiusRs: x });
	return { frames, engine };
}

function trajectory(kind: 'massive' | 'photon' = 'massive'): Trajectory {
	const launch =
		kind === 'massive'
			? massiveFromLocal({
					radiusRs: 6,
					azimuthRad: 0,
					speedLocalC: 0.3,
					directionRad: Math.PI / 2
				})
			: photonFromImpact(12, Math.PI, 3);
	if (!launch.ok) throw new Error(launch.code);
	const integrator = new GeodesicIntegrator(launch.value.constants, launch.value.state, {
		maxCoordinateTime: 100
	});
	integrator.run(1e9);
	return integrator.result();
}

describe('transporte y bucle único', () => {
	it('arranca en pausa y play repetido no crea un segundo frame pendiente', () => {
		const { engine, frames } = makeEngine();
		expect(engine.getSnapshot().transport).toBe('paused');
		engine.play();
		engine.play();
		engine.play();
		expect(frames.pending.size).toBe(1);
		engine.pause();
		engine.pause();
		expect(engine.getSnapshot().transport).toBe('paused');
	});

	it('los relojes acumulan q·dt con x fijo', () => {
		const { engine, frames } = makeEngine(4);
		engine.play();
		frames.run(0, 2);
		const s = engine.getSnapshot();
		expect(s.referenceSeconds).toBeCloseTo(2, 6);
		expect(s.localSeconds / s.referenceSeconds).toBeCloseTo(Math.sqrt(0.75), 12);
	});

	it('pausado no avanza aunque pasen frames ni tiempo', () => {
		const { engine, frames } = makeEngine();
		engine.play();
		const t = frames.run(0, 1);
		engine.pause();
		const before = engine.getSnapshot();
		engine.invalidate();
		frames.flush(t + 600_000);
		expect(engine.getSnapshot().referenceSeconds).toBe(before.referenceSeconds);
		// Volver tras 10 minutos: no se acumula el tiempo oculto.
		engine.play();
		frames.flush(t + 600_000);
		frames.flush(t + 600_000 + 1000 / 60);
		expect(engine.getSnapshot().referenceSeconds - before.referenceSeconds).toBeLessThan(0.02);
	});

	it('un frame largo se limita a 0,05 s', () => {
		const { engine, frames } = makeEngine();
		engine.play();
		frames.flush(0);
		frames.flush(5000);
		expect(engine.getSnapshot().referenceSeconds).toBeCloseTo(0.05, 12);
	});

	it('paso manual solo en pausa y con intervalos explícitos', () => {
		const { engine } = makeEngine(4);
		engine.step();
		expect(engine.getSnapshot().referenceSeconds).toBeCloseTo(CLOCK_STEP_SECONDS, 12);
		expect(engine.getSnapshot().localSeconds).toBeCloseTo(CLOCK_STEP_SECONDS * Math.sqrt(0.75), 12);
		engine.play();
		engine.step();
		expect(engine.getSnapshot().referenceSeconds).toBeCloseTo(CLOCK_STEP_SECONDS, 12);
		engine.pause();
		engine.setExperiment('orbits');
		engine.step();
		expect(engine.getSnapshot().coordinateTime).toBeCloseTo(0.1, 12);
	});

	it('mover x con relojes activos integra la razón variable', () => {
		const { engine, frames } = makeEngine(4);
		engine.play();
		let t = frames.run(0, 1);
		engine.setObserverRadius(1.1);
		t = frames.run(t, 1);
		const s = engine.getSnapshot();
		const expected = Math.sqrt(0.75) * 1 + Math.sqrt(1 - 1 / 1.1) * 1;
		expect(s.localSeconds).toBeCloseTo(expected, 1);
		expect(s.referenceSeconds).toBeCloseTo(2, 1);
		void t;
	});

	it('reset conserva parámetros y limpia tiempos; masa nueva reinicia todo', () => {
		const { engine, frames } = makeEngine(2);
		engine.play();
		frames.run(0, 1);
		engine.reset();
		const s = engine.getSnapshot();
		expect(s.referenceSeconds).toBe(0);
		expect(s.clockRate).toBeCloseTo(Math.sqrt(0.5), 12);
		expect(s.transport).toBe('paused');
		engine.setExperiment('orbits');
		engine.launch([trajectory()]);
		engine.restartPhysics();
		expect(engine.getSnapshot().bodies.length).toBe(0);
	});

	it('la velocidad de reproducción no altera la razón de relojes', () => {
		const { engine, frames } = makeEngine(3);
		engine.setSpeed(4);
		engine.play();
		frames.run(0, 1);
		const s = engine.getSnapshot();
		expect(s.referenceSeconds).toBeCloseTo(4, 6);
		expect(s.localSeconds / s.referenceSeconds).toBeCloseTo(Math.sqrt(2 / 3), 12);
		expect(() => engine.setSpeed(10)).toThrow(RangeError);
	});

	it('rechaza un observador dentro del horizonte', () => {
		const { engine } = makeEngine();
		expect(() => engine.setObserverRadius(1)).toThrow(RangeError);
		expect(() => engine.setObserverRadius(Number.NaN)).toThrow(RangeError);
	});

	it('destroy es idempotente y cancela el frame pendiente', () => {
		const { engine, frames } = makeEngine();
		let calls = 0;
		engine.subscribe(() => calls++);
		engine.play();
		engine.destroy();
		engine.destroy();
		expect(frames.pending.size).toBe(0);
		const before = calls;
		engine.play();
		frames.flush(100);
		expect(calls).toBe(before);
	});

	it('los snapshots se emiten a ~10 Hz, no por frame', () => {
		const { engine, frames } = makeEngine();
		let snapshots = 0;
		let renders = 0;
		engine.subscribe(() => snapshots++);
		engine.onFrame(() => renders++);
		engine.play();
		snapshots = 0;
		renders = 0;
		frames.run(0, 2);
		expect(renders).toBeGreaterThan(100);
		expect(snapshots).toBeLessThanOrEqual(22);
	});
});

describe('cuerpos sobre una T común', () => {
	it('anima en T global con 20 rs/c por segundo y lee tiempo propio solo en masivas', () => {
		const { engine, frames } = makeEngine();
		engine.setExperiment('orbits');
		engine.launch([trajectory('massive')]);
		engine.play();
		frames.run(0, 1);
		const s = engine.getSnapshot();
		expect(s.coordinateTime).toBeCloseTo(ORBIT_T_PER_SECOND, 4);
		const body = s.bodies[0]!;
		expect(body.properTime).not.toBeNull();
		expect(body.properTime!).toBeLessThan(body.ageCoordinateTime);
		expect(body.localSpeedC!).toBeLessThan(1);

		engine.setExperiment('photons');
		engine.launch([trajectory('photon')]);
		const photon = engine.getSnapshot().bodies[0]!;
		expect(photon.properTime).toBeNull();
		expect(photon.localSpeedC!).toBeCloseTo(1, 9);
	});

	it('los nuevos cuerpos se añaden en el T actual y reset los devuelve a T = 0', () => {
		const { engine } = makeEngine();
		engine.setExperiment('orbits');
		for (let i = 0; i < 5; i++) engine.step();
		engine.launch([trajectory()]);
		expect(engine.getFrameState().bodies[0]!.spawnCoordinateTime).toBeCloseTo(0.5, 12);
		expect(engine.getSnapshot().bodies[0]!.ageCoordinateTime).toBe(0);
		engine.reset();
		expect(engine.getFrameState().bodies[0]!.spawnCoordinateTime).toBe(0);
	});

	it('respeta los límites de 8 lanzamientos masivos y 12 fotones', () => {
		const { engine } = makeEngine();
		engine.setExperiment('orbits');
		const t = trajectory();
		for (let i = 0; i < MAX_MASSIVE_LAUNCHES; i++) expect(engine.launch([t, t])).not.toBeNull();
		expect(engine.launch([t])).toBeNull();
		expect(engine.getSnapshot().massiveLaunches).toBe(MAX_MASSIVE_LAUNCHES);
		engine.removeOldest('massive');
		expect(engine.getSnapshot().massiveLaunches).toBe(MAX_MASSIVE_LAUNCHES - 1);
		expect(engine.getSnapshot().bodies.length).toBe(2 * (MAX_MASSIVE_LAUNCHES - 1));
		engine.setExperiment('photons');
		const p = trajectory('photon');
		for (let i = 0; i < MAX_PHOTONS; i++) expect(engine.launch([p])).not.toBeNull();
		expect(engine.launch([p])).toBeNull();
	});

	it('el estado del cuerpo pasa a terminal al acabar su trayectoria', () => {
		const { engine } = makeEngine();
		engine.setExperiment('photons');
		const t = trajectory('photon');
		engine.launch([t]);
		expect(engine.getSnapshot().bodies[0]!.status).toBe('active');
		for (let i = 0; i < 1000; i++) engine.step();
		expect(engine.getSnapshot().bodies[0]!.status).toBe(t.status);
	});
});

describe('jobs cancelables', () => {
	function fakeClock(): JobClock & { t: number } {
		const clock = {
			t: 0,
			now: () => clock.t,
			yieldToHost: async () => {
				clock.t += 1;
			}
		};
		return clock;
	}
	const spec = () => {
		const launch = massiveFromLocal({
			radiusRs: 6,
			azimuthRad: 0,
			speedLocalC: 0.3,
			directionRad: Math.PI / 2
		});
		if (!launch.ok) throw new Error();
		return { model: 'schwarzschild' as const, launch: launch.value };
	};

	it('un job obsoleto no entrega resultados', async () => {
		const clock = fakeClock();
		// Cada fragmento consume 5 ms simulados ⇒ cede el control tras cada uno.
		const runner = new TrajectoryJobRunner({ ...clock, now: () => (clock.t += 5) }, 4, 1e9, 16);
		const first = runner.compute([spec()]);
		const second = runner.compute([spec()]);
		expect((await first).status).toBe('stale');
		const out = await second;
		expect(out.status).toBe('done');
	});

	it('agotar el presupuesto de pared deja la trayectoria parcial como budget-exceeded', async () => {
		const clock = fakeClock();
		const runner = new TrajectoryJobRunner({ ...clock, now: () => (clock.t += 1) }, 4, 20, 16);
		const out = await runner.compute([spec()]);
		expect(out.status).toBe('done');
		if (out.status === 'done') {
			expect(out.trajectories[0]!.status).toBe('budget-exceeded');
			expect(out.trajectories[0]!.count).toBeGreaterThan(1);
		}
	});

	it('cancelAll invalida el job en curso', async () => {
		const clock = fakeClock();
		const runner = new TrajectoryJobRunner({ ...clock, now: () => (clock.t += 5) }, 4, 1e9, 16);
		const job = runner.compute([spec()]);
		runner.cancelAll();
		expect((await job).status).toBe('stale');
	});
});
