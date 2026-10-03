<script lang="ts">
	import { fmtUpTo, parseLocaleNumber } from '#lib/content/format.ts';

	/**
	 * Campo numérico con edición parcial: el texto local no se convierte en número hasta
	 * blur/Enter; Escape cancela. Nunca convierte una cadena vacía en cero.
	 */
	interface Props {
		id: string;
		label: string;
		value: number;
		min: number;
		max: number;
		unit?: string;
		decimals?: number;
		/** Devuelve un mensaje de error si el valor no se acepta. */
		onCommit: (value: number) => string | null;
		describedBy?: string;
		disabled?: boolean;
	}

	let {
		id,
		label,
		value,
		min,
		max,
		unit = '',
		decimals = 3,
		onCommit,
		describedBy,
		disabled = false
	}: Props = $props();

	let editing = $state(false);
	let draft = $state('');
	let error = $state<string | null>(null);

	const shown = $derived(editing ? draft : fmtUpTo(value, decimals));

	function begin() {
		editing = true;
		draft = fmtUpTo(value, decimals);
	}

	function commit() {
		if (!editing) return;
		const n = parseLocaleNumber(draft);
		if (!Number.isFinite(n)) {
			error = `Escribe un número entre ${fmtUpTo(min, 3)} y ${fmtUpTo(max, 3)}.`;
			return;
		}
		if (n < min || n > max) {
			error = `Fuera de rango: ${fmtUpTo(min, 3)} – ${fmtUpTo(max, 3)}${unit ? ' ' + unit : ''}.`;
			return;
		}
		const rejection = onCommit(n);
		if (rejection) {
			error = rejection;
			return;
		}
		error = null;
		editing = false;
	}

	function cancel() {
		editing = false;
		error = null;
	}

	function onkeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
			commit();
		} else if (event.key === 'Escape') {
			event.preventDefault();
			cancel();
			(event.currentTarget as HTMLInputElement).select();
		}
	}
</script>

<div class="number-field">
	<label class="field-label" for={id}>{label}</label>
	<div class="row">
		<input
			{id}
			class="input"
			type="text"
			inputmode="decimal"
			autocomplete="off"
			spellcheck="false"
			value={shown}
			{disabled}
			aria-invalid={error ? 'true' : undefined}
			aria-describedby={[error ? `${id}-error` : null, describedBy].filter(Boolean).join(' ') ||
				undefined}
			onfocus={begin}
			oninput={(e) => {
				editing = true;
				draft = e.currentTarget.value;
			}}
			onblur={commit}
			{onkeydown}
		/>
		{#if unit}<span class="unit">{unit}</span>{/if}
	</div>
	{#if error}
		<p class="field-error" id="{id}-error" role="alert">{error}</p>
	{/if}
</div>

<style>
	.row {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}
	.unit {
		color: var(--muted);
		font-size: var(--font-meta);
		min-width: 2.5em;
	}
</style>
