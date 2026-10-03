<script lang="ts">
	import type { LabState } from '#lib/state/lab.svelte.ts';
	import { buildSceneView } from '#lib/state/sceneView.ts';
	import { scenarioFragment } from '#lib/scenarios/url.ts';
	import {
		JSON_FILENAME,
		copyText,
		downloadBlob,
		parseScenarioJson,
		scenarioToJson
	} from '#lib/scenarios/export.ts';
	import { canvasToBlob, composeExport, type ExportInfo } from '#lib/rendering/exportImage.ts';
	import { fmt, fmtClock, fmtDuration, fmtSig, radToDeg } from '#lib/content/format.ts';
	import { EXPERIMENT_LABEL } from '#lib/content/copy.ts';

	interface Props {
		lab: LabState;
		onRestoreDefaults: () => void;
	}
	let { lab, onRestoreDefaults }: Props = $props();

	let status = $state<{ tone: 'success' | 'danger' | 'info'; text: string } | null>(null);
	let fallbackLink = $state<string | null>(null);
	let exportingPng = $state(false);
	let fileInput = $state<HTMLInputElement | null>(null);
	let fallbackInput = $state<HTMLInputElement | null>(null);

	function report(tone: 'success' | 'danger' | 'info', text: string) {
		status = { tone, text };
		lab.announce(text);
	}

	function shareUrl(): string {
		const { origin, pathname } = window.location;
		return `${origin}${pathname}${scenarioFragment(lab.scenario)}`;
	}

	async function copyLink() {
		const url = shareUrl();
		const result = await copyText(url);
		if (result.ok) {
			fallbackLink = null;
			report('success', 'Enlace copiado. Al abrirlo, el escenario se carga en pausa.');
		} else {
			fallbackLink = url;
			report('danger', `${result.message} Copia el enlace manualmente desde el campo.`);
			queueMicrotask(() => fallbackInput?.select());
		}
	}

	function exportJson() {
		downloadBlob(
			new Blob([scenarioToJson(lab.scenario)], { type: 'application/json' }),
			JSON_FILENAME
		);
		report('success', `Escenario exportado como ${JSON_FILENAME}.`);
	}

	async function importJson(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		// Limpiar para permitir reimportar el mismo archivo.
		input.value = '';
		if (!file) return;
		if (file.size > 64 * 1024) {
			report('danger', 'El archivo supera 64 KiB. Se conserva el escenario actual.');
			return;
		}
		let text: string;
		try {
			text = await file.text();
		} catch {
			report('danger', 'No se pudo leer el archivo. Se conserva el escenario actual.');
			return;
		}
		const parsed = parseScenarioJson(text);
		if (!parsed.ok) {
			report('danger', `Importación rechazada: ${parsed.message} Se conserva el escenario actual.`);
			return;
		}
		lab.applyScenario(parsed.value, 'Escenario importado en pausa.');
		status = { tone: 'success', text: 'Escenario importado en pausa.' };
	}

	function exportInfo(): ExportInfo {
		const s = lab.scenario;
		const snap = lab.snapshot;
		const lines: ExportInfo['lines'] = [
			{ label: 'Experimento', value: EXPERIMENT_LABEL[s.experiment] },
			{ label: 'Masa', value: `${fmt(s.massSolar, 2)} M☉` },
			{ label: 'rs', value: `${fmtSig(lab.rsKm, 4)} km` },
			{ label: 'Escala', value: 'Vista en rs (radio areal)' }
		];
		const legend: ExportInfo['legend'] = [{ label: 'Horizonte · 1 rs', style: 'horizon' }];
		if (s.view.references) {
			legend.push({ label: 'Esfera de fotones · 1,5 rs', style: 'dotted' });
			legend.push({ label: 'ISCO · 3 rs', style: 'dashed' });
		}
		if (s.experiment === 'clocks') {
			lines.push(
				{
					label: 'Observador',
					value: `${fmt(s.observer.radiusRs, 3)} rs · ${fmtSig(lab.observerKm, 4)} km`
				},
				{ label: 'Ritmo local q', value: `${fmt(lab.clockRate, 4)}×` },
				{ label: 'Reloj de referencia', value: fmtClock(snap.referenceSeconds) },
				{ label: 'Reloj local', value: fmtClock(snap.localSeconds) },
				{ label: 'Escala de relojes', value: 'didáctica: 1 s ref./s a ×1' }
			);
			legend.push({ label: 'Observador estático', style: 'observer' });
		} else {
			lines.push({
				label: 'T coordenado',
				value: `${fmt(snap.coordinateTime, 1)} rs/c · ${fmtDuration(snap.coordinateTime * lab.timeScale)}`
			});
			if (s.experiment === 'orbits') {
				const model = {
					schwarzschild: 'Schwarzschild',
					newtonian: 'Newton',
					compare: 'Comparar (mismo estado coordenado)'
				}[s.orbit.model];
				lines.push(
					{ label: 'Modelo', value: model },
					{
						label: 'Lanzamiento',
						value: `x = ${fmt(s.orbit.radiusRs, 2)} rs, φ = ${fmt(radToDeg(s.orbit.angleRad), 1)}°`
					},
					{
						label: 'Velocidad',
						value: `β = ${fmt(s.orbit.speedLocalC, 4)} c local, α = ${fmt(radToDeg(s.orbit.directionRad), 1)}°`
					},
					{ label: 'Cuerpos', value: String(snap.bodies.length) }
				);
				legend.push({ label: 'Schwarzschild (geodésica)', style: 'gr' });
				legend.push({ label: 'Newton (frontera impuesta)', style: 'newton' });
			} else {
				lines.push(
					{ label: 'Emisor', value: `x₀ = ${fmt(s.photon.emissionRadiusRs, 2)} rs` },
					{ label: 'Impacto B', value: fmt(s.photon.impactParameterRs, 6) },
					{ label: 'Fotones', value: String(snap.bodies.length) }
				);
				legend.push({ label: 'Fotón (sin tiempo propio)', style: 'photon' });
			}
		}
		if (s.view.disk) legend.push({ label: 'Disco artístico', style: 'disk' });
		if (s.view.grid) legend.push({ label: 'Malla ilustrativa', style: 'grid' });
		return {
			title: EXPERIMENT_LABEL[s.experiment],
			lines,
			legend,
			notes: [
				'Disco y malla ilustrativos: no se calcula el gas ni su emisión, ni la malla es el espacio-tiempo.',
				'Vista geométrica a escala en coordenadas de Schwarzschild; el horizonte no es la sombra aparente.'
			]
		};
	}

	async function exportPng() {
		const engine = lab.engineRef;
		if (!engine || exportingPng) return;
		exportingPng = true;
		try {
			const frame = engine.getFrameState();
			const view = buildSceneView(lab, { ...frame, bodies: [...frame.bodies] }, 1000, 1000);
			const canvas = composeExport(view, exportInfo());
			const blob = await canvasToBlob(canvas);
			downloadBlob(blob, `black-hole-lab-${lab.scenario.experiment}.png`);
			report('success', 'Imagen PNG exportada con leyenda y contexto.');
		} catch {
			report('danger', 'No se pudo generar la imagen. La simulación no se ha modificado.');
		} finally {
			exportingPng = false;
		}
	}
