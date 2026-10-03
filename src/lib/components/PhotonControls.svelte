<script lang="ts">
	import type { LabState } from '#lib/state/lab.svelte.ts';
	import {
		CRITICAL_IMPACT_RS,
		PHOTON_EMITTER_MAX_RS,
		PHOTON_EMITTER_MIN_RS,
		PHOTON_IMPACT_MAX_RS
	} from '#lib/physics/constants.ts';
	import { maxImpactParameter } from '#lib/physics/initialConditions.ts';
	import { MAX_PHOTONS } from '#lib/simulation/engine.ts';
	import { degToRad, fmt, radToDeg } from '#lib/content/format.ts';
	import { COPY, STATUS_LABEL } from '#lib/content/copy.ts';
	import NumberField from './NumberField.svelte';
	import PresetList from './PresetList.svelte';

	let { lab }: { lab: LabState } = $props();
	const p = $derived(lab.scenario.photon);
	const magnitude = $derived(Math.abs(p.impactParameterRs));
	const sign = $derived(p.impactParameterRs < 0 ? -1 : 1);
	const nearCritical = $derived(Math.abs(magnitude / CRITICAL_IMPACT_RS - 1) < 0.01);
	let advanced = $state(false);

	function setMagnitude(b: number) {
		return lab.updatePhoton({ impactParameterRs: sign * b });
	}

	const previewOutcome = $derived.by(() => {
		const t = lab.photonPreview;
		if (!t) return null;
		const peri = t.turningPoints.find((tp) => tp.type === 'pericenter');
		return { status: t.status, peri: peri?.radiusRs ?? null };
	});
</script>

