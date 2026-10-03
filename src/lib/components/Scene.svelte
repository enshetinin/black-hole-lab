<script lang="ts">
	import { untrack } from 'svelte';
	import type { LabState } from '#lib/state/lab.svelte.ts';
	import {
		OBSERVER_MAX_RS,
		OBSERVER_MIN_RS,
		ORBIT_RADIUS_MAX_RS,
		ORBIT_RADIUS_MIN_RS,
		ORBIT_SPEED_MAX_C
	} from '#lib/physics/constants.ts';
	import {
		clampZoom,
		isPolarVisible,
		screenToWorld,
		worldToScreen,
		type Camera
	} from '#lib/rendering/camera.ts';
	import { ARROW_PX_PER_HALF_C, QUALITY, SceneCache, drawScene } from '#lib/rendering/renderer.ts';
	import { buildSceneView } from '#lib/state/sceneView.ts';
	import type { FrameState } from '#lib/simulation/engine.ts';
	import { fmt, fmtDuration, fmtSig } from '#lib/content/format.ts';
	import { COPY } from '#lib/content/copy.ts';

	let { lab }: { lab: LabState } = $props();

	let container = $state<HTMLDivElement | null>(null);
	let canvas = $state<HTMLCanvasElement | null>(null);
	let width = $state(0);
	let height = $state(0);
	let dragging = $state<'observer' | 'launch-origin' | 'launch-tip' | null>(null);
	let atMinimum = $state(false);

	const exp = $derived(lab.scenario.experiment);
	const camera = $derived<Camera>({
		width,
		height,
		extentRs: lab.extentRs,
		zoom: lab.scenario.view.zoom
	});
	const observer = $derived(lab.scenario.observer);
	const observerScreen = $derived(
		worldToScreen(
			camera,
			observer.radiusRs * Math.cos(observer.angleRad),
			observer.radiusRs * Math.sin(observer.angleRad)
		)
	);
	const observerVisible = $derived(
		width > 0 && isPolarVisible(camera, observer.radiusRs, observer.angleRad, 4)
	);
	const orbit = $derived(lab.scenario.orbit);
	const launchOrigin = $derived(
		worldToScreen(
			camera,
			orbit.radiusRs * Math.cos(orbit.angleRad),
			orbit.radiusRs * Math.sin(orbit.angleRad)
		)
	);
	const launchTip = $derived.by(() => {
		const theta = orbit.angleRad + orbit.directionRad;
		const len = (orbit.speedLocalC / 0.5) * ARROW_PX_PER_HALF_C;
		return {
			px: launchOrigin.px + len * Math.cos(theta),
			py: launchOrigin.py - len * Math.sin(theta)
		};
	});

	const cache = new SceneCache();
	let ctx: CanvasRenderingContext2D | null = null;
	let dpr = 1;

	function draw(f: FrameState) {
		if (!ctx || !canvas || width === 0 || height === 0) return;
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		drawScene(ctx, buildSceneView(lab, f, width, height), cache);
	}

	function resize() {
		if (!canvas || !container) return;
		const rect = container.getBoundingClientRect();
		width = Math.max(1, Math.round(rect.width));
		height = Math.max(1, Math.round(rect.height));
		dpr = Math.min(window.devicePixelRatio || 1, QUALITY[lab.scenario.view.quality].dprCap);
		canvas.width = Math.round(width * dpr);
		canvas.height = Math.round(height * dpr);
		lab.engineRef?.invalidate();
	}

	// Montaje: contexto, ResizeObserver y suscripción al bucle único. Cleanup sincrónico.
	$effect(() => {
		if (!lab.ready || !canvas || !container) return;
		const engine = lab.engineRef;
		if (!engine) return;
		try {
			ctx = canvas.getContext('2d');
		} catch {
			ctx = null;
		}
		if (!ctx) {
			lab.canvasAvailable = false;
			return;
		}
		const ro = new ResizeObserver(() => resize());
		ro.observe(container);
		untrack(resize);
		const off = engine.onFrame(draw);
		// Las fuentes locales llegan después del primer frame: redibujar los rótulos al cargarlas.
		void document.fonts?.ready.then(() => engine.invalidate());
		return () => {
			ro.disconnect();
			off();
			ctx = null;
		};
	});

	// Cambios de configuración visual o física → redibujar en pausa (render por invalidación).
	$effect(() => {
		JSON.stringify(lab.scenario);
		void lab.extentRs;
		void lab.launchPrepared;
		void lab.photonPreview;
		void lab.selectedGroup;
		void lab.rsKm;
		if (lab.ready) lab.engineRef?.invalidate();
	});

	// El DPR depende de la calidad.
	$effect(() => {
		void lab.scenario.view.quality;
		if (lab.ready) untrack(resize);
	});

	// Rueda: zoom solo cuando la escena tiene el foco; no secuestra el scroll de la página.
	$effect(() => {
		const el = container;
		if (!el) return;
		const onWheel = (e: WheelEvent) => {
			if (!el.contains(document.activeElement)) return;
			e.preventDefault();
			lab.setZoom(clampZoom(lab.scenario.view.zoom * Math.exp(-e.deltaY * 0.0015)));
		};
		el.addEventListener('wheel', onWheel, { passive: false });
		return () => el.removeEventListener('wheel', onWheel);
	});

	function worldFromEvent(e: PointerEvent) {
		const rect = canvas!.getBoundingClientRect();
		return screenToWorld(camera, e.clientX - rect.left, e.clientY - rect.top);
	}

	function startDrag(kind: NonNullable<typeof dragging>, e: PointerEvent) {
		if (e.button !== 0) return;
		e.preventDefault();
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
		(e.currentTarget as HTMLElement).focus({ preventScroll: true });
		dragging = kind;
	}

	function moveDrag(e: PointerEvent) {
		if (!dragging || !canvas) return;
		const w = worldFromEvent(e);
		const r = Math.hypot(w.x, w.y);
		const angle = Math.atan2(w.y, w.x);
		if (dragging === 'observer') {
			const x = Math.min(OBSERVER_MAX_RS, Math.max(OBSERVER_MIN_RS, r));
			const clamped = r < OBSERVER_MIN_RS;
			if (clamped && !atMinimum) lab.announce('Límite mínimo del observador: 1,01 rs.');
			atMinimum = clamped;
			lab.setObserverRadius(x);
			lab.setObserverAngle(angle);
		} else if (dragging === 'launch-origin') {
			const x = Math.min(ORBIT_RADIUS_MAX_RS, Math.max(ORBIT_RADIUS_MIN_RS, r));
			lab.updateOrbit({ radiusRs: x, angleRad: angle });
		} else {
			const rect = canvas.getBoundingClientRect();
			const dx = e.clientX - rect.left - launchOrigin.px;
			const dy = e.clientY - rect.top - launchOrigin.py;
			const beta = Math.min(ORBIT_SPEED_MAX_C, (Math.hypot(dx, dy) / ARROW_PX_PER_HALF_C) * 0.5);
			const theta = Math.atan2(-dy, dx);
			lab.updateOrbit({ speedLocalC: beta, directionRad: theta - orbit.angleRad });
		}
	}

	function endDrag(e: PointerEvent) {
		const el = e.currentTarget as HTMLElement;
		if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
		dragging = null;
		atMinimum = false;
	}

	/** Teclado del observador: ←/↓ acercan, →/↑ alejan 0,05 rs (Shift ×10); Inicio/Fin a los límites. */
	function observerKey(e: KeyboardEvent) {
		const x = observer.radiusRs;
		const step = e.shiftKey ? 0.5 : 0.05;
		let next: number | null = null;
		if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = x - step;
		else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = x + step;
		else if (e.key === 'Home') next = OBSERVER_MIN_RS;
		else if (e.key === 'End') next = OBSERVER_MAX_RS;
		else if (e.key === 'PageDown') next = x - 1;
		else if (e.key === 'PageUp') next = x + 1;
		if (next === null) return;
		e.preventDefault();
		lab.setObserverRadius(Math.min(OBSERVER_MAX_RS, Math.max(OBSERVER_MIN_RS, next)));
	}

	const timeReadout = $derived.by(() => {
		const T = lab.snapshot.coordinateTime;
		return `T = ${fmt(T, 1)} rs/c · ${fmtDuration(T * lab.timeScale)}`;
	});

	const sceneLabel = $derived.by(() => {
		const s = lab.scenario;
		if (s.experiment === 'clocks') {
			return `Vista a escala del agujero negro de ${fmt(s.massSolar, 1)} masas solares. Horizonte en 1 rs, esfera de fotones en 1,5 rs, ISCO en 3 rs. Observador en ${fmt(s.observer.radiusRs, 2)} rs.`;
		}
		if (s.experiment === 'orbits') {
			return `Vista de órbitas: ${lab.snapshot.bodies.length} trayectorias. Los resultados están en la tabla bajo la escena.`;
		}
		return `Vista de fotones: emisor en ${fmt(s.photon.emissionRadiusRs, 1)} rs, B = ${fmt(s.photon.impactParameterRs, 4)}. Resultados en la tabla.`;
	});
