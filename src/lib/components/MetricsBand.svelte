<script lang="ts">
	import type { LabState } from '#lib/state/lab.svelte.ts';
	import { CRITICAL_IMPACT_RS } from '#lib/physics/constants.ts';
	import { fmt, fmtDuration, fmtSig, radToDeg } from '#lib/content/format.ts';
	import { COPY } from '#lib/content/copy.ts';

	let { lab }: { lab: LabState } = $props();
	const s = $derived(lab.scenario);

	type Metric = { label: string; value: string; unit?: string; hint?: string };
	const metrics = $derived.by<Metric[]>(() => {
		if (s.experiment === 'clocks') {
			return [
				{ label: 'Radio de Schwarzschild', value: fmtSig(lab.rsKm, 3), unit: 'km' },
				{
					label: 'Radio del observador',
					value: `${fmt(s.observer.radiusRs, 2)} rs`,
					unit: `${fmtSig(lab.observerKm, 3)} km`
				},
				{ label: 'Ritmo local', value: `${fmt(lab.clockRate, 3)}×`, hint: '√(1 − 1/x)' },
				{ label: '1 s local equivale a', value: fmt(1 / lab.clockRate, 3), unit: 's de referencia' }
			];
		}
		const T = lab.snapshot.coordinateTime;
		const common: Metric[] = [
			{ label: 'Tiempo coordenado T', value: fmt(T, 1), unit: 'rs/c' },
			{
				label: 'T en segundos',
				value: fmtDuration(T * lab.timeScale),
				hint: `rs/c = ${fmtDuration(lab.timeScale)}`
			}
		];
		if (s.experiment === 'orbits') {
			return [
				...common,
				{
					label: 'Lanzamiento',
					value: `${fmt(s.orbit.radiusRs, 2)} rs`,
					unit: `β ${fmt(s.orbit.speedLocalC, 3)} c`
				},
				{ label: 'Radio de Schwarzschild', value: fmtSig(lab.rsKm, 3), unit: 'km' }
			];
		}
		return [
			...common,
			{
				label: 'Impacto B',
				value: fmt(s.photon.impactParameterRs, 4),
				hint: `Bcrit ≈ ${fmt(CRITICAL_IMPACT_RS, 4)}`
			},
			{
				label: 'Ángulo local de emisión',
				value: lab.photonDirection.ok ? `${fmt(radToDeg(lab.photonDirection.value), 2)}°` : '—',
				hint: 'desde la radial exterior'
			}
		];
	});
</script>

<dl class="metrics">
	{#each metrics as m (m.label)}
		<div class="metric">
			<dt>{m.label}</dt>
			<dd>
				<span class="value num">{m.value}</span>
				{#if m.unit}<span class="unit num">{m.unit}</span>{/if}
				{#if m.hint}<span class="hint num">{m.hint}</span>{/if}
			</dd>
		</div>
	{/each}
</dl>
<p class="scale-note">{COPY.autoFrame}</p>

<style>
	/* Banda de métricas: una regla superior y alineación; sin tarjetas. */
	.metrics {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: var(--space-4) var(--space-5);
		margin: 0;
		padding-top: var(--space-4);
		border-top: 1px solid var(--line);
	}
	.metric {
		min-width: 0;
	}
	dt {
		font-size: var(--font-meta);
		color: var(--muted);
	}
	dd {
		margin: var(--space-1) 0 0;
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 2px 6px;
	}
	.value {
		font-size: 1.625rem;
		font-weight: 500;
		letter-spacing: -0.015em;
	}
	.unit,
	.hint {
		font-size: var(--font-meta);
		color: var(--muted);
	}
	.hint {
		flex-basis: 100%;
	}
	.scale-note {
		font-size: var(--font-meta);
		color: var(--muted);
		margin-top: calc(-1 * var(--space-3));
	}
	@media (max-width: 860px) {
		.metrics {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
	@media (max-width: 360px) {
		.value {
			font-size: 1.25rem;
		}
	}
</style>