<div class="photons">
	<PresetList {lab} experiment="photons" />

	<fieldset class="group">
		<legend>Parámetro de impacto</legend>
		<label class="field-label" for="impact-range">|B| = |b|/rs = |ℓ/E|</label>
		<input
			id="impact-range"
			type="range"
			min="0"
			max={PHOTON_IMPACT_MAX_RS}
			step="0.0005"
			value={magnitude}
			aria-valuetext="B {fmt(magnitude, 4)}"
			oninput={(e) => setMagnitude(Number(e.currentTarget.value))}
		/>
		<div class="ticks" aria-hidden="true">
			<span>0</span>
			<span class="crit" style="left: {(CRITICAL_IMPACT_RS / PHOTON_IMPACT_MAX_RS) * 100}%"
				>Bcrit</span
			>
			<span>5</span>
		</div>
		<NumberField
			id="impact-input"
			label="|B|"
			value={magnitude}
			min={0}
			max={PHOTON_IMPACT_MAX_RS}
			decimals={6}
			onCommit={(v) => (setMagnitude(v) ? null : (lab.notice?.text ?? 'Valor no válido.'))}
		/>
		<div class="segmented two" role="radiogroup" aria-label="Lado del rayo">
			<label class:active={sign > 0}>
				<input
					type="radio"
					name="photon-side"
					checked={sign > 0}
					onchange={() => lab.updatePhoton({ impactParameterRs: magnitude })}
				/>
				Pasa por arriba (B &gt; 0)
			</label>
			<label class:active={sign < 0}>
				<input
					type="radio"
					name="photon-side"
					checked={sign < 0}
					onchange={() => lab.updatePhoton({ impactParameterRs: -magnitude })}
				/>
				Por abajo (B &lt; 0)
			</label>
		</div>
		<p class="hint">
			Bcrit = 3√3/2 ≈ {fmt(CRITICAL_IMPACT_RS, 4)}. Dirección local de emisión derivada:
			{#if lab.photonDirection.ok}<span class="num"
					>α = {fmt(radToDeg(lab.photonDirection.value), 2)}°</span
				> desde la radial exterior.{/if}
			B caracteriza la trayectoria; con un emisor finito no es una distancia en pantalla.
		</p>
		{#if nearCritical}
			<p class="message" data-tone="warning">
				{COPY.photonCritical} Próximo a la órbita inestable: no es una órbita eterna.
			</p>
		{/if}
	</fieldset>

	<button
		class="btn btn-small btn-ghost"
		type="button"
		aria-expanded={advanced}
		onclick={() => (advanced = !advanced)}
	>
		{advanced ? 'Ocultar emisor' : 'Ajustar emisor (avanzado)'}
	</button>
	{#if advanced}
		<div class="pair">
			<NumberField
				id="emitter-radius"
				label="Radio del emisor x₀"
				value={p.emissionRadiusRs}
				min={PHOTON_EMITTER_MIN_RS}
				max={PHOTON_EMITTER_MAX_RS}
				unit="rs"
				decimals={2}
				onCommit={(v) =>
					lab.updatePhoton({ emissionRadiusRs: v }) ? null : (lab.notice?.text ?? 'No válido.')}
			/>
			<NumberField
				id="emitter-angle"
				label="Posición φ₀"
				value={radToDeg(p.emissionAngleRad)}
				min={0}
				max={360}
				unit="°"
				decimals={1}
				onCommit={(v) => (lab.updatePhoton({ emissionAngleRad: degToRad(v) }), null)}
			/>
		</div>
		<p class="hint">
			Con x₀ = {fmt(p.emissionRadiusRs, 2)} rs, |B| máximo = x₀/√f₀ = {fmt(
				maxImpactParameter(p.emissionRadiusRs),
				3
			)}.
		</p>
	{/if}

	<div class="readout">
		<p class="label">Trayectoria prevista (en pausa)</p>
		{#if lab.previewPending && !lab.photonPreview}
			<p class="hint">Calculando…</p>
		{:else if previewOutcome}
			<p>
				<strong>{STATUS_LABEL[previewOutcome.status]}</strong>
				{#if previewOutcome.peri !== null}· periastro {fmt(previewOutcome.peri, 3)} rs{/if}
			</p>
		{/if}
		<p class="hint">{COPY.photonTime}</p>
	</div>

	{#if lab.notice && lab.scenario.experiment === 'photons'}
		<p class="message" data-tone={lab.notice.tone}>{lab.notice.text}</p>
	{/if}

	<div class="actions">
		<button
			class="btn btn-primary"
			type="button"
			disabled={lab.launching || !lab.ready}
			onclick={() => lab.launchPhoton()}
		>
			{lab.launching ? 'Calculando…' : 'Emitir fotón'}
		</button>
		<button
			class="btn"
			type="button"
			disabled={lab.snapshot.bodies.length === 0}
			onclick={() => lab.clearBodies()}
		>
			Limpiar trayectorias
		</button>
	</div>
	<p class="hint">{lab.snapshot.photonCount}/{MAX_PHOTONS} fotones.</p>
	{#if lab.limitReached === 'photon'}
		<div class="message" data-tone="warning">
			<p>Límite de {MAX_PHOTONS} fotones alcanzado.</p>
			<div class="actions">
				<button class="btn btn-small" type="button" onclick={() => lab.replaceOldestAndLaunch()}
					>Eliminar el más antiguo y emitir</button
				>
				<button class="btn btn-small" type="button" onclick={() => lab.clearBodies()}
					>Limpiar todo</button
				>
			</div>
		</div>
	{/if}
</div>

<style>
	.photons {
		display: grid;
		gap: var(--space-5);
	}
	.ticks {
		position: relative;
		display: flex;
		justify-content: space-between;
		font-size: var(--font-meta);
		color: var(--muted);
		height: 16px;
		margin-top: -4px;
	}
	.crit {
		position: absolute;
		transform: translateX(-50%);
		color: var(--data-gr);
	}
	.pair {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-3);
	}
	.readout {
		display: grid;
		gap: var(--space-2);
	}
	.label {
		font-size: var(--font-meta);
		color: var(--muted);
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
	}
	.message {
		display: grid;
		gap: var(--space-2);
	}
</style>
