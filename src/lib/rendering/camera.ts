/**
 * Proyección ortográfica radial de la vista de laboratorio (docs/08):
 * pantalla = centro + escala·(X, −Y), en píxeles CSS. El DPR no interviene.
 */
export interface Camera {
	/** Tamaño del viewport en píxeles CSS. */
	width: number;
	height: number;
	/** Semieje corto visible a zoom 1, en rs. */
	extentRs: number;
	/** Zoom de cámara [0.5, 2]: nunca es masa física. */
	zoom: number;
}

/** Encuadre base: hasta ~8 rs en el semieje corto. */
export const BASE_EXTENT_RS = 8.4;
export const ZOOM_MIN = 0.5;
export const ZOOM_MAX = 2;

/** Píxeles CSS por rs. */
export function pixelsPerRs(c: Camera): number {
	return (Math.min(c.width, c.height) / 2 / c.extentRs) * c.zoom;
}

export function worldToScreen(c: Camera, x: number, y: number): { px: number; py: number } {
	const s = pixelsPerRs(c);
	return { px: c.width / 2 + s * x, py: c.height / 2 - s * y };
}

/** Inversa exacta de worldToScreen. */
export function screenToWorld(c: Camera, px: number, py: number): { x: number; y: number } {
	const s = pixelsPerRs(c);
	return { x: (px - c.width / 2) / s, y: -(py - c.height / 2) / s };
}

/** Radio visible máximo (rs) hasta la esquina más cercana del semieje corto. */
export function visibleRadiusRs(c: Camera): number {
	return Math.min(c.width, c.height) / 2 / pixelsPerRs(c);
}

/** ¿Está el punto polar (r, φ) dentro del viewport con un margen en px? */
export function isPolarVisible(
	c: Camera,
	radiusRs: number,
	angleRad: number,
	marginPx = 12
): boolean {
	const { px, py } = worldToScreen(c, radiusRs * Math.cos(angleRad), radiusRs * Math.sin(angleRad));
	return px >= marginPx && px <= c.width - marginPx && py >= marginPx && py <= c.height - marginPx;
}

/** Extensión necesaria para que un radio quepa con margen a zoom 1. */
export function extentToFit(radiusRs: number): number {
	return Math.max(BASE_EXTENT_RS, radiusRs * 1.15);
}

export function clampZoom(zoom: number): number {
	return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom));
}
