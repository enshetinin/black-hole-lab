<script lang="ts">
	import type { Experiment } from '#lib/scenarios/schema.ts';
	import { EXPERIMENT_LABEL } from '#lib/content/copy.ts';

	/** Tabs WAI-ARIA con activación manual por flechas/Inicio/Fin. */
	interface Props {
		active: Experiment;
		running: boolean;
		onSelect: (e: Experiment) => void;
	}
	let { active, running, onSelect }: Props = $props();

	const order: Experiment[] = ['clocks', 'orbits', 'photons'];
	const buttons: Record<string, HTMLButtonElement | null> = $state({});

	function onkeydown(e: KeyboardEvent, index: number) {
		let next: number | null = null;
		if (e.key === 'ArrowRight') next = (index + 1) % order.length;
		else if (e.key === 'ArrowLeft') next = (index - 1 + order.length) % order.length;
		else if (e.key === 'Home') next = 0;
		else if (e.key === 'End') next = order.length - 1;
		if (next === null) return;
		e.preventDefault();
		const exp = order[next]!;
		onSelect(exp);
		buttons[exp]?.focus();
	}
</script>

<div class="bar">
	<div class="tabs" role="tablist" aria-label="Experimentos">
		{#each order as exp, i (exp)}
			<button
				bind:this={buttons[exp]}
				role="tab"
				type="button"
				id="tab-{exp}"
				aria-selected={active === exp}
				aria-controls="panel-{exp}"
				tabindex={active === exp ? 0 : -1}
				onclick={() => onSelect(exp)}
				onkeydown={(e) => onkeydown(e, i)}
			>
				{EXPERIMENT_LABEL[exp]}
			</button>
		{/each}
	</div>
	<p class="status" data-running={running}>
		<span class="dot" aria-hidden="true"></span>
		{running ? 'En marcha' : 'Pausado'}
	</p>
</div>

<style>
	.bar {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: var(--space-3);
		flex-wrap: wrap;
		border-bottom: 1px solid var(--line);
	}
	.tabs {
		display: flex;
		gap: var(--space-5);
	}
	[role='tab'] {
		min-height: 44px;
		padding: 0;
		border: 0;
		border-bottom: 2px solid transparent;
		margin-bottom: -1px;
		border-radius: 0;
		background: transparent;
		color: var(--muted);
		font-size: 1rem;
		cursor: pointer;
		transition:
			color var(--motion-fast),
			border-color var(--motion-fast);
	}
	[role='tab']:hover {
		color: var(--text);
		border-bottom-color: var(--control-line);
	}
	/* Ubicación actual: Yev Signal como tinta, más peso; no solo color. */
	[role='tab'][aria-selected='true'] {
		color: var(--text);
		font-weight: 700;
		border-bottom-color: var(--signal);
	}
	.status {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		min-height: 44px;
		font-size: 0.875rem;
		color: var(--muted);
	}
	.dot {
		width: 8px;
		height: 8px;
		border: 1.5px solid var(--muted);
	}
	.status[data-running='true'] {
		color: var(--text);
	}
	.status[data-running='true'] .dot {
		background: var(--success);
		border-color: var(--success);
	}
	@media (max-width: 420px) {
		.tabs {
			gap: var(--space-4);
		}
	}
</style>
