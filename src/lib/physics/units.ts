import { C_SI, G_SI, MASS_MAX_SOLAR, MASS_MIN_SOLAR, SOLAR_MASS_KG } from './constants';
import { fail, ok, type Result } from './types';

/** Comprueba que un número es finito. */
export function isFiniteNumber(value: unknown): value is number {
	return typeof value === 'number' && Number.isFinite(value);
}

/** Valida una masa en M☉ dentro del rango de producto [3, 100]. */
export function validateMassSolar(massSolar: number): Result<number> {
	if (!isFiniteNumber(massSolar))
		return fail('invalid-number', 'La masa debe ser un número finito.');
	if (massSolar < MASS_MIN_SOLAR || massSolar > MASS_MAX_SOLAR) {
		return fail(
			'out-of-range',
			`La masa debe estar entre ${MASS_MIN_SOLAR} y ${MASS_MAX_SOLAR} M☉.`
		);
	}
	return ok(massSolar);
}

/**
 * rs = 2GM/c² en metros. Entrada: masa en M☉ (> 0, finita).
 * Lanza si la entrada no es física: es un error de programación, no de usuario.
 */
export function schwarzschildRadiusMeters(massSolar: number): number {
	assertPositive(massSolar, 'massSolar');
	return (2 * G_SI * massSolar * SOLAR_MASS_KG) / (C_SI * C_SI);
}

/** rs en km. Entrada: masa en M☉. */
export function schwarzschildRadiusKm(massSolar: number): number {
	return schwarzschildRadiusMeters(massSolar) / 1000;
}

/** tg = rs/c en segundos: convierte T y S adimensionales a segundos. Entrada: masa en M☉. */
export function timeScaleSeconds(massSolar: number): number {
	return schwarzschildRadiusMeters(massSolar) / C_SI;
}

/** Radio en rs → km para una masa en M☉. */
export function rsToKm(radiusRs: number, massSolar: number): number {
	return radiusRs * schwarzschildRadiusKm(massSolar);
}

/** Radio en km → rs para una masa en M☉. */
export function kmToRs(radiusKm: number, massSolar: number): number {
	return radiusKm / schwarzschildRadiusKm(massSolar);
}

/** Mapping logarítmico del slider de masa: p∈[0,1] → M = exp(ln 3 + p ln(100/3)). */
export function logSliderToValue(p: number, min: number, max: number): number {
	const clamped = Math.min(1, Math.max(0, p));
	return Math.exp(Math.log(min) + clamped * Math.log(max / min));
}

/** Inversa del mapping logarítmico: valor → p∈[0,1]. */
export function valueToLogSlider(value: number, min: number, max: number): number {
	const p = Math.log(value / min) / Math.log(max / min);
	return Math.min(1, Math.max(0, p));
}

function assertPositive(value: number, name: string): void {
	if (!isFiniteNumber(value) || value <= 0) {
		throw new RangeError(`${name} debe ser finito y positivo; recibido ${String(value)}`);
	}
}
