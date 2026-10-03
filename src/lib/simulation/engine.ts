import { staticClockRate } from '../physics/schwarzschild';
import { localVelocity } from '../physics/initialConditions';
import { sampleTrajectory, trajectoryDuration } from './trajectory';
import type { BodyModel, BodyStatus, Trajectory } from './types';
import type { GeodesicKind } from '../physics/types';

export type Experiment = 'clocks' | 'orbits' | 'photons';
export type Transport = 'paused' | 'running';

/** Planificador de frames inyectable: un único requestAnimationFrame en producción. */
export interface FrameScheduler {
	request(callback: (nowMs: number) => void): number;
	cancel(id: number): void;
}

/** Escala de reproducción orbital: 20 rs/c de T por segundo de animación a ×1 (docs/05). */
export const ORBIT_T_PER_SECOND = 20;
/** Clamp de un frame largo (s). */
export const MAX_FRAME_SECONDS = 0.05;
/** Paso manual: 0,1 s didácticos en Relojes, 0,1 T en Órbitas/Fotones. */
export const CLOCK_STEP_SECONDS = 0.1;
export const ORBIT_STEP_T = 0.1;
export const MAX_MASSIVE_LAUNCHES = 8;
export const MAX_PHOTONS = 12;
/** Período de snapshots para la UI (~10 Hz). */
const SNAPSHOT_INTERVAL_MS = 100;

export interface EngineBody {
	id: string;
	/** Identificador del par comparativo (mismo lanzamiento) o null. */
	groupId: string;
	model: BodyModel;
	kind: GeodesicKind;
	/** T global en el lanzamiento. */
	spawnCoordinateTime: number;
	trajectory: Trajectory;
}

export interface BodyReadout {
	id: string;
	groupId: string;
	model: BodyModel;
	kind: GeodesicKind;
	status: BodyStatus;
	/** Edad en T desde el lanzamiento (rs/c). */
	ageCoordinateTime: number;
	radiusRs: number;
	azimuthRad: number;
	/** Tiempo propio S (masivas Schwarzschild); null para fotones y Newton. */
	properTime: number | null;
	/** Rapidez local medida por un observador estático (Schwarzschild). */
	localSpeedC: number | null;
	/** Rapidez coordenada |dX/dT| (Newton). */
	coordinateSpeedC: number | null;
	trajectory: Trajectory;
}

export interface LabSnapshot {
	transport: Transport;
	experiment: Experiment;
	speed: number;
	/** Relojes didácticos (s). */
	referenceSeconds: number;
	localSeconds: number;
	/** q actual del observador. */
	clockRate: number;
	/** T global (rs/c). */
	coordinateTime: number;
	bodies: BodyReadout[];
	massiveLaunches: number;
	photonCount: number;
}

export interface FrameState {
	coordinateTime: number;
	referenceSeconds: number;
	localSeconds: number;
	bodies: readonly EngineBody[];
	/** Fase decorativa (rad) para el disco; sin significado físico. */
	decorationPhase: number;
	transport: Transport;
}

export interface EngineOptions {
	frames: FrameScheduler;
	observerRadiusRs: number;
	experiment?: Experiment;
	speed?: number;
}

/**
 * Motor del laboratorio: un único bucle de frames, transporte, relojes didácticos,
 * T global común y cuerpos con trayectorias precalculadas. No conoce DOM ni Canvas.
 */
export class LabEngine {
	private readonly frames: FrameScheduler;
	private frameId: number | null = null;
	private lastFrameMs: number | null = null;
	private lastSnapshotMs = -Infinity;
	private destroyed = false;

	private transport: Transport = 'paused';
	private experiment: Experiment;
	private speed: number;
	private observerRadiusRs: number;
	private referenceSeconds = 0;
	private localSeconds = 0;
	private coordinateTime = 0;
	private bodies: EngineBody[] = [];
	private nextId = 1;
	private decorationPhase = 0;
	private decorationsEnabled = false;

	private readonly snapshotListeners = new Set<(s: LabSnapshot) => void>();
	private readonly frameListeners = new Set<(s: FrameState) => void>();

	constructor(options: EngineOptions) {
		this.frames = options.frames;
		this.experiment = options.experiment ?? 'clocks';
		this.speed = options.speed ?? 1;
		this.observerRadiusRs = options.observerRadiusRs;
		this.assertObserver(options.observerRadiusRs);
	}

	// ── Configuración ──────────────────────────────────────────────

	/** Cambiar de experimento pausa y reinicia el experimento: no hay motores ocultos. */
	setExperiment(experiment: Experiment): void {
		this.experiment = experiment;
		this.pause();
		this.clearBodies();
		this.resetTimes();
		this.emitSnapshot();
	}