</script>

<div class="scene-wrap">
	<div
		class="scene"
		bind:this={container}
		role="group"
		aria-label="Escena del laboratorio. Con el foco aquí, la rueda del ratón cambia el zoom."
		tabindex="-1"
	>
		<canvas bind:this={canvas} aria-hidden="true"></canvas>
		<p class="visually-hidden">{sceneLabel}</p>

		{#if !lab.canvasAvailable}
			<p class="fallback message" data-tone="warning">
				Este navegador no pudo dibujar la escena. Los controles, las métricas y la tabla de
				resultados siguen disponibles.
			</p>
		{/if}

		{#if exp === 'clocks' && observerVisible}
			<div
				class="handle observer-handle"
				class:dragging={dragging === 'observer'}
				style="left: {observerScreen.px}px; top: {observerScreen.py}px"
				role="slider"
				tabindex="0"
				aria-label="Observador: arrastra o usa las flechas para cambiar el radio"
				aria-valuemin={OBSERVER_MIN_RS}
				aria-valuemax={OBSERVER_MAX_RS}
				aria-valuenow={Number(observer.radiusRs.toFixed(3))}
				aria-valuetext="{fmt(observer.radiusRs, 2)} rs, {fmtSig(lab.observerKm, 3)} km"
				aria-orientation="horizontal"
				onpointerdown={(e) => startDrag('observer', e)}
				onpointermove={moveDrag}
				onpointerup={endDrag}
				onpointercancel={endDrag}
				onlostpointercapture={() => (dragging = null)}
				onkeydown={observerKey}
			></div>
		{/if}

		{#if exp === 'orbits' && lab.launchPrepared}
			<div
				class="handle launch-handle"
				style="left: {launchOrigin.px}px; top: {launchOrigin.py}px"
				aria-hidden="true"
				onpointerdown={(e) => startDrag('launch-origin', e)}
				onpointermove={moveDrag}
				onpointerup={endDrag}
				onpointercancel={endDrag}
				onlostpointercapture={() => (dragging = null)}
			></div>
			<div
				class="handle tip-handle"
				style="left: {launchTip.px}px; top: {launchTip.py}px"
				aria-hidden="true"
				onpointerdown={(e) => startDrag('launch-tip', e)}
				onpointermove={moveDrag}
				onpointerup={endDrag}
				onpointercancel={endDrag}
				onlostpointercapture={() => (dragging = null)}
			></div>
		{/if}

		{#if exp !== 'clocks'}
			<p class="time-chip num" aria-hidden="true">{timeReadout}</p>
		{/if}

		<div class="zoom" role="group" aria-label="Cámara">
			<button
				class="btn btn-small icon"
				type="button"
				aria-label="Acercar zoom"
				disabled={lab.scenario.view.zoom >= 2}
				onclick={() => lab.setZoom(lab.scenario.view.zoom * 1.25)}
			>
				<svg viewBox="0 0 20 20" aria-hidden="true"
					><path d="M10 4v12M4 10h12" stroke="currentColor" stroke-width="2" /></svg
				>
			</button>
			<button
				class="btn btn-small icon"
				type="button"
				aria-label="Alejar zoom"
				disabled={lab.scenario.view.zoom <= 0.5}
				onclick={() => lab.setZoom(lab.scenario.view.zoom / 1.25)}
			>
				<svg viewBox="0 0 20 20" aria-hidden="true"
					><path d="M4 10h12" stroke="currentColor" stroke-width="2" /></svg
				>
			</button>
			<button class="btn btn-small" type="button" onclick={() => lab.frameBase()}>Encuadrar</button>
		</div>

		{#if exp === 'clocks' && !observerVisible && width > 0}
			<button class="btn btn-small offscreen" type="button" onclick={() => lab.frameObserver()}>
				Observador fuera de campo ({fmt(observer.radiusRs, 1)} rs) · Encuadrar observador
			</button>
		{/if}
	</div>

	<ul class="legend" aria-label="Leyenda">
		<li><span class="sw horizon"></span>Horizonte · 1 rs</li>
		{#if lab.scenario.view.references}
			<li><span class="sw photon-sphere"></span>Esfera de fotones · 1,5 rs</li>
			<li><span class="sw isco"></span>ISCO · 3 rs</li>
		{/if}
		{#if exp === 'clocks'}<li><span class="sw observer"></span>Observador estático</li>{/if}
		{#if exp === 'orbits'}
			<li><span class="sw gr"></span>Schwarzschild (continua, círculo)</li>
			<li><span class="sw newton"></span>Newton (discontinua, rombo)</li>
		{/if}
		{#if exp === 'photons'}
			<li><span class="sw photon"></span>Fotón (prevista: punteada)</li>
		{/if}
		{#if lab.scenario.view.disk}<li><span class="sw disk"></span>{COPY.disk}</li>{/if}
		{#if lab.scenario.view.grid}<li><span class="sw grid"></span>{COPY.grid}</li>{/if}
		<li class="note">El círculo negro es el horizonte a escala, no la sombra aparente.</li>
	</ul>
</div>

<style>
	.scene-wrap {
		display: grid;
		gap: var(--space-3);
	}
	.scene {
		position: relative;
		width: 100%;
		height: clamp(420px, 62vh, 680px);
		overflow: hidden;
		border: 1px solid var(--line);
		background: var(--scene-bg);
		outline: none;
	}
	.scene:focus-within {
		border-color: var(--control-line);
	}
	canvas {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		display: block;
	}
	.handle {
		position: absolute;
		width: 44px;
		height: 44px;
		margin: -22px 0 0 -22px;
		border-radius: 50%;
		cursor: grab;
		touch-action: none;
	}
	.handle.dragging {
		cursor: grabbing;
	}
	.observer-handle:focus-visible {
		outline: 2px solid var(--focus);
		outline-offset: 2px;
	}
	.observer-handle:hover {
		background: rgb(242 239 232 / 0.06);
	}
	.tip-handle {
		width: 36px;
		height: 36px;
		margin: -18px 0 0 -18px;
		border: 1px dashed rgb(242 239 232 / 0.55);
		border-radius: 0;
	}
	.time-chip {
		position: absolute;
		top: var(--space-3);
		right: var(--space-3);
		margin: 0;
		padding: 2px 8px;
		font-size: var(--font-meta);
		font-family: var(--font-mono);
		background: rgb(12 11 10 / 0.85);
	}
	.zoom {
		position: absolute;
		right: var(--space-3);
		bottom: var(--space-3);
		display: flex;
		gap: var(--space-2);
	}
	.zoom .btn {
		background: rgb(17 16 14 / 0.92);
		min-height: 40px;
	}
	.icon {
		width: 40px;
		padding: 0;
	}
	.offscreen {
		position: absolute;
		left: 50%;
		top: var(--space-3);
		transform: translateX(-50%);
		background: rgb(17 16 14 / 0.95);
		white-space: normal;
		max-width: calc(100% - 24px);
	}
	.fallback {
		position: absolute;
		inset: auto var(--space-4) var(--space-4);
	}
	.legend {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2) var(--space-4);
		font-size: var(--font-meta);
		color: var(--muted);
	}
	.legend li {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
	}
	.legend .note {
		flex-basis: 100%;
	}
	.sw {
		display: inline-block;
		width: 22px;
		height: 0;
		border-top: 2px solid;
	}
	.sw.horizon {
		height: 12px;
		width: 12px;
		border-radius: 50%;
		background: #000;
		border: 1.5px solid #9a9389;
	}
	.sw.photon-sphere {
		border-top: 2px dotted var(--text);
	}
	.sw.isco {
		border-top: 2px dashed var(--data-isco);
	}
	.sw.observer {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		border: 2px solid var(--signal);
	}
	.sw.gr {
		border-top: 2.5px solid var(--data-gr);
	}
	.sw.newton {
		border-top: 2px dashed var(--data-newton);
	}
	.sw.photon {
		border-top: 2px solid var(--data-photon);
	}
	.sw.disk {
		height: 8px;
		border: 0;
		background: linear-gradient(90deg, rgb(255 196 120 / 0.8), rgb(220 110 50 / 0.15));
	}
	.sw.grid {
		height: 10px;
		border: 1px solid rgb(200 189 170 / 0.55);
		background:
			linear-gradient(90deg, transparent 45%, rgb(200 189 170 / 0.55) 45% 55%, transparent 55%),
			linear-gradient(transparent 45%, rgb(200 189 170 / 0.55) 45% 55%, transparent 55%);
	}
	@media (max-width: 719px) {
		.scene {
			height: clamp(320px, calc(100vw - 32px), 420px);
		}
	}
</style>
