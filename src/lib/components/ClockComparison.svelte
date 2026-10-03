<script lang="ts">
	import type { LabState } from '#lib/state/lab.svelte.ts';
	import { fmt, fmtClock, fmtSci } from '#lib/content/format.ts';
	import { COPY } from '#lib/content/copy.ts';

	let { lab }: { lab: LabState } = $props();

	let refHand = $state<SVGLineElement | null>(null);
	let localHand = $state<SVGLineElement | null>(null);

	const q = $derived(lab.clockRate);
	const inverse = $derived(1 / q);
	const local60 = $derived(60 * q);

	function handAngle(seconds: number): string {
		return `rotate(${((seconds % 60) / 60) * 360} 50 50)`;
	}

	// Manecillas por frame mediante el bucle único (sin estado reactivo a 60 Hz); lecturas digitales a ~10 Hz mediante el bucle único del motor (sin estado reactivo a 60 Hz).
	$effect(() => {
		if (!lab.ready) return;
		const engine = lab.engineRef;
		if (!engine) return;
		return engine.onFrame((f) => {
			refHand?.setAttribute('transform', handAngle(f.referenceSeconds));
			localHand?.setAttribute('transform', handAngle(f.localSeconds));
		});
	});

	const ticks = Array.from({ length: 12 }, (_, i) => i * 30);
</script>

<section class="clocks" aria-labelledby="clocks-title">
	<h2 id="clocks-title" class="visually-hidden">Relojes</h2>
	<div class="dials">
		{#each [{ key: 'ref', title: COPY.referenceClock, color: 'var(--text)' }, { key: 'local', title: COPY.localClock, color: 'var(--signal)' }] as clock (clock.key)}
			<figure class="dial">
				<svg viewBox="0 0 100 100" aria-hidden="true">
					<circle cx="50" cy="50" r="46" class="face" />
					{#each ticks as t (t)}
						<line
							x1="50"
							y1="8"
							x2="50"
							y2={t % 90 === 0 ? 15 : 12}
							transform="rotate({t} 50 50)"
							class="tick"
						/>
					{/each}
					{#if clock.key === 'ref'}
						<line
							bind:this={refHand}
							x1="50"
							y1="54"
							x2="50"
							y2="12"
							stroke={clock.color}
							class="hand"
							transform="rotate(0 50 50)"
						/>
					{:else}
						<line
							bind:this={localHand}
							x1="50"
							y1="54"
							x2="50"
							y2="12"
							stroke={clock.color}
							class="hand"
							transform="rotate(0 50 50)"
						/>
					{/if}
					<circle cx="50" cy="50" r="2.5" fill={clock.color} />
				</svg>
				<figcaption>
					<span class="title">{clock.title}</span>
					{#if clock.key === 'ref'}
						<span class="time num">{fmtClock(lab.snapshot.referenceSeconds)}</span>
					{:else}
						<span class="time num local">{fmtClock(lab.snapshot.localSeconds)}</span>
					{/if}
				</figcaption>
			</figure>
		{/each}
	</div>
	<p class="sr-summary visually-hidden" aria-live="off">
		Reloj de referencia {fmt(lab.snapshot.referenceSeconds, 2)} s; reloj local {fmt(
			lab.snapshot.localSeconds,
			2
		)} s.
	</p>

	<div class="reading">
		<div class="ratio">
			<p>
				Aquí transcurren <strong class="num">{fmt(q, 3)} s</strong> por cada 1 s de referencia.
			</p>
			<p class="muted">
				1 s local equivale a <strong class="num">{fmt(inverse, 3)} s</strong> de referencia.
			</p>
		</div>

		<div class="compare" role="group" aria-labelledby="compare-title">
			<h3 id="compare-title">Comparar 60 s</h3>
			<p class="muted small">
				Con el observador fijo en {fmt(lab.scenario.observer.radiusRs, 2)} rs, independiente de los relojes
				acumulados.
			</p>
			<div class="bar-row">
				<span class="bar-label">Referencia</span>
				<svg class="bar" viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true">
					<rect width="100" height="10" class="bar-ref" />
				</svg>
				<span class="num value">60,000 s</span>
			</div>
			<div class="bar-row">
				<span class="bar-label">Local</span>
				<svg class="bar" viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true">
					<rect width={Math.max(0, Math.min(100, q * 100))} height="10" class="bar-local" />
				</svg>
				<span class="num value">{fmt(local60, 3)} s</span>
			</div>
		</div>
	</div>

	<p class="muted small footnote">{COPY.clockScale} {COPY.observerMoving}</p>
	{#if lab.scenario.observer.radiusRs < 2}
		<p class="message footnote" data-tone="warning">
			{COPY.nearHorizon} Aceleración propia necesaria:
			<span class="num">{fmtSci(lab.staticAcceleration, 2)} m/s²</span>.
		</p>
	{/if}
</section>

<style>
	/* Asimetría interna: relojes (5) / lectura de la comparación (4). Sin cajas. */
	.clocks {
		display: grid;
		grid-template-columns: minmax(0, 5fr) minmax(0, 4fr);
		gap: var(--space-5) var(--space-6);
		align-items: start;
	}
	.dials {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-5);
	}
	.dial {
		margin: 0;
		display: grid;
		gap: var(--space-3);
		justify-items: start;
	}
	.dial svg {
		width: 88px;
		height: 88px;
	}
	.face {
		fill: none;
		stroke: var(--control-line);
		stroke-width: 1.2;
	}
	.tick {
		stroke: var(--muted);
		stroke-width: 1.4;
	}
	.hand {
		stroke-width: 2.4;
		stroke-linecap: square;
	}
	figcaption {
		display: grid;
		gap: 2px;
		min-width: 0;
	}
	.title {
		font-size: var(--font-meta);
		color: var(--muted);
	}
	.time {
		font-size: clamp(1.75rem, 3vw, 2.5rem);
		font-weight: 500;
		letter-spacing: -0.02em;
		line-height: 1.1;
	}
	.time.local {
		color: var(--signal);
	}
	.reading {
		display: grid;
		gap: var(--space-5);
	}
	.ratio {
		display: grid;
		gap: var(--space-2);
	}
	.ratio p:first-child {
		font-family: var(--font-serif);
		font-size: var(--font-lead);
		line-height: 1.3;
	}
	.ratio strong {
		font-family: var(--font-sans);
		font-weight: 500;
		font-variant-numeric: tabular-nums;
	}
	.muted {
		color: var(--muted);
	}
	.small {
		font-size: var(--font-meta);
	}
	.compare {
		display: grid;
		gap: var(--space-2);
	}
	.compare h3 {
		font-size: var(--font-ui);
	}
	.bar-row {
		display: grid;
		grid-template-columns: 76px 1fr 76px;
		gap: var(--space-3);
		align-items: center;
		font-size: var(--font-meta);
	}
	.bar {
		width: 100%;
		height: 8px;
	}
	.bar-ref {
		fill: var(--muted);
	}
	.bar-local {
		fill: var(--signal);
	}
	.value {
		text-align: right;
	}
	.footnote {
		grid-column: 1 / -1;
	}
	@media (max-width: 860px) {
		.clocks {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
