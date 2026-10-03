<script lang="ts">
	import type { LabState } from '#lib/state/lab.svelte.ts';
	import type { BodyReadout } from '#lib/simulation/engine.ts';
	import type { BodyStatus } from '#lib/simulation/types.ts';
	import { fmt, fmtDuration, fmtSci } from '#lib/content/format.ts';
	import { MODEL_LABEL, STATUS_LABEL } from '#lib/content/copy.ts';

	let { lab }: { lab: LabState } = $props();
	const bodies = $derived(lab.snapshot.bodies);
	const visibleRadius = $derived(lab.extentRs / lab.scenario.view.zoom);
	const photons = $derived(lab.scenario.experiment === 'photons');

	/** "Fuera del área" es un estado visual: no prueba escape. */
	function displayStatus(b: BodyReadout): BodyStatus {
		if (b.status === 'active' && b.radiusRs > visibleRadius) return 'out-of-view';
		return b.status;
	}

	function toneOf(s: BodyStatus): string {
		if (s === 'captured' || s === 'numerical-error') return 'danger';
		if (s === 'budget-exceeded' || s === 'out-of-view') return 'warning';
		if (s === 'escaped') return 'success';
		return 'info';
	}

	function nameOf(b: BodyReadout, i: number): string {
		return b.kind === 'photon'
			? `Fotón ${i + 1}`
			: `${MODEL_LABEL[b.model]} · ${b.groupId.slice(1)}`;
	}
</script>

{#if bodies.length > 0}
	<div class="table-wrap">
		<table class="bodies">
			<caption>
				{photons ? 'Fotones' : 'Partículas'} sobre la misma T coordenada · T =
				<span class="num">{fmt(lab.snapshot.coordinateTime, 1)} rs/c</span>
			</caption>
			<thead>
				<tr>
					<th scope="col">Cuerpo</th>
					<th scope="col">Estado</th>
					<th scope="col">x (rs)</th>
					<th scope="col">Edad T</th>
					{#if !photons}<th scope="col">Tiempo propio τ</th>{/if}
					<th scope="col">{photons ? 'Rapidez local' : 'Rapidez'}</th>
					<th scope="col">Residual máx.</th>
				</tr>
			</thead>
			<tbody>
				{#each bodies as b, i (b.id)}
					{@const status = displayStatus(b)}
					<tr class:selected={lab.selectedGroup === b.groupId}>
						<th scope="row">
							<button
								class="row-btn"
								type="button"
								aria-pressed={lab.selectedGroup === b.groupId}
								onclick={() =>
									(lab.selectedGroup = lab.selectedGroup === b.groupId ? null : b.groupId)}
							>
								<span
									class="mark"
									data-model={b.kind === 'photon' ? 'photon' : b.model}
									aria-hidden="true"
								></span>
								{nameOf(b, i)}
							</button>
						</th>
						<td><span class="status" data-tone={toneOf(status)}>{STATUS_LABEL[status]}</span></td>
						<td class="num">{fmt(b.radiusRs, 3)}</td>
						<td class="num">{fmt(b.ageCoordinateTime, 1)}</td>
						{#if !photons}
							<td class="num">
								{#if b.properTime !== null}
									{fmt(b.properTime, 1)} · {fmtDuration(b.properTime * lab.timeScale)}
								{:else}
									<span class="muted">No aplica (Newton)</span>
								{/if}
							</td>
						{/if}
						<td class="num">
							{#if b.kind === 'photon'}
								c (sin reloj propio)
							{:else if b.localSpeedC !== null}
								{fmt(b.localSpeedC, 3)} c local
							{:else if b.coordinateSpeedC !== null}
								{fmt(b.coordinateSpeedC, 3)} c coord.
							{/if}
						</td>
						<td class="num">{fmtSci(b.trajectory.diagnostics.maxConstraintResidual, 1)}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
	<p class="hint">
		{#if photons}
			Los fotones no tienen tiempo propio: el parámetro afín λ es una herramienta de cálculo.
		{:else}
			τ se integra a lo largo de la geodésica (no es el ritmo de un reloj estático). Newton usa un
			tiempo absoluto. Residual: Schwarzschild |v² + f(κ+ℓ²/x²) − E²| normalizado; Newton, error
			relativo de energía.
		{/if}
		Pulsa el nombre de un cuerpo para resaltar su curva.
	</p>
{/if}

<style>
	.table-wrap {
		overflow-x: auto;
	}
	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.875rem;
		min-width: 560px;
	}
	caption {
		text-align: left;
		padding: 0 0 var(--space-2);
		color: var(--muted);
		font-size: var(--font-meta);
	}
	th,
	td {
		padding: var(--space-2) var(--space-4) var(--space-2) 0;
		text-align: left;
		border-bottom: 1px solid var(--line);
		white-space: nowrap;
	}
	td.num {
		text-align: right;
	}
	thead th {
		color: var(--muted);
		font-weight: 400;
		font-size: var(--font-meta);
		border-bottom-color: var(--control-line);
	}
	.row-btn {
		background: none;
		border: 0;
		padding: 4px 0;
		font-weight: 500;
		cursor: pointer;
		text-align: left;
		text-decoration: underline;
		text-decoration-color: transparent;
		text-underline-offset: 0.2em;
	}
	.row-btn:hover,
	.row-btn[aria-pressed='true'] {
		text-decoration-color: currentColor;
	}
	tbody tr.selected {
		background: var(--surface);
	}
	tbody th {
		font-weight: 500;
	}
	.mark {
		display: inline-block;
		width: 16px;
		vertical-align: middle;
		margin-right: 6px;
		border-top: 2.5px solid var(--data-gr);
	}
	.mark[data-model='newtonian'] {
		border-top: 2px dashed var(--data-newton);
	}
	.mark[data-model='photon'] {
		border-top: 2px solid var(--data-photon);
	}
	.status::before {
		content: '';
		display: inline-block;
		width: 6px;
		height: 6px;
		margin-right: 6px;
		vertical-align: middle;
		background: currentColor;
	}
	.status[data-tone='danger'] {
		color: var(--danger);
	}
	.status[data-tone='warning'] {
		color: var(--warning);
	}
	.status[data-tone='success'] {
		color: var(--success);
	}
	.muted {
		color: var(--muted);
	}
	.hint {
		margin-top: var(--space-2);
	}
</style>
