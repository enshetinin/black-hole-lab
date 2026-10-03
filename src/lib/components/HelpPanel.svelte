<script lang="ts">
	import { CONCEPTS } from '#lib/content/concepts.ts';

	interface Props {
		tutorialOpen: boolean;
		onCloseTutorial: () => void;
		onOpenTutorial: () => void;
		/** El tutorial vive junto a la escena; la ayuda, al final de la página. */
		part: 'tutorial' | 'help';
	}
	let { tutorialOpen, onCloseTutorial, onOpenTutorial, part }: Props = $props();

	const steps = [
		{
			title: 'Mueve el observador',
			text: 'Arrastra el punto cian de la escena, usa sus flechas de teclado o el control «Radio desde el centro».'
		},
		{
			title: 'Compara los relojes',
			text: 'Pulsa Iniciar. Cerca del horizonte el reloj local avanza menos; mira la razón y la comparación de 60 s.'
		},
		{
			title: 'Activa las referencias',
			text: 'Horizonte (sólido), esfera de fotones (punteada) e ISCO (discontinua) mantienen su escala con cualquier masa y zoom.'
		},
		{
			title: 'Prueba una trayectoria',
			text: 'En Órbitas carga «Precesión» y lánzala; en Fotones compara B = 2,4 y B = 3,0.'
		}
	];
</script>

{#if part === 'tutorial' && tutorialOpen}
	<section class="tutorial" aria-labelledby="tutorial-title">
		<div class="head">
			<h2 id="tutorial-title">Primeros pasos</h2>
			<button class="btn btn-small btn-ghost" type="button" onclick={onCloseTutorial}>Omitir</button
			>
		</div>
		<ol>
			{#each steps as step (step.title)}
				<li><strong>{step.title}.</strong> {step.text}</li>
			{/each}
		</ol>
	</section>
{/if}

{#if part === 'help'}
	<details class="help fold">
		<summary>Ayuda y conceptos</summary>
		<div class="body">
			{#if !tutorialOpen}
				<button class="btn btn-small" type="button" onclick={onOpenTutorial}
					>Ver primeros pasos</button
				>
			{/if}
			<dl>
				{#each CONCEPTS as c (c.term)}
					<div>
						<dt>{c.term}</dt>
						<dd>{c.text}</dd>
					</div>
				{/each}
			</dl>
			<p class="keys">
				Teclado: Tab recorre los controles; en las pestañas, ←/→ cambian de experimento; con el
				observador enfocado, ←/→ cambian el radio 0,05 rs (Mayús ×10), Inicio/Fin van a 1,01 y 20
				rs.
			</p>
		</div>
	</details>
{/if}

<style>
	.tutorial {
		display: grid;
		gap: var(--space-2);
		padding-left: var(--space-4);
		border-left: 2px solid var(--yev-paper);
	}
	.head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: var(--space-3);
	}
	h2 {
		font-size: var(--font-ui);
		font-weight: 500;
	}
	ol {
		margin: 0;
		padding-left: 1.3em;
		display: grid;
		gap: var(--space-1);
		font-size: 0.875rem;
		max-width: 80ch;
	}
	.body {
		padding: 0 0 var(--space-5);
		display: grid;
		gap: var(--space-4);
		font-size: 0.875rem;
		justify-items: start;
	}
	dl {
		margin: 0;
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 2fr);
		gap: var(--space-3) var(--space-5);
		max-width: 100ch;
	}
	dl div {
		display: contents;
	}
	dt {
		font-weight: 500;
	}
	dd {
		margin: 0;
		color: var(--muted);
	}
	.keys {
		font-size: var(--font-meta);
		color: var(--muted);
	}
	@media (max-width: 719px) {
		dl {
			grid-template-columns: minmax(0, 1fr);
			gap: var(--space-1);
		}
		dd {
			margin-bottom: var(--space-3);
		}
	}
</style>
