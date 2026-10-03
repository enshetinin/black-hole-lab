<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { LabState } from '#lib/state/lab.svelte.ts';
	import { LabEngine } from '#lib/simulation/engine.ts';
	import type { JobClock } from '#lib/simulation/scheduler.ts';
	import { cloneScenario, defaultScenario, type ScenarioV1 } from '#lib/scenarios/schema.ts';
	import { decodeFragment } from '#lib/scenarios/url.ts';
	import {
		TUTORIAL_KEY,
		clearScenario,
		createDebouncedSaver,
		getBrowserStorage,
		loadScenario,
		readFlag,
		saveScenario,
		writeFlag,
		type KeyValueStore
	} from '#lib/scenarios/storage.ts';
	import { COPY, EXPERIMENT_LABEL } from '#lib/content/copy.ts';
	import ExperimentTabs from './ExperimentTabs.svelte';
	import Scene from './Scene.svelte';
	import Transport from './Transport.svelte';
	import MassControl from './MassControl.svelte';
	import ObserverControl from './ObserverControl.svelte';
	import ClockComparison from './ClockComparison.svelte';
	import OrbitControls from './OrbitControls.svelte';
	import PhotonControls from './PhotonControls.svelte';
	import BodyTable from './BodyTable.svelte';
	import LayerControls from './LayerControls.svelte';
	import ScientificPanel from './ScientificPanel.svelte';
	import ScenarioActions from './ScenarioActions.svelte';
	import HelpPanel from './HelpPanel.svelte';
	import MetricsBand from './MetricsBand.svelte';
	import PresetList from './PresetList.svelte';

	const lab = new LabState();

	let urlError = $state<string | null>(null);
	let storageWarning = $state<string | null>(null);
	let tutorialOpen = $state(false);
	let loaded = $state(false);
	let skipNextSave = true;
	let store: KeyValueStore | null = null;
	let saver: ReturnType<typeof createDebouncedSaver> | null = null;

	const exp = $derived(lab.scenario.experiment);
	const running = $derived(lab.snapshot.transport === 'running');

	/** Prioridad de carga: URL válida > último escenario local válido > valores iniciales. */
	function initialScenario(): ScenarioV1 {
		const fragment = decodeFragment(window.location.hash);
		if (fragment.present) {
			if (fragment.result.ok) return fragment.result.value;
			urlError = `El enlace contiene un escenario no válido (${fragment.result.message}). Se usan los valores iniciales.`;
			return defaultScenario();
		}
		const local = loadScenario(store);
		if (local.ok) return local.value ?? defaultScenario();
		if (local.code === 'storage-unavailable') {
			storageWarning =
				'El almacenamiento local no está disponible: el escenario no se recordará al recargar.';
		}
		return defaultScenario();
	}

	function clearUrlScenario() {
		history.replaceState(history.state, '', window.location.pathname + window.location.search);
		urlError = null;
	}

	function restoreDefaults() {
		skipNextSave = true;
		saver?.cancel();
		clearScenario(store);
		if (window.location.hash) clearUrlScenario();
		lab.applyScenario(defaultScenario(), 'Valores iniciales restaurados.');
	}

	onMount(() => {
		store = getBrowserStorage();
		lab.scenario = cloneScenario(initialScenario());
		lab.frameBase();

		let rafId = 0;
		const engine = new LabEngine({
			frames: {
				request: (cb) => (rafId = requestAnimationFrame(cb)),
				cancel: (id) => cancelAnimationFrame(id)
			},
			observerRadiusRs: lab.scenario.observer.radiusRs,
			experiment: lab.scenario.experiment,
			speed: lab.scenario.playback.speed
		});
		const channel = new MessageChannel();
		const waiting: (() => void)[] = [];
		channel.port1.onmessage = () => waiting.shift()?.();
		const clock: JobClock = {
			now: () => performance.now(),
			yieldToHost: () =>
				new Promise<void>((resolve) => {
					waiting.push(resolve);
					channel.port2.postMessage(null);
				})
		};
		const detach = lab.attach(engine, clock);

		const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
		const applyMotion = () => (lab.reducedMotion = motion.matches);
		applyMotion();
		motion.addEventListener('change', applyMotion);

		// Al ocultar la pestaña: pausa y vaciado del acumulador; no se reanuda solo.
		const onVisibility = () => {
			if (document.visibilityState === 'hidden') lab.pause(COPY.hiddenPause);
		};
		document.addEventListener('visibilitychange', onVisibility);

		// Pegar otro enlace en la misma pestaña solo cambia el hash: cargarlo igual, en pausa.
		const onHashChange = () => {
			const fragment = decodeFragment(window.location.hash);
			if (!fragment.present) return;
			if (fragment.result.ok) {
				urlError = null;
				lab.applyScenario(fragment.result.value, 'Escenario del enlace cargado en pausa.');
			} else {
				urlError = `El enlace contiene un escenario no válido (${fragment.result.message}). Se conserva el escenario actual.`;
			}
		};
		window.addEventListener('hashchange', onHashChange);

		saver = createDebouncedSaver((s) => {
			const r = saveScenario(store, s);
			if (!r.ok) storageWarning = r.message;
		});
		tutorialOpen = !readFlag(store, TUTORIAL_KEY);
		loaded = true;

		return () => {
			document.removeEventListener('visibilitychange', onVisibility);
			window.removeEventListener('hashchange', onHashChange);
			motion.removeEventListener('change', applyMotion);
			saver?.cancel();
			detach();
			engine.destroy();
			cancelAnimationFrame(rafId);
			channel.port1.close();
			channel.port2.close();
		};
	});

	// Decoraciones animadas solo sin movimiento reducido y con calidad no baja.
	$effect(() => {
		const enabled = !lab.reducedMotion && lab.scenario.view.quality !== 'low';
		if (lab.ready) untrack(() => lab.engineRef?.setDecorations(enabled));
	});

	// Persistencia con debounce tras cambios válidos; nunca por frame ni el transporte.
	$effect(() => {
		const snapshot = $state.snapshot(lab.scenario) as ScenarioV1;
		if (!loaded) return;
		untrack(() => {
			if (skipNextSave) {
				skipNextSave = false;
				return;
			}
			saver?.schedule(snapshot);
		});
	});

	function closeTutorial() {
		tutorialOpen = false;
		writeFlag(store, TUTORIAL_KEY, true);
	}

	function openTutorial() {
		tutorialOpen = true;
		writeFlag(store, TUTORIAL_KEY, false);
	}
