import { fail, ok, type Result } from '../physics/types';
import { validateScenario, type ScenarioV1 } from './schema';

export const JSON_FILENAME = 'black-hole-lab-scenario.json';
export const MAX_IMPORT_BYTES = 64 * 1024;
export const APP_VERSION = '1.0.0';

/** JSON legible y reproducible: sin fecha ni estado vivo. */
export function scenarioToJson(scenario: ScenarioV1): string {
	return (
		JSON.stringify(
			{ ...scenario, exportedBy: 'Black Hole Lab', appVersion: APP_VERSION },
			null,
			2
		) + '\n'
	);
}

/** Parsea y valida un JSON importado. Un fallo nunca produce un escenario parcial. */
export function parseScenarioJson(text: string): Result<ScenarioV1> {
	if (text.length > MAX_IMPORT_BYTES) {
		return fail('payload-too-large', 'El archivo supera 64 KiB.');
	}
	let parsed: unknown;
	try {
		parsed = JSON.parse(text);
	} catch {
		return fail('malformed-scenario', 'El archivo no es JSON válido.');
	}
	const checked = validateScenario(parsed);
	return checked.ok ? ok(checked.value.scenario) : checked;
}

/** Descarga un Blob y revoca su object URL después del click. */
export function downloadBlob(blob: Blob, filename: string): void {
	const url = URL.createObjectURL(blob);
	try {
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		a.rel = 'noopener';
		document.body.appendChild(a);
		a.click();
		a.remove();
	} finally {
		// Revocar en la siguiente vuelta del event loop: el click ya inició la descarga.
		setTimeout(() => URL.revokeObjectURL(url), 0);
	}
}

/** Copia texto con Clipboard API. No anuncia éxito si la API falla o no existe. */
export async function copyText(text: string): Promise<Result<void>> {
	try {
		if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
			return fail('clipboard-unavailable', 'El portapapeles no está disponible en este navegador.');
		}
		await navigator.clipboard.writeText(text);
		return ok(undefined);
	} catch {
		return fail('clipboard-unavailable', 'El navegador no permitió copiar al portapapeles.');
	}
}
