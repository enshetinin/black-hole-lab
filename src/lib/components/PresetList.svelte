<script lang="ts">
	import type { LabState } from '#lib/state/lab.svelte.ts';
	import { PRESETS, presetScenario } from '#lib/scenarios/presets.ts';
	import type { Experiment } from '#lib/scenarios/schema.ts';

	let { lab, experiment }: { lab: LabState; experiment: Experiment } = $props();
	const presets = $derived(PRESETS.filter((p) => p.experiment === experiment));

	function apply(id: string, title: string) {
		const scenario = presetScenario(id);
		if (!scenario) return;
		// Los presets fijan las condiciones del experimento; la vista actual se conserva.
		scenario.view = { ...lab.scenario.view };
		lab.applyScenario(scenario, `Preset «${title}» cargado en pausa.`);
		if (experiment === 'orbits') lab.launchPrepared = true;
	}
</script>

<div class="presets" role="group" aria-label="Presets">
	<p class="label">Presets</p>
	<ul>
		{#each presets as p (p.id)}
			<li>
				<button
					class="btn btn-small preset"
					type="button"
					onclick={() => apply(p.id, p.title)}
					data-preset={p.id}
				>
					<span class="title">{p.title}</span>
					<span class="desc">{p.expected}</span>
				</button>
			</li>
		{/each}
	</ul>
</div>

<style>
	.presets {
		display: grid;
		gap: var(--space-1);
	}
	.label {
		font-size: var(--font-meta);
		color: var(--muted);
	}
	ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
	}
	/* Filas de texto alineadas, sin cajas: la regla izquierda aparece al interactuar. */
	.preset {
		width: 100%;
		display: grid;
		justify-content: stretch;
		justify-items: start;
		text-align: left;
		gap: 0;
		padding: var(--space-2) var(--space-3);
		margin-left: calc(-1 * var(--space-3));
		width: calc(100% + var(--space-3));
		white-space: normal;
		height: auto;
		border: 0;
		border-left: 2px solid transparent;
		border-radius: 0;
	}
	.preset:hover:not(:disabled) {
		background: var(--surface);
		border-left-color: var(--text);
	}
	.title {
		font-weight: 500;
	}
	.desc {
		font-size: var(--font-meta);
		font-weight: 400;
		color: var(--muted);
	}
</style>