	/** Cambiar el radio no reinicia relojes: el ritmo integrado cambia desde ahora. */
	setObserverRadius(radiusRs: number): void {
		this.assertObserver(radiusRs);
		this.observerRadiusRs = radiusRs;
		this.emitSnapshot();
		this.invalidate();
	}

	setSpeed(speed: number): void {
		if (!(speed >= 0.25 && speed <= 4)) throw new RangeError('speed fuera de [0.25, 4]');
		this.speed = speed;
		this.emitSnapshot();
	}

	/** Decoraciones animadas (disco); se desactivan con movimiento reducido. */
	setDecorations(enabled: boolean): void {
		this.decorationsEnabled = enabled;
	}

	/** Nuevo experimento físico (p. ej. cambio de masa): pausa, limpia cuerpos y tiempos. */
	restartPhysics(): void {
		this.pause();
		this.clearBodies();
		this.resetTimes();
		this.emitSnapshot();
		this.invalidate();
	}

	// ── Transporte ────────────────────────────────────────────────

	play(): void {
		if (this.destroyed || this.transport === 'running') return;
		this.transport = 'running';
		this.lastFrameMs = null;
		this.schedule();
		this.emitSnapshot();
	}

	pause(): void {
		if (this.transport === 'paused') return;
		this.transport = 'paused';
		// Vaciar el acumulador: al reanudar no se suma el tiempo de pausa.
		this.lastFrameMs = null;
		this.emitSnapshot();
		this.invalidate();
	}

	toggle(): void {
		if (this.transport === 'running') this.pause();
		else this.play();
	}

	/** Paso manual explícito; solo en pausa. */
	step(): void {
		if (this.transport !== 'paused') return;
		if (this.experiment === 'clocks') this.advanceClocks(CLOCK_STEP_SECONDS);
		else this.coordinateTime += ORBIT_STEP_T;
		this.emitSnapshot();
		this.invalidate();
	}

	/** Reinicia tiempos; los cuerpos vuelven a su lanzamiento en T = 0. Mantiene parámetros. */
	reset(): void {
		this.pause();
		this.resetTimes();
		for (const body of this.bodies) body.spawnCoordinateTime = 0;
		this.emitSnapshot();
		this.invalidate();
	}

	// ── Cuerpos ───────────────────────────────────────────────────

	get massiveLaunches(): number {
		return new Set(this.bodies.filter((b) => b.kind === 'massive').map((b) => b.groupId)).size;
	}

	get photonCount(): number {
		return this.bodies.filter((b) => b.kind === 'photon').length;
	}

	/**
	 * Añade un lanzamiento (una trayectoria o un par comparativo) en el T actual.
	 * Devuelve los ids, o null si se supera el límite.
	 */
	launch(trajectories: Trajectory[]): string[] | null {
		if (trajectories.length === 0) return [];
		const kind = trajectories[0]!.kind;
		if (kind === 'massive' && this.massiveLaunches >= MAX_MASSIVE_LAUNCHES) return null;
		if (kind === 'photon' && this.photonCount + trajectories.length > MAX_PHOTONS) return null;
		const groupId = `g${this.nextId}`;
		const ids: string[] = [];
		for (const trajectory of trajectories) {
			const id = `b${this.nextId++}`;
			ids.push(id);
			this.bodies.push({
				id,
				groupId,
				model: trajectory.model,
				kind: trajectory.kind,
				spawnCoordinateTime: this.coordinateTime,
				trajectory
			});
		}
		this.emitSnapshot();
		this.invalidate();
		return ids;
	}

	/** Elimina el lanzamiento más antiguo del tipo dado (par completo si es comparativo). */
	removeOldest(kind: GeodesicKind): void {
		const first = this.bodies.find((b) => b.kind === kind);
		if (!first) return;
		this.bodies = this.bodies.filter((b) => b.groupId !== first.groupId);
		this.emitSnapshot();
		this.invalidate();
	}

	clearBodies(): void {
		if (this.bodies.length === 0) return;
		this.bodies = [];
		this.emitSnapshot();
		this.invalidate();
	}

	// ── Lectura ───────────────────────────────────────────────────

	getSnapshot(): LabSnapshot {
		const rate = staticClockRate(this.observerRadiusRs);
		return {
			transport: this.transport,
			experiment: this.experiment,
			speed: this.speed,
			referenceSeconds: this.referenceSeconds,
			localSeconds: this.localSeconds,
			clockRate: rate.ok ? rate.value : Number.NaN,
			coordinateTime: this.coordinateTime,
			bodies: this.bodies.map((b) => this.readBody(b)),
			massiveLaunches: this.massiveLaunches,
			photonCount: this.photonCount
		};
	}

