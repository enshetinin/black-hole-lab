<script lang="ts">
	import '../app.css';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';

	let { children } = $props();
	const onAbout = $derived(page.route.id === '/about');
</script>

<a class="skip-link" href="#contenido">Saltar al contenido</a>

<header class="site-header">
	<a class="logo" href={resolve('/')}>
		<svg viewBox="0 0 32 32" aria-hidden="true">
			<circle cx="16" cy="16" r="12" fill="none" stroke="currentColor" stroke-width="1.5" />
			<circle cx="16" cy="16" r="6" fill="currentColor" />
		</svg>
		<span class="name">Black Hole Lab</span>
		<span class="tagline">Un laboratorio de relatividad</span>
	</a>
	<nav aria-label="Principal">
		<ul>
			<li>
				<a href={resolve('/')} aria-current={onAbout ? undefined : 'page'}>Laboratorio</a>
			</li>
			<li>
				<a href={resolve('/about')} aria-current={onAbout ? 'page' : undefined}>Modelo y fuentes</a>
			</li>
		</ul>
	</nav>
</header>

<main id="contenido">
	{@render children()}
</main>

<style>
	.skip-link {
		position: absolute;
		left: var(--space-4);
		top: -60px;
		z-index: 10;
		padding: var(--space-2) var(--space-3);
		background: var(--yev-paper);
		color: var(--yev-ink);
	}
	.skip-link:focus {
		top: var(--space-2);
	}
	.site-header {
		max-width: 1520px;
		margin: 0 auto;
		padding: var(--space-4) var(--space-6);
		display: grid;
		grid-template-columns: repeat(12, minmax(0, 1fr));
		column-gap: 20px;
		align-items: baseline;
	}
	.logo {
		grid-column: 1 / span 6;
		display: flex;
		align-items: baseline;
		flex-wrap: wrap;
		column-gap: var(--space-3);
		color: var(--text);
		text-decoration: none;
	}
	.logo svg {
		width: 22px;
		height: 22px;
		align-self: center;
	}
	.name {
		font-weight: 700;
		font-size: 1.125rem;
		letter-spacing: -0.01em;
	}
	.tagline {
		color: var(--muted);
		font-size: var(--font-meta);
	}
	nav {
		grid-column: 7 / -1;
		justify-self: end;
	}
	nav ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		gap: var(--space-5);
	}
	nav a {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
		color: var(--muted);
		text-decoration: underline;
		text-decoration-color: transparent;
		text-underline-offset: 0.35em;
	}
	nav a:hover {
		color: var(--text);
		text-decoration-color: currentColor;
	}
	/* Ubicación actual: peso, color y subrayado de Yev Signal; no depende solo del color. */
	nav a[aria-current='page'] {
		color: var(--text);
		font-weight: 500;
		text-decoration-color: var(--signal);
		text-decoration-thickness: 2px;
	}
	main {
		max-width: 1520px;
		margin: 0 auto;
		padding: 0 var(--space-6) var(--space-8);
	}
	@media (max-width: 719px) {
		.site-header {
			padding: var(--space-3) var(--space-4);
			grid-template-columns: 1fr;
			row-gap: 0;
		}
		.logo,
		nav {
			grid-column: 1;
			justify-self: start;
		}
		main {
			padding: 0 var(--space-4) var(--space-7);
		}
	}
</style>
