<script lang="ts">
	import type { LabState } from '#lib/state/lab.svelte.ts';
	import { OBSERVER_MAX_RS, OBSERVER_MIN_RS } from '#lib/physics/constants.ts';
	import { fmt, fmtSig } from '#lib/content/format.ts';
	import { COPY } from '#lib/content/copy.ts';
	import LogSlider from './LogSlider.svelte';
	import NumberField from './NumberField.svelte';

	let { lab }: { lab: LabState } = $props();
	const x = $derived(lab.scenario.observer.radiusRs);
	const lock = $derived(lab.scenario.observer.distanceLock);

	/** Acercar/alejar en escala de altura relativa: x' = 1 + (x − 1)·k. */
	function nudge(factor: number) {
		const next = Math.min(OBSERVER_MAX_RS, Math.max(OBSERVER_MIN_RS, 1 + (x - 1) * factor));
		lab.setObserverRadius(next);
	}
</script>

<fieldset class="group">
	<legend>Observador estático</legend>
	<LogSlider
		id="observer-slider"
		label={COPY.observerLabel}
		value={x}
		min={OBSERVER_MIN_RS}
		max={OBSERVER_MAX_RS}
		valueText="{fmt(x, 2)} radios de Schwarzschild, {fmtSig(lab.observerKm, 3)} kilómetros"
		onInput={(v) => lab.setObserverRadius(v)}
	/>
	<div class="pair">
		<NumberField
			id="observer-rs"
			label="Radio (rs)"
			value={x}
			min={OBSERVER_MIN_RS}
			max={OBSERVER_MAX_RS}
			unit="rs"
			decimals={3}
			onCommit={(v) => (lab.setObserverRadius(v) ? null : 'Radio no válido.')}
		/>
		<NumberField
			id="observer-km"
			label="Radio (km)"
			value={lab.observerKm}
			min={OBSERVER_MIN_RS * lab.rsKm}
			max={OBSERVER_MAX_RS * lab.rsKm}
			unit="km"
			decimals={1}
			onCommit={(km) => (lab.setObserverRadius(km / lab.rsKm) ? null : 'Radio no válido.')}
		/>
	</div>
	<div class="nudge">
		<button
			class="btn btn-small"
			type="button"
			onclick={() => nudge(0.8)}
			disabled={x <= OBSERVER_MIN_RS}
		>
			<svg viewBox="0 0 20 20" aria-hidden="true"
				><path d="M13 5l-5 5 5 5" fill="none" stroke="currentColor" stroke-width="2" /></svg
			>
			Acercar
		</button>
		<button
			class="btn btn-small"
			type="button"
			onclick={() => nudge(1.25)}
			disabled={x >= OBSERVER_MAX_RS}
		>
			Alejar
			<svg viewBox="0 0 20 20" aria-hidden="true"
				><path d="M7 5l5 5-5 5" fill="none" stroke="currentColor" stroke-width="2" /></svg
			>
		</button>
	</div>
	{#if x <= OBSERVER_MIN_RS + 1e-9}
		<p class="message" data-tone="warning">
			Límite de la app: 1,01 rs. No hay observador estático en el horizonte.
		</p>
	{/if}
	<div class="lock" role="radiogroup" aria-label="Al cambiar la masa">
		<label>
			<input
				type="radio"
				name="distance-lock"
				value="rs"
				checked={lock === 'rs'}
				onchange={() => lab.setDistanceLock('rs')}
			/>
			{COPY.lockRs}
		</label>
		<label>
			<input
				type="radio"
				name="distance-lock"
				value="km"
				checked={lock === 'km'}
				onchange={() => lab.setDistanceLock('km')}
			/>
			{COPY.lockKm}
		</label>
	</div>
	<p class="hint">
		Distancia = radio areal desde el centro (no altura sobre el horizonte ni distancia propia).
	</p>
</fieldset>

<style>
	.pair {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-3);
	}
	.nudge {
		display: flex;
		gap: var(--space-2);
	}
	.nudge .btn {
		flex: 1;
	}
	.lock {
		display: grid;
		gap: var(--space-2);
		font-size: 0.875rem;
		margin-top: var(--space-1);
	}
	.lock label {
		display: flex;
		gap: var(--space-2);
		align-items: flex-start;
		min-height: 28px;
		cursor: pointer;
	}
	.lock input {
		margin-top: 2px;
		flex: none;
	}
</style>
