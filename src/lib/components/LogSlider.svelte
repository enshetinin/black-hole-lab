<script lang="ts">
	import { logSliderToValue, valueToLogSlider } from '#lib/physics/units.ts';

	/** Slider nativo con mapping logarítmico; siempre produce valores válidos del dominio. */
	interface Props {
		id: string;
		label: string;
		value: number;
		min: number;
		max: number;
		valueText: string;
		onInput: (value: number) => void;
		onChange?: (value: number) => void;
		labelHidden?: boolean;
	}

	let {
		id,
		label,
		value,
		min,
		max,
		valueText,
		onInput,
		onChange,
		labelHidden = false
	}: Props = $props();

	const STEPS = 1000;
	const position = $derived(Math.round(valueToLogSlider(value, min, max) * STEPS));

	function toValue(raw: string): number {
		const p = Number(raw) / STEPS;
		// Extremos exactos para evitar 2,9999999.
		if (p <= 0) return min;
		if (p >= 1) return max;
		return logSliderToValue(p, min, max);
	}
</script>

<label class={labelHidden ? 'visually-hidden' : 'field-label'} for={id}>{label}</label>
<input
	{id}
	type="range"
	min="0"
	max={STEPS}
	step="1"
	value={position}
	aria-valuetext={valueText}
	oninput={(e) => {
		const el = e.currentTarget;
		onInput(toValue(el.value));
		// Si el estado rechazó el valor (p. ej. lock km), el control vuelve al valor real.
		queueMicrotask(
			() => (el.value = String(Math.round(valueToLogSlider(value, min, max) * STEPS)))
		);
	}}
	onchange={(e) => onChange?.(toValue(e.currentTarget.value))}
/>
