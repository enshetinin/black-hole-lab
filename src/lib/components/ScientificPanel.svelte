<script lang="ts">
	import type { LabState } from '#lib/state/lab.svelte.ts';
	import { CAPTURE_CUTOFF_RS, CRITICAL_IMPACT_RS } from '#lib/physics/constants.ts';
	import { MASSIVE_DEFAULTS } from '#lib/simulation/integrators/rk4.ts';
	import { VERLET_DEFAULTS } from '#lib/simulation/integrators/verlet.ts';
	import { fmt, fmtSci, fmtSig, fmtUpTo } from '#lib/content/format.ts';

	let { lab }: { lab: LabState } = $props();
	const s = $derived(lab.scenario);
	const selected = $derived(
		lab.snapshot.bodies.filter((b) => b.groupId === lab.selectedGroup).length > 0
			? lab.snapshot.bodies.filter((b) => b.groupId === lab.selectedGroup)
			: lab.snapshot.bodies.slice(-2)
	);

	const reasons: Record<string, string> = {
		'capture-cutoff': 'cutoff de captura alcanzado',
		'escape-confirmed': 'escape confirmado (energía y potencial)',
		'max-coordinate-time': 'T máximo de cálculo',
		'max-attempts': 'límite de pasos',
		'max-derivative-evaluations': 'límite de evaluaciones',
		cancelled: 'límite de tiempo de cálculo',
		'step-underflow': 'paso mínimo sin precisión',
		'non-finite-state': 'valor no finito',
		'time-not-increasing': 'T no creciente',
		'constraint-drift': 'deriva del invariante'
	};
</script>

