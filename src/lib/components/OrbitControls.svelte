<script lang="ts">
	import type { LabState } from '#lib/state/lab.svelte.ts';
	import {
		ORBIT_RADIUS_MAX_RS,
		ORBIT_RADIUS_MIN_RS,
		ORBIT_SPEED_MAX_C
	} from '#lib/physics/constants.ts';
	import { MAX_MASSIVE_LAUNCHES } from '#lib/simulation/engine.ts';
	import type { OrbitModel } from '#lib/scenarios/schema.ts';
	import { degToRad, fmt, radToDeg } from '#lib/content/format.ts';
	import { COPY } from '#lib/content/copy.ts';
	import NumberField from './NumberField.svelte';
	import PresetList from './PresetList.svelte';

	let { lab }: { lab: LabState } = $props();
	const o = $derived(lab.scenario.orbit);
	const models: { value: OrbitModel; label: string }[] = [
		{ value: 'schwarzschild', label: 'Schwarzschild' },
		{ value: 'newtonian', label: 'Newton' },
		{ value: 'compare', label: 'Comparar' }
	];
	const stabilityText = {
		stable: 'estable',
		marginal: 'marginalmente estable',
		unstable: 'inestable'
	} as const;
</script>

<div class="orbits">
	<PresetList {lab} experiment="orbits" />

	<fieldset class="group">
		<legend>Modelo</legend>
		<div class="segmented" role="radiogroup" aria-label="Modelo de la trayectoria">
			{#each models as m (m.value)}
				<label class:active={o.model === m.value}>
					<input
						type="radio"
						name="orbit-model"
						value={m.value}
						checked={o.model === m.value}
						onchange={() => lab.setOrbitModel(m.value)}
					/>
					{m.label}
				</label>
			{/each}
		</div>
		<p class="hint">
			{#if o.model === 'newtonian'}{COPY.newton}
			{:else if o.model === 'schwarzschild'}{COPY.schwarzschild}
			{:else}Ambas curvas parten del mismo evento con las mismas derivadas espaciales respecto a T y
				se animan a la misma T coordenada. Newton no tiene horizonte: su captura en 1,01 rs es una
				frontera impuesta.{/if}
		</p>
	</fieldset>

	<fieldset class="group">
		<legend>Condiciones iniciales</legend>
		<button
			class="btn"
			type="button"
			aria-pressed={lab.launchPrepared}
			onclick={() => (lab.launchPrepared = !lab.launchPrepared)}
		>
			{lab.launchPrepared ? 'Lanzamiento preparado · ocultar' : 'Preparar lanzamiento'}
		</button>
		{#if lab.launchPrepared}
			<p class="hint">
				En la escena: arrastra el punto para la posición y la punta de la flecha para la velocidad
				(120 px = 0,5c, máx. 0,95c).
			</p>
		{/if}
		<label class="field-label" for="orbit-radius-range">Radio inicial x (rs)</label>
		<input
			id="orbit-radius-range"
			type="range"
			min={ORBIT_RADIUS_MIN_RS}
			max={ORBIT_RADIUS_MAX_RS}
			step="0.01"
			value={o.radiusRs}
			aria-valuetext="{fmt(o.radiusRs, 2)} rs"
			oninput={(e) => lab.updateOrbit({ radiusRs: Number(e.currentTarget.value) })}
		/>
		<div class="pair">
			<NumberField
				id="orbit-radius"
				label="Radio x"
				value={o.radiusRs}
				min={ORBIT_RADIUS_MIN_RS}
				max={ORBIT_RADIUS_MAX_RS}
				unit="rs"
				onCommit={(v) => (lab.updateOrbit({ radiusRs: v }), null)}
			/>
			<NumberField
				id="orbit-angle"
				label="Posición φ"
				value={radToDeg(o.angleRad)}
				min={0}
				max={360}
				unit="°"
				decimals={1}
				onCommit={(v) => (lab.updateOrbit({ angleRad: degToRad(v) }), null)}
			/>
		</div>
		<label class="field-label" for="orbit-speed-range"
			>Rapidez local β (c), medida por un observador estático</label
		>
		<input
			id="orbit-speed-range"
			type="range"
			min="0"
			max={ORBIT_SPEED_MAX_C}
			step="0.001"
			value={o.speedLocalC}
			aria-valuetext="{fmt(o.speedLocalC, 3)} c"
			oninput={(e) => lab.updateOrbit({ speedLocalC: Number(e.currentTarget.value) })}
		/>
		<div class="pair">
			<NumberField
				id="orbit-speed"
				label="β local"
				value={o.speedLocalC}
				min={0}
				max={ORBIT_SPEED_MAX_C}
				unit="c"
				decimals={4}
				onCommit={(v) => (lab.updateOrbit({ speedLocalC: v }), null)}
			/>
			<NumberField
				id="orbit-direction"
				label="Dirección α"
				value={radToDeg(o.directionRad)}
				min={-180}
				max={180}
				unit="°"
				decimals={1}
				describedBy="orbit-direction-hint"
				onCommit={(v) => (lab.updateOrbit({ directionRad: degToRad(v) }), null)}
			/>
		</div>
		<p class="hint" id="orbit-direction-hint">
			α se mide desde la dirección radial exterior: 0° hacia fuera, 90° tangencial (+φ), 180° hacia
			dentro.
		</p>
		<button class="btn" type="button" onclick={() => lab.prepareCircular()}
			>Órbita circular en este radio</button
		>
	</fieldset>

	<div class="readout" aria-live="off">
		{#if lab.orbitLaunch.ok}
			<dl>
				<div>
					<dt>Energía E</dt>
					<dd class="num">{fmt(lab.orbitLaunch.value.constants.energy, 5)}</dd>
				</div>
				<div>
					<dt>Momento angular ℓ</dt>
					<dd class="num">{fmt(lab.orbitLaunch.value.constants.angularMomentum, 5)} rs·c</dd>
				</div>
				<div>
					<dt>dx/dS inicial (no es velocidad)</dt>
					<dd class="num">{fmt(lab.orbitLaunch.value.state.radialDerivative, 5)}</dd>
				</div>
				{#if lab.newtonLaunch.ok && o.model !== 'schwarzschild'}
					<div>
						<dt>Newton: dr/dT = f₀βr</dt>
						<dd class="num">{fmt(lab.newtonLaunch.value.radialCoordinateSpeedC, 5)} c</dd>
					</div>
					<div>
						<dt>Newton: x·dφ/dT = √f₀ βφ</dt>
						<dd class="num">{fmt(lab.newtonLaunch.value.tangentialCoordinateSpeedC, 5)} c</dd>
					</div>
				{/if}
			</dl>
		{:else}
			<p class="message" data-tone="danger">{lab.orbitLaunch.message}</p>
		{/if}
		{#if lab.orbitCircular.ok}
			<p class="hint">
				Circular en {fmt(o.radiusRs, 2)} rs: β = {fmt(lab.orbitCircular.value.localSpeedC, 4)} c,
				{stabilityText[lab.orbitCircular.value.stability]}; período
				{fmt(lab.orbitCircular.value.coordinatePeriod, 1)} rs/c.
			</p>
		{:else}
			<p class="hint">No hay órbita circular con masa en x ≤ 1,5 rs.</p>
		{/if}
	</div>

	{#if lab.notice && lab.scenario.experiment === 'orbits'}
		<p class="message" data-tone={lab.notice.tone}>{lab.notice.text}</p>
	{/if}

	<div class="actions">
		<button
			class="btn btn-primary"
			type="button"
			disabled={!lab.launchPrepared || lab.launching || !lab.ready}
			onclick={() => lab.launchOrbit()}
		>
			{lab.launching ? 'Calculando…' : o.model === 'compare' ? 'Lanzar par' : 'Lanzar'}
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
	<p class="hint">
		{lab.snapshot.massiveLaunches}/{MAX_MASSIVE_LAUNCHES} lanzamientos. Los nuevos cuerpos parten del
		T actual.
	</p>
	{#if lab.limitReached === 'massive'}
		<div class="message" data-tone="warning">
			<p>Límite de {MAX_MASSIVE_LAUNCHES} lanzamientos alcanzado.</p>
			<div class="actions">
				<button class="btn btn-small" type="button" onclick={() => lab.replaceOldestAndLaunch()}>
					Eliminar el más antiguo y lanzar
				</button>
				<button class="btn btn-small" type="button" onclick={() => lab.clearBodies()}
					>Limpiar todo</button
				>
			</div>
		</div>
	{/if}
</div>

<style>
	.orbits {
		display: grid;
		gap: var(--space-5);
	}
	.pair {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-3);
	}
	dl {
		margin: 0;
		display: grid;
		gap: 4px;
		font-size: var(--font-meta);
	}
	dl div {
		display: flex;
		justify-content: space-between;
		gap: var(--space-3);
	}
	dt {
		color: var(--muted);
	}
	dd {
		margin: 0;
	}
	.readout {
		display: grid;
		gap: var(--space-2);
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
