/** Formato numérico es-ES. Los valores internos nunca se redondean; solo su presentación. */
const cache = new Map<string, Intl.NumberFormat>();

function nf(min: number, max: number, notation: 'standard' | 'scientific' = 'standard') {
	const key = `${min}-${max}-${notation}`;
	let f = cache.get(key);
	if (!f) {
		f = new Intl.NumberFormat('es-ES', {
			minimumFractionDigits: min,
			maximumFractionDigits: max,
			notation,
			useGrouping: true
		});
		cache.set(key, f);
	}
	return f;
}

/** Número con decimales fijos. */
export function fmt(value: number, decimals = 2): string {
	if (!Number.isFinite(value)) return '—';
	return nf(decimals, decimals).format(value);
}

/** Número con hasta `max` decimales. */
export function fmtUpTo(value: number, max = 3): string {
	if (!Number.isFinite(value)) return '—';
	return nf(0, max).format(value);
}

/** Cifras significativas razonables para km y magnitudes físicas. */
export function fmtSig(value: number, significant = 3): string {
	if (!Number.isFinite(value)) return '—';
	const abs = Math.abs(value);
	if (abs !== 0 && (abs >= 1e6 || abs < 1e-3)) return fmtSci(value, significant - 1);
	const digits = abs === 0 ? 0 : Math.max(0, significant - 1 - Math.floor(Math.log10(abs)));
	return nf(digits, digits).format(value);
}

/** Notación científica legible: 1,23 × 10⁸. */
export function fmtSci(value: number, decimals = 2): string {
	if (!Number.isFinite(value)) return '—';
	if (value === 0) return '0';
	const exp = Math.floor(Math.log10(Math.abs(value)));
	const mantissa = value / Math.pow(10, exp);
	return `${nf(decimals, decimals).format(mantissa)} × 10${superscript(exp)}`;
}

const SUP: Record<string, string> = {
	'-': '⁻',
	'0': '⁰',
	'1': '¹',
	'2': '²',
	'3': '³',
	'4': '⁴',
	'5': '⁵',
	'6': '⁶',
	'7': '⁷',
	'8': '⁸',
	'9': '⁹'
};

function superscript(n: number): string {
	return String(n)
		.split('')
		.map((c) => SUP[c] ?? c)
		.join('');
}

/** Duración acumulada como mm:ss,cc (centésimas). */
export function fmtClock(seconds: number): string {
	if (!Number.isFinite(seconds) || seconds < 0) return '—';
	const totalCs = Math.floor(seconds * 100 + 1e-9);
	const cs = totalCs % 100;
	const s = Math.floor(totalCs / 100) % 60;
	const m = Math.floor(totalCs / 6000);
	return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(cs).padStart(2, '0')}`;
}

/** Duración física en s, ms o µs según magnitud. */
export function fmtDuration(seconds: number): string {
	if (!Number.isFinite(seconds)) return '—';
	const abs = Math.abs(seconds);
	if (abs >= 1) return `${fmtSig(seconds, 3)} s`;
	if (abs >= 1e-3) return `${fmtSig(seconds * 1e3, 3)} ms`;
	return `${fmtSig(seconds * 1e6, 3)} µs`;
}

export function radToDeg(rad: number): number {
	return (rad * 180) / Math.PI;
}

export function degToRad(deg: number): number {
	return (deg * Math.PI) / 180;
}

/** Parseo es-ES/en tolerante a coma decimal. Devuelve NaN si no es un número completo. */
export function parseLocaleNumber(text: string): number {
	const t = text.trim().replace(/\s/g, '').replace(',', '.');
	if (t === '' || !/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(t)) return Number.NaN;
	return Number(t);
}