<details class="science fold">
	<summary>Fórmulas, hipótesis y diagnóstico</summary>
	<div class="body">
		{#if s.experiment === 'clocks'}
			<p class="formula">rs = 2GM/c² = <span class="num">{fmtSig(lab.rsKm, 5)} km</span></p>
			<p class="formula">
				q = dτ/dt = √(1 − rs/r) = √(1 − 1/x) = √(1 − 1/{fmt(s.observer.radiusRs, 4)}) =
				<strong class="num">{fmt(lab.clockRate, 6)}</strong>
			</p>
			<p class="formula">
				Aceleración propia para sostenerse: a = GM/(r²√(1 − rs/r)) =
				<span class="num">{fmtSci(lab.staticAcceleration, 3)} m/s²</span>
			</p>
			<ul>
				<li>
					Compara un reloj estático con uno ideal muy lejano. Solo vale para x &gt; 1: no hay
					observador estático en el horizonte ni dentro.
				</li>
				<li>
					Dos relojes estáticos finitos a y b se comparan con √(f(a)/f(b)), no con q de uno solo.
				</li>
				<li>Un reloj en órbita o en caída incluye su movimiento: no usa solo √f (ver Órbitas).</li>
				<li>
					x es radio areal: una esfera de ese radio tiene área 4πr². No es altura sobre el horizonte
					ni distancia propia.
				</li>
			</ul>
		{:else if s.experiment === 'orbits'}
			<p class="formula">Normalización: v² + f(κ + ℓ²/x²) = E², f = 1 − 1/x, κ = 1</p>
			<p class="formula">dv/dS = −1/(2x²) + ℓ²/x³ − 3ℓ²/(2x⁴), dφ/dS = ℓ/x², dT/dS = E/f</p>
			<p class="formula">
				Lanzamiento local: E = γ√f₀, ℓ = γx₀βφ, v₀ = γ√f₀βr; velocidad local βr = v/E, βφ = ℓ√f/(xE)
			</p>
			<p class="formula">
				Newton: X″ = −X/(2R³), velocity Verlet con h = {fmtUpTo(VERLET_DEFAULTS.step, 3)} T; mismo estado
				coordenado: dr/dT = f₀βr, x₀dφ/dT = √f₀βφ
			</p>
			<ul>
				<li>
					RK4 adaptativo (step doubling) en S con atol {fmtSci(MASSIVE_DEFAULTS.atol, 0)}, rtol {fmtSci(
						MASSIVE_DEFAULTS.rtol,
						0
					)}, h ≤ {fmtUpTo(MASSIVE_DEFAULTS.hMax, 3)}; T máx. {MASSIVE_DEFAULTS.maxCoordinateTime} rs/c.
				</li>
				<li>
					Captura: cutoff numérico en x = {fmt(CAPTURE_CUTOFF_RS, 2)}; no redefine el horizonte (x =
					1).
				</li>
				<li>Ambas curvas se animan a la misma T, nunca al mismo tiempo propio.</li>
				<li>
					En una circular exacta las curvas pueden coincidir: Schwarzschild difiere en estabilidad y
					tiempo propio. Usa el preset de precesión para ver separación.
				</li>
			</ul>
		{:else}
			<p class="formula">
				κ = 0: v² + fℓ²/x² = E². B = ℓ/E; sinα = B√f₀/x₀ con emisión entrante (cosα &lt; 0).
			</p>
			<p class="formula">
				Bcrit = 3√3/2 ≈ <span class="num">{fmt(CRITICAL_IMPACT_RS, 6)}</span> (no es 1,5 ni 1: es un impacto,
				no un radio)
			</p>
			<ul>
				<li>
					|B| &lt; Bcrit: cruza la barrera y cae. |B| &gt; Bcrit: retorno exterior y dispersión.
				</li>
				<li>
					Cerca del crítico el rayo gira cerca de 1,5 rs (órbita inestable). No se promete una
					órbita eterna.
				</li>
				<li>
					λ es un parámetro afín normalizado a energía local 1 al emitir; no es tiempo propio. Los
					fotones no tienen reloj propio.
				</li>
				<li>
					Son trayectorias 2D a escala, no una imagen óptica. La sombra aparente (≈ Bcrit) no es el
					horizonte.
				</li>
			</ul>
		{/if}

		{#if s.experiment !== 'clocks' && selected.length > 0}
			<h3>Diagnóstico de integración</h3>
			<div class="table-wrap">
				<table>
					<thead>
						<tr>
							<th scope="col">Cuerpo</th>
							<th scope="col">E</th>
							<th scope="col">ℓ</th>
							<th scope="col">Pasos (rech.)</th>
							<th scope="col">Residual máx.</th>
							<th scope="col">Fin</th>
						</tr>
					</thead>
					<tbody>
						{#each selected as b (b.id)}
							{@const t = b.trajectory}
							<tr>
								<th scope="row"
									>{b.kind === 'photon'
										? 'Fotón'
										: b.model === 'newtonian'
											? 'Newton'
											: 'Schwarzschild'}</th
								>
								<td class="num"
									>{fmt(
										t.constants?.energy ?? t.newtonInvariants?.energy ?? NaN,
										6
									)}{t.newtonInvariants ? ' (E_N)' : ''}</td
								>
								<td class="num"
									>{fmt(
										t.constants?.angularMomentum ?? t.newtonInvariants?.angularMomentum ?? NaN,
										6
									)}</td
								>
								<td class="num">{t.diagnostics.acceptedSteps} ({t.diagnostics.rejectedSteps})</td>
								<td class="num">{fmtSci(t.diagnostics.maxConstraintResidual, 1)}</td>
								<td
									>{reasons[t.diagnostics.terminationReason] ?? t.diagnostics.terminationReason}</td
								>
							</tr>
							{#if t.turningPoints.filter((p) => p.type === 'pericenter').length >= 2}
								{@const peri = t.turningPoints.filter((p) => p.type === 'pericenter')}
								<tr>
									<td colspan="6" class="note">
										Periastros en φ = {peri
											.slice(0, 3)
											.map((p) => fmt(p.azimuthRad, 3))
											.join('; ')} rad · avance por vuelta
										{fmt(peri[1]!.azimuthRad - peri[0]!.azimuthRad - 2 * Math.PI, 3)} rad
									</td>
								</tr>
							{/if}
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>
</details>

<style>
	.body {
		padding: 0 0 var(--space-5);
		display: grid;
		gap: var(--space-2);
		font-size: 0.875rem;
		max-width: 80ch;
	}
	.formula {
		font-family: var(--font-mono);
		font-size: var(--font-meta);
		padding: var(--space-1) 0 var(--space-1) var(--space-3);
		border-left: 2px solid var(--control-line);
		overflow-wrap: anywhere;
	}
	ul {
		margin: var(--space-2) 0 0;
		padding-left: 1.2em;
		color: var(--muted);
		display: grid;
		gap: var(--space-1);
	}
	h3 {
		font-size: var(--font-ui);
		margin-top: var(--space-4);
	}
	.table-wrap {
		overflow-x: auto;
	}
	table {
		border-collapse: collapse;
		font-size: var(--font-meta);
		min-width: 520px;
		width: 100%;
	}
	th,
	td {
		text-align: left;
		padding: var(--space-1) var(--space-3) var(--space-1) 0;
		border-bottom: 1px solid var(--line);
	}
	thead th {
		color: var(--muted);
		font-weight: 400;
	}
	.note {
		color: var(--muted);
	}
</style>