</script>

<section class="actions-panel" aria-labelledby="share-title">
	<h2 id="share-title">Guardar y compartir</h2>
	<p class="hint">
		Se guardan solo condiciones iniciales y vista; nada sale de tu navegador salvo lo que compartas.
	</p>
	<div class="buttons">
		<button class="btn btn-small" type="button" onclick={copyLink} disabled={!lab.ready}
			>Copiar enlace</button
		>
		<button class="btn btn-small" type="button" onclick={exportJson}>Exportar JSON</button>
		<button class="btn btn-small" type="button" onclick={() => fileInput?.click()}
			>Importar JSON</button
		>
		<button
			class="btn btn-small"
			type="button"
			onclick={exportPng}
			disabled={exportingPng || !lab.ready || !lab.canvasAvailable}
		>
			{exportingPng ? 'Generando…' : 'Exportar PNG'}
		</button>
		<input
			bind:this={fileInput}
			class="visually-hidden"
			type="file"
			accept="application/json,.json"
			tabindex="-1"
			aria-label="Archivo de escenario JSON"
			onchange={importJson}
		/>
	</div>
	{#if fallbackLink}
		<label class="field-label" for="share-fallback">Enlace del escenario</label>
		<input
			id="share-fallback"
			bind:this={fallbackInput}
			class="input"
			readonly
			value={fallbackLink}
			onfocus={(e) => e.currentTarget.select()}
		/>
	{/if}
	{#if status}
		<p class="message" data-tone={status.tone}>{status.text}</p>
	{/if}
	<div class="restore">
		<button class="btn btn-small btn-ghost" type="button" onclick={onRestoreDefaults}
			>Valores iniciales</button
		>
		<span class="hint">Restaura todos los controles y borra el escenario guardado.</span>
	</div>
</section>

<style>
	.actions-panel {
		display: grid;
		gap: var(--space-3);
	}
	h2 {
		font-size: var(--font-ui);
	}
	.buttons {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
	}
	.restore {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2);
		padding-top: var(--space-2);
	}
</style>
