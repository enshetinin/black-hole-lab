import { OBSERVER_MAX_RS, OBSERVER_MIN_RS, ORBIT_SPEED_MAX_C } from '../physics/constants';
import {
	circularLaunchSpeed,
	incomingPhotonDirection,
	massiveFromLocal,
	newtonFromLocal,
	photonFromImpact
} from '../physics/initialConditions';
import { circularOrbit, staticClockRate, staticProperAcceleration } from '../physics/schwarzschild';
import { schwarzschildRadiusKm, timeScaleSeconds, validateMassSolar } from '../physics/units';
import { BASE_EXTENT_RS, clampZoom, extentToFit } from '../rendering/camera';
import {
	LabEngine,
	MAX_MASSIVE_LAUNCHES,
	MAX_PHOTONS,
	type LabSnapshot
} from '../simulation/engine';
import { TrajectoryJobRunner, type JobClock, type TrajectorySpec } from '../simulation/scheduler';
import type { Trajectory } from '../simulation/types';
import {
	cloneScenario,
	defaultScenario,
	normalizeAngle,
	type DistanceLock,
	type Experiment,
	type OrbitModel,
	type Quality,
	type ScenarioV1
} from '../scenarios/schema';
import { COPY } from '../content/copy';
import { fmt } from '../content/format';

export type Tone = 'info' | 'warning' | 'danger' | 'success';

export interface Notice {
	tone: Tone;
	text: string;
}

export const EMPTY_SNAPSHOT: LabSnapshot = {
	transport: 'paused',
	experiment: 'clocks',
	speed: 1,
	referenceSeconds: 0,
	localSeconds: 0,
	clockRate: Math.sqrt(0.75),
	coordinateTime: 0,
	bodies: [],
	massiveLaunches: 0,
	photonCount: 0
};

/** Encuadre base por experimento: contiene el objeto principal sin cambiar su radio. */
export function baseExtentFor(s: ScenarioV1): number {
	if (s.experiment === 'orbits') return extentToFit(s.orbit.radiusRs);
	if (s.experiment === 'photons') return Math.max(BASE_EXTENT_RS, s.photon.emissionRadiusRs * 1.12);
	return BASE_EXTENT_RS;
}

/**
 * Estado de una instancia del laboratorio (no singleton: seguro en SSR).
 * Configuración de baja frecuencia en runes; alta frecuencia dentro del motor.
 */
export class LabState {
	scenario = $state<ScenarioV1>(defaultScenario());
	snapshot = $state.raw<LabSnapshot>(EMPTY_SNAPSHOT);
	extentRs = $state(BASE_EXTENT_RS);
	launchPrepared = $state(false);
	photonPreview = $state.raw<Trajectory | null>(null);
	previewPending = $state(false);
	launching = $state(false);
	/** Mensaje junto a la causa, en el panel de controles. */
	notice = $state<Notice | null>(null);
	/** Rechazo de cambio de masa en modo km fijos. */
	massRejected = $state<number | null>(null);
	/** Texto de la región aria-live: solo cambios discretos. */
	liveMessage = $state('');
	limitReached = $state<'massive' | 'photon' | null>(null);
	selectedGroup = $state<string | null>(null);
	reducedMotion = $state(false);
	canvasAvailable = $state(true);
	/** true mientras hay un motor conectado (tras el montaje). */
	ready = $state(false);

	// Derivados de baja frecuencia.
	rsKm = $derived(schwarzschildRadiusKm(this.scenario.massSolar));
	timeScale = $derived(timeScaleSeconds(this.scenario.massSolar));
	clockRate = $derived(unwrapOrNaN(staticClockRate(this.scenario.observer.radiusRs)));
	observerKm = $derived(this.scenario.observer.radiusRs * this.rsKm);
	staticAcceleration = $derived(
		unwrapOrNaN(staticProperAcceleration(this.scenario.observer.radiusRs, this.scenario.massSolar))
	);
	orbitLaunch = $derived(massiveFromLocal(this.orbitLocalLaunch()));
	newtonLaunch = $derived(newtonFromLocal(this.orbitLocalLaunch()));
	orbitCircular = $derived(circularOrbit(this.scenario.orbit.radiusRs));
	photonDirection = $derived(
		incomingPhotonDirection(
			this.scenario.photon.emissionRadiusRs,
			this.scenario.photon.impactParameterRs
		)
	);

