<script lang="ts">
	import type { LabState } from '#lib/state/lab.svelte.ts';
	import { MASS_MAX_SOLAR, MASS_MIN_SOLAR } from '#lib/physics/constants.ts';
	import { fmt, fmtSig, fmtDuration } from '#lib/content/format.ts';
	import LogSlider from './LogSlider.svelte';
	import NumberField from './NumberField.svelte';

	let { lab }: { lab: LabState } = $props();
	const mass = $derived(lab.scenario.massSolar);
</script>

<fieldset class="group">
	<legend>Masa del agujero negro</legend>
	<LogSlider
		id="mass-slider"
		label="Masa (escala logarítmica)"
		value={mass}
		min={MASS_MIN_SOLAR}
		max={MASS_MAX_SOLAR}
		valueText="{fmt(mass, 1)} masas solares"
		onInput={(m) => lab.setMass(m)}
		onChange={(m) => lab.setMass(m, true)}
	/>
	<div class="ticks" aria-hidden="true">
		<span>3</span><span>10</span><span>30</span><span>100 M☉</span>
	</div>
	<NumberField
		id="mass-input"
		label="Masa"
		value={mass}
		min={MASS_MIN_SOLAR}
		max={MASS_MAX_SOLAR}
		unit="M☉"
		decimals={1}
		onCommit={(m) => (lab.setMass(m, true) ? null : (lab.notice?.text ?? 'Valor no aceptado.'))}
	/>
	<p class="derived">
		rs = 2GM/c² = <strong class="num">{fmtSig(lab.rsKm, 3)} km</strong> · rs/c =
		<span class="num">{fmtDuration(lab.timeScale)}</span>
	</p>
	{#if lab.massRejected !== null}
		<div class="message" data-tone="warning">
			<p>{lab.notice?.text}</p>
			<button class="btn btn-small" type="button" onclick={() => lab.acceptMassInRsScale()}>
				Usar escala rs y aplicar {fmt(lab.massRejected, 1)} M☉
			</button>
		</div>
	{/if}
	<p class="hint">Cambiar la masa inicia un experimento nuevo: reinicia relojes y trayectorias.</p>
</fieldset>

<style>
	.ticks {
		display: flex;
		justify-content: space-between;
		font-size: var(--font-meta);
		color: var(--muted);
		margin-top: -4px;
	}
	.derived {
		font-size: var(--font-meta);
		color: var(--muted);
	}
	.derived strong {
		color: var(--text);
		font-weight: 500;
	}
	.message {
		display: grid;
		gap: var(--space-2);
	}
</style>