	getFrameState(): FrameState {
		return {
			coordinateTime: this.coordinateTime,
			referenceSeconds: this.referenceSeconds,
			localSeconds: this.localSeconds,
			bodies: this.bodies,
			decorationPhase: this.decorationPhase,
			transport: this.transport
		};
	}

	subscribe(listener: (s: LabSnapshot) => void): () => void {
		this.snapshotListeners.add(listener);
		listener(this.getSnapshot());
		return () => this.snapshotListeners.delete(listener);
	}

	onFrame(listener: (s: FrameState) => void): () => void {
		this.frameListeners.add(listener);
		this.invalidate();
		return () => this.frameListeners.delete(listener);
	}

	/** Solicita un frame de dibujo (render por invalidación cuando está pausado). */
	invalidate(): void {
		this.schedule();
	}

	destroy(): void {
		if (this.destroyed) return;
		this.destroyed = true;
		if (this.frameId !== null) this.frames.cancel(this.frameId);
		this.frameId = null;
		this.transport = 'paused';
		this.snapshotListeners.clear();
		this.frameListeners.clear();
		this.bodies = [];
	}

	// ── Interno ───────────────────────────────────────────────────

	private assertObserver(radiusRs: number): void {
		if (!staticClockRate(radiusRs).ok) {
			throw new RangeError('El observador estático requiere x > 1');
		}
	}

	private resetTimes(): void {
		this.referenceSeconds = 0;
		this.localSeconds = 0;
		this.coordinateTime = 0;
		this.lastFrameMs = null;
	}

	private schedule(): void {
		if (this.destroyed || this.frameId !== null) return;
		this.frameId = this.frames.request((now) => this.tick(now));
	}

	private tick(nowMs: number): void {
		this.frameId = null;
		if (this.destroyed) return;
		if (this.transport === 'running') {
			const dt =
				this.lastFrameMs === null
					? 0
					: Math.min(MAX_FRAME_SECONDS, Math.max(0, (nowMs - this.lastFrameMs) / 1000));
			this.lastFrameMs = nowMs;
			this.advance(dt);
			if (nowMs - this.lastSnapshotMs >= SNAPSHOT_INTERVAL_MS) {
				this.lastSnapshotMs = nowMs;
				this.emitSnapshot();
			}
		}
		const state = this.getFrameState();
		for (const listener of this.frameListeners) listener(state);
		if (this.transport === 'running') this.schedule();
	}

	private advance(dtWall: number): void {
		if (this.experiment === 'clocks') this.advanceClocks(dtWall * this.speed);
		else this.coordinateTime += dtWall * ORBIT_T_PER_SECOND * this.speed;
		if (this.decorationsEnabled) this.decorationPhase += dtWall * 0.12;
	}

	/** Protocolo cuasiestático: local += q(x)·dt con el x vigente en el frame. */
	private advanceClocks(dtDidactic: number): void {
		const rate = staticClockRate(this.observerRadiusRs);
		if (!rate.ok) return;
		this.referenceSeconds += dtDidactic;
		this.localSeconds += rate.value * dtDidactic;
	}

	private emitSnapshot(): void {
		if (this.snapshotListeners.size === 0) return;
		const snapshot = this.getSnapshot();
		for (const listener of this.snapshotListeners) listener(snapshot);
	}

	private readBody(body: EngineBody): BodyReadout {
		const traj = body.trajectory;
		const age = Math.max(0, this.coordinateTime - body.spawnCoordinateTime);
		const point = sampleTrajectory(traj, age);
		const ended = age >= trajectoryDuration(traj);
		const status: BodyStatus = ended ? traj.status : 'active';
		let properTime: number | null = null;
		let localSpeedC: number | null = null;
		let coordinateSpeedC: number | null = null;
		if (traj.model === 'schwarzschild' && traj.constants) {
			if (traj.kind === 'massive') properTime = point.parameter;
			localSpeedC = localVelocity(
				{ radiusRs: point.radiusRs, radialDerivative: point.radialRate },
				traj.constants
			).speedC;
		} else if (traj.model === 'newtonian' && traj.newtonInvariants) {
			// |V|² = 2(E_N + 1/(2R)): E_N se conserva con Verlet dentro de la deriva diagnosticada.
			coordinateSpeedC = Math.sqrt(2 * (traj.newtonInvariants.energy + 1 / (2 * point.radiusRs)));
		}
		return {
			id: body.id,
			groupId: body.groupId,
			model: body.model,
			kind: body.kind,
			status,
			ageCoordinateTime: Math.min(age, trajectoryDuration(traj)),
			radiusRs: point.radiusRs,
			azimuthRad: point.azimuthRad,
			properTime,
			localSpeedC,
			coordinateSpeedC,
			trajectory: traj
		};
	}
}
