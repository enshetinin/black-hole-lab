<script lang="ts">
	import { resolve } from '$app/paths';
	import { SOURCES } from '#lib/content/sources.ts';
	import { C_SI, G_SI, SOLAR_MASS_KG } from '#lib/physics/constants.ts';
	import { fmtSci } from '#lib/content/format.ts';
</script>

<svelte:head>
	<title>Modelo y fuentes · Black Hole Lab</title>
	<meta
		name="description"
		content="Hipótesis, ecuaciones, límites y fuentes del laboratorio de relatividad Black Hole Lab."
	/>
</svelte:head>

<article class="about">
	<h1>Modelo y fuentes</h1>
	<p class="lead">
		Black Hole Lab calcula con un único modelo físico: un agujero negro de Schwarzschild aislado,
		sin rotación ni carga, con partículas de prueba que no lo perturban. Esta página enumera qué se
		calcula, qué es ilustración y dónde están los límites.
	</p>

	<section>
		<h2>Hipótesis</h2>
		<ul>
			<li>
				Masa central constante en cada experimento (3–100 M☉). Cambiarla inicia un experimento
				nuevo, no simula crecimiento.
			</li>
			<li>
				Trayectorias en el plano ecuatorial, posible por simetría esférica. Exterior de vacío.
			</li>
			<li>
				No se calculan el gas del disco, su emisión, campos magnéticos, gravitación mutua ni el
				interior del horizonte.
			</li>
			<li>
				Constantes del proyecto: G = {fmtSci(G_SI, 5)} m³ kg⁻¹ s⁻², c = {C_SI} m/s, M☉ = {fmtSci(
					SOLAR_MASS_KG,
					5
				)} kg (valor convencional de referencia).
			</li>
		</ul>
	</section>

	<section>
		<h2>Unidades y distancias</h2>
		<p>
			El motor usa rs = 2GM/c² como unidad: x = r/rs, T = ct/rs y, para partículas con masa, S =
			cτ/rs. La distancia es el <strong>radio areal</strong> desde el centro (una esfera de ese radio
			tiene área 4πr²); no es la altura sobre el horizonte ni la distancia propia medida con reglas. La
			vista muestra coordenadas a escala, no una fotografía.
		</p>
	</section>

	<section>
		<h2>Tres relojes distintos</h2>
		<ul>
			<li>
				<strong>Reloj estático</strong> en x &gt; 1: dτ/dt = √(1 − 1/x) respecto a un reloj ideal muy
				lejano. No existe observador estático en el horizonte ni dentro. Sostenerse exige una aceleración
				propia a = GM/(r²√(1 − rs/r)) que diverge al acercarse.
			</li>
			<li>
				<strong>Relojes didácticos</strong>: la pestaña Relojes acumula 1 s de referencia por
				segundo de reproducción a ×1 y suma q·dt. Mover el observador equivale a recolocar
				lentamente un reloj ideal; el traslado no se simula.
			</li>
			<li>
				<strong>Tiempo propio orbital</strong>: en Órbitas τ se integra a lo largo de la geodésica;
				no es el q del reloj estático. Para una circular, dτ/dt = √(1 − 3/(2x)).
			</li>
			<li>
				<strong>Fotones</strong>: intervalo propio nulo, sin reloj. Su parámetro afín λ es una
				herramienta de cálculo.
			</li>
		</ul>
	</section>

	<section>
		<h2>Radios de referencia</h2>
		<ul>
			<li><strong>Horizonte</strong> (1 rs): frontera causal. La app no integra hasta él.</li>
			<li><strong>Esfera de fotones</strong> (1,5 rs): órbita circular inestable de la luz.</li>
			<li>
				<strong>ISCO</strong> (3 rs): órbitas circulares con masa estables para x &gt; 3, marginal en
				x = 3 e inestables entre 1,5 y 3 rs. No existen circulares con masa en x ≤ 1,5. No es una pared.
			</li>
			<li>
				<strong>Impacto crítico</strong> Bcrit = 3√3/2 ≈ 2,598: parámetro de impacto, no un radio.
				La
				<em>sombra</em> observada tiene un tamaño ligado a él y depende del observador; el círculo negro
				de la vista es el horizonte a escala, no la sombra.
			</li>
		</ul>
	</section>

	<section>
		<h2>Ecuaciones e integración</h2>
		<p class="formula">v² + f(κ + ℓ²/x²) = E², f = 1 − 1/x (κ = 1 masa, κ = 0 luz)</p>
		<p class="formula">
			dx/dλ = v · dv/dλ = −κ/(2x²) + ℓ²/x³ − 3ℓ²/(2x⁴) · dφ/dλ = ℓ/x² · dT/dλ = E/f
		</p>
		<ul>
			<li>
				RK4 adaptativo con step doubling (atol 10⁻⁹, rtol 10⁻⁸). E y ℓ son constantes por
				construcción; el residual de la normalización se monitoriza como diagnóstico.
			</li>
			<li>
				Captura: el cálculo se detiene en el cutoff numérico x = 1,01 cerca del horizonte, que no lo
				redefine. T crece sin límite al acercarse a x = 1: no se muestra un cruce en tiempo
				coordenado finito.
			</li>
			<li>
				Escape: solo se declara cuando la energía y el potencial garantizan que no hay retorno.
				Salir del área visible no prueba escape.
			</li>
			<li>
				Límites de cálculo (pasos, T máximo, tiempo de cálculo): la trayectoria queda marcada como
				parcial, nunca como estable.
			</li>
			<li>
				Newton: X″ = −X/(2R³) con velocity Verlet. No tiene horizonte; la captura en 1,01 rs es una
				frontera impuesta para comparar.
			</li>
			<li>
				Comparación: ambos modelos parten del mismo evento con dr/dT = f₀βr y x₀dφ/dT = √f₀βφ y se
				animan a la misma T coordenada. No comparten la misma tétrada local.
			</li>
		</ul>
	</section>

	<section>
		<h2>Ilustraciones</h2>
		<ul>
			<li>
				<strong>Disco</strong>: composición artística entre 3 y 7 rs. No se calcula la física del
				gas ni su emisión.
			</li>
			<li>
				<strong>Malla</strong>: analogía visual; no representa literalmente el espacio-tiempo ni
				resuelve las ecuaciones de Einstein.
			</li>
			<li><strong>Halo</strong> y estrellas: decoración con semilla fija.</li>
			<li>
				Las trayectorias de fotones son curvas 2D a escala; no es un trazado de rayos de imagen.
			</li>
		</ul>
	</section>

	<section>
		<h2>Fuera de alcance</h2>
		<p>
			Rotación (Kerr), imagen óptica completa, 3D, hidrodinámica del disco, espectros, ondas
			gravitatorias, radiación de Hawking e interior del horizonte. Esta simulación no ha sido
			certificada ni revisada externamente por físicos.
		</p>
	</section>

	<section>
		<h2>Fuentes</h2>
		<ul class="sources">
			{#each SOURCES as s (s.url)}
				<li>
					<a href={s.url} rel="noopener noreferrer">{s.title}</a> — {s.org}.
					<span class="use">{s.use}</span>
				</li>
			{/each}
		</ul>
	</section>

	<section>
		<h2>Privacidad</h2>
		<p>
			No hay servidor, cuentas, cookies ni telemetría. El escenario se guarda solo en el
			almacenamiento local de tu navegador y en los enlaces o archivos que tú compartas.
		</p>
	</section>

	<p class="back"><a href={resolve('/')}>← Volver al laboratorio</a></p>
</article>

<style>
	/* Dialecto de lectura: contexto (títulos) 3 columnas / lectura 7, desplazada del centro. */
	.about {
		display: grid;
		grid-template-columns: repeat(12, minmax(0, 1fr));
		column-gap: 20px;
		row-gap: var(--space-7);
		padding-top: var(--space-6);
	}
	h1 {
		grid-column: 1 / span 8;
		font-family: var(--font-serif);
		font-weight: 400;
		font-size: clamp(2.25rem, 5vw, 3.5rem);
		line-height: 1.05;
		letter-spacing: -0.02em;
	}
	.lead {
		grid-column: 4 / span 7;
		font-family: var(--font-serif);
		font-size: var(--font-lead);
		line-height: 1.4;
		max-width: 62ch;
		margin-top: calc(-1 * var(--space-5));
	}
	section {
		grid-column: 1 / -1;
		display: grid;
		grid-template-columns: subgrid;
	}
	h2 {
		grid-column: 1 / span 3;
		font-size: var(--font-ui);
		font-weight: 500;
		padding-top: 0.35em;
	}
	section > :not(h2) {
		grid-column: 4 / span 7;
		max-width: 62ch;
	}
	section > :not(h2) + :not(h2) {
		margin-top: var(--space-3);
	}
	p,
	li {
		font-family: var(--font-serif);
		font-size: 1.125rem;
		line-height: 1.6;
	}
	ul {
		margin: 0;
		padding-left: 1.2em;
		display: grid;
		gap: var(--space-3);
	}
	li strong {
		font-family: var(--font-sans);
		font-weight: 500;
		font-size: 1rem;
	}
	.formula {
		font-family: var(--font-mono);
		font-size: 0.875rem;
		line-height: 1.5;
		padding: var(--space-1) 0 var(--space-1) var(--space-3);
		border-left: 2px solid var(--control-line);
		overflow-wrap: anywhere;
	}
	.sources a {
		font-family: var(--font-sans);
		font-size: 1rem;
	}
	.use {
		color: var(--muted);
	}
	.back {
		grid-column: 4 / span 7;
		font-family: var(--font-sans);
		font-size: 1rem;
	}
	@media (max-width: 860px) {
		h1,
		.lead,
		h2,
		section > :not(h2),
		.back {
			grid-column: 1 / -1;
		}
		.lead {
			margin-top: calc(-1 * var(--space-5));
		}
		.about {
			row-gap: var(--space-6);
		}
		section {
			row-gap: var(--space-2);
		}
	}
</style>