	private engine: LabEngine | null = null;
	private unsubscribe: (() => void) | null = null;
	private previewRunner: TrajectoryJobRunner | null = null;
	private launchRunner: TrajectoryJobRunner | null = null;
	// Registro interno para anunciar transiciones; no debe ser reactivo.
	// eslint-disable-next-line svelte/prefer-svelte-reactivity
	private lastStatuses = new Map<string, string>();

	// ── Ciclo de vida ───────────────────────────────────────────

	/** Conecta el motor tras el montaje. Devuelve la limpieza sincrónica. */
	attach(engine: LabEngine, clock: JobClock): () => void {
		this.engine = engine;
		this.previewRunner = new TrajectoryJobRunner(clock);
		this.launchRunner = new TrajectoryJobRunner(clock);
		engine.setExperiment(this.scenario.experiment);
		engine.setSpeed(this.scenario.playback.speed);
		engine.setObserverRadius(this.scenario.observer.radiusRs);
		this.unsubscribe = engine.subscribe((s) => this.onSnapshot(s));
		if (this.scenario.experiment === 'photons') void this.refreshPhotonPreview();
		this.ready = true;
		return () => this.detach();
	}

	detach(): void {
		this.unsubscribe?.();
		this.unsubscribe = null;
		this.previewRunner?.cancelAll();
		this.launchRunner?.cancelAll();
		this.previewRunner = null;
		this.launchRunner = null;
		this.engine = null;
		this.ready = false;
	}

	get engineRef(): LabEngine | null {
		return this.engine;
	}

	private onSnapshot(s: LabSnapshot): void {
		this.snapshot = s;
		// Anunciar solo transiciones a estados terminales, nunca valores por frame.
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const seen = new Set<string>();
		for (const b of s.bodies) {
			seen.add(b.id);
			const prev = this.lastStatuses.get(b.id);
			if (prev !== undefined && prev !== b.status && b.status !== 'active') {
				const who =
					b.kind === 'photon'
						? 'Fotón'
						: `Partícula (${b.model === 'newtonian' ? 'Newton' : 'Schwarzschild'})`;
				this.announce(`${who}: ${statusText(b.status)}`);
			}
			this.lastStatuses.set(b.id, b.status);
		}
		for (const id of this.lastStatuses.keys()) if (!seen.has(id)) this.lastStatuses.delete(id);
	}

	announce(text: string): void {
		// Forzar re-anuncio de un mensaje idéntico.
		this.liveMessage = '';
		queueMicrotask(() => (this.liveMessage = text));
	}

	// ── Transporte ──────────────────────────────────────────────

	togglePlay(): void {
		const e = this.engine;
		if (!e) return;
		e.toggle();
		this.announce(e.getSnapshot().transport === 'running' ? 'En marcha' : 'Pausado');
	}

	pause(reason?: string): void {
		if (!this.engine || this.engine.getSnapshot().transport === 'paused') return;
		this.engine.pause();
		if (reason) {
			this.notice = { tone: 'info', text: reason };
			this.announce(reason);
		}
	}

	step(): void {
		this.engine?.step();
	}

	resetExperiment(): void {
		this.engine?.reset();
		this.announce('Experimento reiniciado');
	}

	setSpeed(speed: number): void {
		const v = Math.min(4, Math.max(0.25, speed));
		this.scenario.playback.speed = v;
		this.engine?.setSpeed(v);
	}

	// ── Experimento y escenario ─────────────────────────────────

	setExperiment(experiment: Experiment): void {
		if (experiment === this.scenario.experiment) return;
		this.scenario.experiment = experiment;
		this.launchPrepared = false;
		this.limitReached = null;
		this.selectedGroup = null;
		this.notice = null;
		this.engine?.setExperiment(experiment);
		this.extentRs = baseExtentFor(this.scenario);
		this.previewRunner?.cancelAll();
		this.photonPreview = null;
		if (experiment === 'photons') void this.refreshPhotonPreview();
	}

