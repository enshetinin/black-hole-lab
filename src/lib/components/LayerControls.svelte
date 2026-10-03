<script lang="ts">
	import type { LabState } from '#lib/state/lab.svelte.ts';
	import type { Quality } from '#lib/scenarios/schema.ts';

	let { lab }: { lab: LabState } = $props();
	const layers = [
		{ key: 'disk', label: 'Disco (ilustrativo)' },
		{ key: 'grid', label: 'Malla (ilustrativa)' },
		{ key: 'references', label: 'Referencias' },
		{ key: 'trails', label: 'Trazas' },
		{ key: 'labels', label: 'Etiquetas' }
	] as const;
	const qualities: { value: Quality; label: string }[] = [
		{ value: 'low', label: 'Baja' },
		{ value: 'balanced', label: 'Equilibrada' },
		{ value: 'high', label: 'Alta' }
	];
</script>

<fieldset class="group">
	<legend>Capas</legend>
	<div class="grid">
		{#each layers as l (l.key)}
			<label>
				<input
					type="checkbox"
					checked={lab.scenario.view[l.key]}
					onchange={(e) => lab.setLayer(l.key, e.currentTarget.checked)}
				/>
				{l.label}
			</label>
		{/each}
	</div>
	<label class="quality">
		<span>Calidad visual</span>
		<select
			class="input"
			value={lab.scenario.view.quality}
			onchange={(e) => lab.setQuality(e.currentTarget.value as Quality)}
		>
			{#each qualities as q (q.value)}<option value={q.value}>{q.label}</option>{/each}
		</select>
	</label>
	<p class="hint">Las capas y la calidad solo cambian el dibujo, nunca la física.</p>
</fieldset>

<style>
	.grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-2) var(--space-3);
		font-size: 0.875rem;
	}
	.grid label {
		display: flex;
		gap: var(--space-2);
		align-items: center;
		min-height: 32px;
		cursor: pointer;
	}
	.quality {
		display: grid;
		gap: var(--space-1);
		font-size: var(--font-meta);
		color: var(--muted);
	}
</style>