</script>

<div class="lab">
	<div class="intro">
		<p class="lead">{COPY.subtitle}</p>
		<p class="context">
			{exp === 'clocks'
				? COPY.clocksIntro
				: exp === 'orbits'
					? 'Lanza partículas con Newton o con geodésicas de Schwarzschild y compáralas sobre la misma T.'
					: 'Emite luz con distintos parámetros de impacto: captura, dispersión y el caso crítico.'}
		</p>
	</div>

	{#if urlError}
		<div class="message banner" data-tone="danger" role="alert">
			<p>{urlError}</p>
			<button class="btn btn-small" type="button" onclick={clearUrlScenario}
				>Quitar el escenario del enlace</button
			>
		</div>
	{/if}
	{#if storageWarning}
		<p class="message banner" data-tone="warning">{storageWarning}</p>
	{/if}

	<div class="workspace">
		<div class="main-column">
			<ExperimentTabs active={exp} {running} onSelect={(e) => lab.setExperiment(e)} />
			<Scene {lab} />
			<Transport {lab} />
			<HelpPanel
				{tutorialOpen}
				onCloseTutorial={closeTutorial}
				onOpenTutorial={openTutorial}
				part="tutorial"
			/>
			<MetricsBand {lab} />
			{#if exp === 'clocks'}
				<ClockComparison {lab} />
			{:else}
				<BodyTable {lab} />
			{/if}
			<div class="folds">
				<ScientificPanel {lab} />
				<HelpPanel
					{tutorialOpen}
					onCloseTutorial={closeTutorial}
					onOpenTutorial={openTutorial}
					part="help"
				/>
			</div>
		</div>

		<aside class="side" aria-label="Controles">
			<section class="block">
				<MassControl {lab} />
			</section>
			<div class="block tabpanel" role="tabpanel" id="panel-{exp}" aria-labelledby="tab-{exp}">
				<h2 class="panel-title">{EXPERIMENT_LABEL[exp]}</h2>
				{#if exp === 'clocks'}
					<ObserverControl {lab} />
					<PresetList {lab} experiment="clocks" />
					{#if lab.notice}
						<p class="message" data-tone={lab.notice.tone}>{lab.notice.text}</p>
					{/if}
				{:else if exp === 'orbits'}
					<OrbitControls {lab} />
				{:else}
					<PhotonControls {lab} />
				{/if}
			</div>
			<section class="block">
				<LayerControls {lab} />
			</section>
			<section class="block">
				<ScenarioActions {lab} onRestoreDefaults={restoreDefaults} />
			</section>
		</aside>
	</div>

	<div class="visually-hidden" role="status" aria-live="polite" aria-atomic="true">
		{lab.liveMessage}
	</div>
</div>

<style>
	/* Rejilla de 12 columnas: escena 9 / contexto y controles 3. La división es invisible. */
	.lab {
		display: grid;
		gap: var(--space-5);
	}
	.intro,
	.workspace {
		display: grid;
		grid-template-columns: repeat(12, minmax(0, 1fr));
		column-gap: 20px;
	}
	.lead {
		grid-column: 1 / span 7;
		font-family: var(--font-serif);
		font-size: clamp(1.375rem, 2.2vw, 1.875rem);
		line-height: 1.2;
		letter-spacing: -0.01em;
	}
	.context {
		grid-column: 10 / -1;
		align-self: end;
		color: var(--muted);
		font-size: var(--font-meta);
	}
	.banner {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
	}
	.workspace {
		align-items: start;
	}
	.main-column {
		grid-column: 1 / span 9;
		display: grid;
		gap: var(--space-5);
		min-width: 0;
	}
	.side {
		grid-column: 10 / -1;
		display: grid;
		gap: var(--space-7);
		min-width: 0;
		padding-top: var(--space-2);
	}
	.block {
		display: grid;
		gap: var(--space-4);
		min-width: 0;
	}
	.panel-title {
		font-size: 1.375rem;
		font-weight: 500;
	}
	.folds {
		display: grid;
	}
	@media (max-width: 1099px) {
		.lead {
			grid-column: 1 / -1;
		}
		.context {
			grid-column: 1 / -1;
			margin-top: var(--space-2);
		}
		.main-column,
		.side {
			grid-column: 1 / -1;
		}
		.side {
			grid-template-columns: repeat(2, minmax(0, 1fr));
			column-gap: var(--space-6);
			margin-top: var(--space-6);
		}
	}
	@media (max-width: 719px) {
		.side {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