	/** Commit atómico de un escenario validado: pausa, reinicia tiempos y cuerpos. */
	applyScenario(s: ScenarioV1, message: string): void {
		this.scenario = cloneScenario(s);
		this.launchPrepared = false;
		this.limitReached = null;
		this.selectedGroup = null;
		this.massRejected = null;
		this.extentRs = baseExtentFor(this.scenario);
		this.photonPreview = null;
		this.previewRunner?.cancelAll();
		this.launchRunner?.cancelAll();
		this.launching = false;
		const e = this.engine;
		if (e) {
			e.pause();
			e.setExperiment(s.experiment);
			e.setObserverRadius(s.observer.radiusRs);
			e.setSpeed(s.playback.speed);
			e.restartPhysics();
		}
		if (s.experiment === 'photons') void this.refreshPhotonPreview();
		this.notice = { tone: 'success', text: message };
		this.announce(message);
	}

	// ── Masa y observador ───────────────────────────────────────

	/** Cambia la masa según el lock. Devuelve false si se rechaza. */
	setMass(massSolar: number, announce = false): boolean {
		const valid = validateMassSolar(massSolar);
		if (!valid.ok) {
			this.notice = { tone: 'danger', text: valid.message };
			return false;
		}
		if (massSolar === this.scenario.massSolar) return true;
		const obs = this.scenario.observer;
		if (obs.distanceLock === 'km') {
			const km = obs.radiusRs * this.rsKm;
			const x = km / schwarzschildRadiusKm(massSolar);
			if (!(x >= OBSERVER_MIN_RS && x <= OBSERVER_MAX_RS)) {
				this.massRejected = massSolar;
				this.notice = {
					tone: 'warning',
					text: `Con ${fmt(massSolar, 1)} M☉, ${fmt(km, 0)} km serían ${fmt(x, 2)} rs, fuera de [1,01; 20] rs. No se cambió la masa.`
				};
				if (announce)
					this.announce('Cambio de masa rechazado: el observador quedaría fuera del dominio.');
				return false;
			}
			this.scenario.observer.radiusRs = x;
			this.engine?.setObserverRadius(x);
		}
		this.massRejected = null;
		this.scenario.massSolar = massSolar;
		this.engine?.restartPhysics();
		this.notice = { tone: 'info', text: COPY.massRestart };
		if (announce) this.announce(`Masa ${fmt(massSolar, 1)} M☉. ${COPY.massRestart}`);
		return true;
	}

	/** Acción explícita tras un rechazo en modo km: volver a escala rs y aplicar la masa. */
	acceptMassInRsScale(): void {
		const m = this.massRejected;
		if (m === null) return;
		this.scenario.observer.distanceLock = 'rs';
		this.setMass(m, true);
	}

	setDistanceLock(lock: DistanceLock): void {
		this.scenario.observer.distanceLock = lock;
		this.massRejected = null;
	}

	/** x canónico en [1,01; 20]. El ángulo no afecta al reloj. */
	setObserverRadius(x: number): boolean {
		if (!Number.isFinite(x) || x < OBSERVER_MIN_RS || x > OBSERVER_MAX_RS) return false;
		this.scenario.observer.radiusRs = x;
		this.engine?.setObserverRadius(x);
		return true;
	}

	setObserverAngle(angle: number): void {
		if (Number.isFinite(angle)) {
			this.scenario.observer.angleRad = normalizeAngle(angle);
			this.engine?.invalidate();
		}
	}

	// ── Vista ───────────────────────────────────────────────────

	setZoom(zoom: number): void {
		this.scenario.view.zoom = clampZoom(zoom);
		this.engine?.invalidate();
	}

	frameBase(): void {
		this.extentRs = baseExtentFor(this.scenario);
		this.scenario.view.zoom = 1;
		this.engine?.invalidate();
	}

	frameObserver(): void {
		this.extentRs = extentToFit(this.scenario.observer.radiusRs);
		this.scenario.view.zoom = 1;
		this.engine?.invalidate();
	}

	setLayer(layer: 'grid' | 'disk' | 'references' | 'labels' | 'trails', on: boolean): void {
		this.scenario.view[layer] = on;
		this.engine?.invalidate();
	}

	setQuality(q: Quality): void {
		this.scenario.view.quality = q;
		this.engine?.invalidate();
	}

