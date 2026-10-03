<script lang="ts">
	import type { LabState } from '#lib/state/lab.svelte.ts';
	import { ORBIT_T_PER_SECOND } from '#lib/simulation/engine.ts';
	import { fmtUpTo } from '#lib/content/format.ts';

	let { lab }: { lab: LabState } = $props();
	const running = $derived(lab.snapshot.transport === 'running');
	const exp = $derived(lab.scenario.experiment);
	const speeds = [0.25, 0.5, 1, 2, 4];
	const stepLabel = $derived(exp === 'clocks' ? 'Paso (+0,1 s)' : 'Paso (+0,1 T)');
	const scale = $derived(
		exp === 'clocks'
			? `1 s de referencia por segundo · ×${fmtUpTo(lab.scenario.playback.speed, 2)}`
			: `${ORBIT_T_PER_SECOND} rs/c por segundo de animación · ×${fmtUpTo(lab.scenario.playback.speed, 2)}`
	);
</script>

<div class="transport" role="group" aria-label="Transporte">
	<button
		class="btn btn-primary play"
		type="button"
		onclick={() => lab.togglePlay()}
		disabled={!lab.ready}
	>
		{#if running}
			<svg viewBox="0 0 20 20" aria-hidden="true"
				><path d="M6 4h3v12H6zM11 4h3v12h-3z" fill="currentColor" /></svg
			>
			Pausar
		{:else}
			<svg viewBox="0 0 20 20" aria-hidden="true"
				><path d="M6 4l10 6-10 6z" fill="currentColor" /></svg
			>
			{lab.snapshot.referenceSeconds > 0 || lab.snapshot.coordinateTime > 0
				? 'Continuar'
				: 'Iniciar'}
		{/if}
	</button>
	<button class="btn" type="button" onclick={() => lab.step()} disabled={running || !lab.ready}>
		{stepLabel}
	</button>
	<button class="btn" type="button" onclick={() => lab.resetExperiment()} disabled={!lab.ready}>
		Reiniciar experimento
	</button>
	<label class="speed">
		<span>Velocidad</span>
		<select
			class="input"
			value={lab.scenario.playback.speed}
			onchange={(e) => lab.setSpeed(Number(e.currentTarget.value))}
		>
			{#each speeds as s (s)}
				<option value={s}>×{fmtUpTo(s, 2)}</option>
			{/each}
		</select>
	</label>
	<p class="scale">{scale}</p>
</div>

<style>
	.transport {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
		align-items: center;
	}
	.play {
		min-width: 128px;
	}
	.speed {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		font-size: 0.875rem;
		color: var(--muted);
	}
	.speed select {
		width: auto;
		min-height: 44px;
	}
	.scale {
		flex-basis: 100%;
		font-size: var(--font-meta);
		color: var(--muted);
	}
</style>