	// ── Órbitas ─────────────────────────────────────────────────

	orbitLocalLaunch() {
		const o = this.scenario.orbit;
		return {
			radiusRs: o.radiusRs,
			azimuthRad: o.angleRad,
			speedLocalC: o.speedLocalC,
			directionRad: o.directionRad
		};
	}

	setOrbitModel(model: OrbitModel): void {
		this.scenario.orbit.model = model;
	}

	updateOrbit(
		patch: Partial<
			Pick<ScenarioV1['orbit'], 'radiusRs' | 'angleRad' | 'speedLocalC' | 'directionRad'>
		>
	): void {
		const o = this.scenario.orbit;
		if (patch.radiusRs !== undefined) o.radiusRs = patch.radiusRs;
		if (patch.angleRad !== undefined) o.angleRad = normalizeAngle(patch.angleRad);
		if (patch.speedLocalC !== undefined)
			o.speedLocalC = Math.min(ORBIT_SPEED_MAX_C, Math.max(0, patch.speedLocalC));
		if (patch.directionRad !== undefined) o.directionRad = wrapSigned(patch.directionRad);
		this.engine?.invalidate();
	}

	/**
	 * Prepara una circular en el radio actual. Schwarzschild exige x > 1,5; en todos los
	 * modos β ≤ 0,95. Devuelve el mensaje de estabilidad o error.
	 */
	prepareCircular(): Notice {
		const x = this.scenario.orbit.radiusRs;
		const model = this.scenario.orbit.model;
		if (model !== 'newtonian' && x <= 1.5) {
			return this.setNotice({
				tone: 'danger',
				text: 'No existen órbitas circulares con masa en x ≤ 1,5 rs.'
			});
		}
		const beta = circularLaunchSpeed(x);
		if (beta > ORBIT_SPEED_MAX_C) {
			return this.setNotice({
				tone: 'danger',
				text: `La circular en ${fmt(x, 2)} rs requiere β = ${fmt(beta, 3)} c, por encima del máximo 0,95 c.`
			});
		}
		this.updateOrbit({ speedLocalC: beta, directionRad: Math.PI / 2 });
		this.launchPrepared = true;
		if (model === 'newtonian') {
			return this.setNotice({
				tone: 'info',
				text: 'Circular newtoniana: velocidad coordenada 1/√(2x), convertida a β local.'
			});
		}
		const c = circularOrbit(x);
		const stability = c.ok ? c.value.stability : 'unstable';
		const text =
			stability === 'stable'
				? `Circular estable en ${fmt(x, 2)} rs (x > 3).`
				: stability === 'marginal'
					? 'Circular marginalmente estable en el ISCO (x = 3): cualquier perturbación la desestabiliza.'
					: `Circular inestable en ${fmt(x, 2)} rs (1,5 < x < 3): el redondeo numérico basta para que se aleje o caiga.`;
		return this.setNotice({ tone: stability === 'stable' ? 'info' : 'warning', text });
	}

	private setNotice(n: Notice): Notice {
		this.notice = n;
		return n;
	}

	async launchOrbit(): Promise<void> {
		const e = this.engine;
		const runner = this.launchRunner;
		if (!e || !runner || this.launching) return;
		if (e.massiveLaunches >= MAX_MASSIVE_LAUNCHES) {
			this.limitReached = 'massive';
			return;
		}
		const model = this.scenario.orbit.model;
		const specs: TrajectorySpec[] = [];
		const g = this.orbitLaunch;
		const n = this.newtonLaunch;
		if (!g.ok || !n.ok) {
			this.notice = { tone: 'danger', text: !g.ok ? g.message : !n.ok ? n.message : '' };
			return;
		}
		if (model !== 'newtonian') specs.push({ model: 'schwarzschild', launch: g.value });
		if (model !== 'schwarzschild') specs.push({ model: 'newtonian', state: n.value.state });
		this.launching = true;
		const out = await runner.compute(specs);
		this.launching = false;
		if (out.status !== 'done' || this.engine !== e) return;
		const ids = e.launch(out.trajectories);
		if (ids === null) {
			this.limitReached = 'massive';
			return;
		}
		this.limitReached = null;
		this.selectedGroup = e.getFrameState().bodies.find((b) => b.id === ids[0])?.groupId ?? null;
		const desc =
			model === 'compare'
				? 'Par Newton/Schwarzschild lanzado'
				: `Partícula ${model === 'newtonian' ? 'Newton' : 'Schwarzschild'} lanzada`;
		this.announce(`${desc} en T = ${fmt(e.getSnapshot().coordinateTime, 1)}.`);
	}

	// ── Fotones ─────────────────────────────────────────────────

	updatePhoton(
		patch: Partial<
			Pick<ScenarioV1['photon'], 'emissionRadiusRs' | 'emissionAngleRad' | 'impactParameterRs'>
		>
	): boolean {
		const p = { ...this.scenario.photon, ...patch };
		if (patch.emissionAngleRad !== undefined)
			p.emissionAngleRad = normalizeAngle(patch.emissionAngleRad);
		const dir = incomingPhotonDirection(p.emissionRadiusRs, p.impactParameterRs);
		if (!dir.ok) {
			this.notice = { tone: 'danger', text: dir.message };
			return false;
		}
		this.scenario.photon = p;
		void this.refreshPhotonPreview();
		return true;
	}

	/** Recalcula la trayectoria prevista; las solicitudes nuevas invalidan las anteriores. */
	async refreshPhotonPreview(): Promise<void> {
		const runner = this.previewRunner;
		if (!runner) return;
		const p = this.scenario.photon;
		const launch = photonFromImpact(p.emissionRadiusRs, p.emissionAngleRad, p.impactParameterRs);
		if (!launch.ok) {
			this.photonPreview = null;
			return;
		}
		this.previewPending = true;
		const out = await runner.compute([{ model: 'schwarzschild', launch: launch.value }]);
		if (out.status !== 'done') return;
		this.previewPending = false;
		this.photonPreview = out.trajectories[0] ?? null;
		this.engine?.invalidate();
	}

	async launchPhoton(): Promise<void> {
		const e = this.engine;
		const runner = this.launchRunner;
		if (!e || !runner || this.launching) return;
		if (e.photonCount >= MAX_PHOTONS) {
			this.limitReached = 'photon';
			return;
		}
		const p = this.scenario.photon;
		const launch = photonFromImpact(p.emissionRadiusRs, p.emissionAngleRad, p.impactParameterRs);
		if (!launch.ok) {
			this.notice = { tone: 'danger', text: launch.message };
			return;
		}
		this.launching = true;
		const out = await runner.compute([{ model: 'schwarzschild', launch: launch.value }]);
		this.launching = false;
		if (out.status !== 'done' || this.engine !== e) return;
		const ids = e.launch(out.trajectories);
		if (ids === null) {
			this.limitReached = 'photon';
			return;
		}
		this.limitReached = null;
		this.announce(`Fotón emitido con B = ${fmt(p.impactParameterRs, 4)}.`);
	}

	clearBodies(): void {
		this.engine?.clearBodies();
		this.limitReached = null;
		this.selectedGroup = null;
		this.announce('Trayectorias eliminadas');
	}

	async replaceOldestAndLaunch(): Promise<void> {
		const e = this.engine;
		if (!e) return;
		const kind = this.scenario.experiment === 'photons' ? 'photon' : 'massive';
		e.removeOldest(kind);
		this.limitReached = null;
		if (kind === 'photon') await this.launchPhoton();
		else await this.launchOrbit();
	}
}

function unwrapOrNaN(r: { ok: true; value: number } | { ok: false }): number {
	return r.ok ? r.value : Number.NaN;
}

/** Ángulo en (−π, π]. */
function wrapSigned(a: number): number {
	let v = a % (2 * Math.PI);
	if (v > Math.PI) v -= 2 * Math.PI;
	if (v <= -Math.PI) v += 2 * Math.PI;
	return v;
}

export function statusText(status: string): string {
	switch (status) {
		case 'captured':
			return COPY.captured;
		case 'escaped':
			return 'escapa, sin retorno (criterio de energía y potencial).';
		case 'budget-exceeded':
			return COPY.budget;
		case 'numerical-error':
			return COPY.solverError;
		case 'out-of-view':
			return COPY.outOfView;
		default:
			return 'en curso';
	}
}
