import { ISCO_RS, PHOTON_SPHERE_RS } from '../physics/constants';
import type { EngineBody } from '../simulation/engine';
import { findSampleIndex, sampleTrajectory } from '../simulation/trajectory';
import type { Trajectory } from '../simulation/types';
import { fmt, fmtSig } from '../content/format';
import { pixelsPerRs, worldToScreen, isPolarVisible, type Camera } from './camera';
import { seededRandom } from './random';

export type Quality = 'low' | 'balanced' | 'high';

/** Presupuesto por calidad (docs/08). La calidad nunca cambia física. */
export const QUALITY = {
	low: { stars: 40, diskParticles: 0, gridStep: 2, dprCap: 1.5, trailPoints: 1024 },
	balanced: { stars: 100, diskParticles: 140, gridStep: 1, dprCap: 2, trailPoints: 2048 },
	high: { stars: 180, diskParticles: 320, gridStep: 1, dprCap: 2, trailPoints: 4096 }
} as const;

export const COLORS = {
	bg: '#0c0b0a',
	text: '#f2efe8',
	muted: '#a49e94',
	line: '#2e2a25',
	/** Yev Signal: solo el observador, la posición que el usuario manipula. */
	signal: '#ff4d1f',
	/** Flecha de lanzamiento: papel, no marca. */
	launch: '#f2efe8',
	isco: '#8fd0d8',
	warm: '#ffb45c',
	comparison: '#aebbff',
	photon: '#f2efe8',
	danger: '#ff8f97',
	warning: '#ffd17b',
	horizonEdge: '#9a9389'
} as const;

/** Familia tipográfica del lienzo (cargada localmente vía @fontsource). */
export const CANVAS_FONT = "'Atkinson Hyperlegible Next', system-ui, sans-serif";

export interface SceneView {
	camera: Camera;
	quality: Quality;
	layers: { grid: boolean; disk: boolean; references: boolean; labels: boolean; trails: boolean };
	rsKm: number;
	observer: { radiusRs: number; angleRad: number; kmLabel: string } | null;
	launch: { radiusRs: number; angleRad: number; speedLocalC: number; directionRad: number } | null;
	emitter: { radiusRs: number; angleRad: number } | null;
	/** Trayectorias previstas (fotón en preparación), dibujadas atenuadas. */
	previews: readonly Trajectory[];
	bodies: readonly EngineBody[];
	coordinateTime: number;
	decorationPhase: number;
	/** Cuerpo seleccionado para resaltar. */
	highlightGroupId: string | null;
}

/** Mapping visual de la flecha de lanzamiento: 120 px CSS = 0,5c (ninguna fórmula usa píxeles). */
export const ARROW_PX_PER_HALF_C = 120;

interface Star {
	u: number;
	v: number;
	r: number;
	a: number;
}

interface DiskParticle {
	r: number;
	phi: number;
	size: number;
	alpha: number;
}

/** Caché de geometría estática (estrellas) por tamaño y calidad. */
export class SceneCache {
	private stars: Star[] = [];
	private starsQuality: Quality | null = null;
	private particles: DiskParticle[] = [];
	private particlesQuality: Quality | null = null;

	starsFor(quality: Quality): Star[] {
		if (this.starsQuality !== quality) {
			const rand = seededRandom(1337);
			this.stars = Array.from({ length: QUALITY[quality].stars }, () => ({
				u: rand(),
				v: rand(),
				r: 0.4 + rand() * 0.9,
				a: 0.25 + rand() * 0.55
			}));
			this.starsQuality = quality;
		}
		return this.stars;
	}

	diskFor(quality: Quality): DiskParticle[] {
		if (this.particlesQuality !== quality) {
			const rand = seededRandom(4242);
			this.particles = Array.from({ length: QUALITY[quality].diskParticles }, () => {
				const t = rand();
				return {
					r: 3 + 4 * t * t,
					phi: rand() * Math.PI * 2,
					size: 0.6 + rand() * 1.4,
					alpha: 0.15 + rand() * 0.45
				};
			});
			this.particlesQuality = quality;
		}
		return this.particles;
	}
}

/** Dibuja la escena completa en un contexto ya escalado a píxeles CSS. */
export function drawScene(ctx: CanvasRenderingContext2D, view: SceneView, cache: SceneCache): void {
	const { camera: cam } = view;
	ctx.save();
	ctx.fillStyle = COLORS.bg;
	ctx.fillRect(0, 0, cam.width, cam.height);
	drawStars(ctx, cam, cache.starsFor(view.quality));
	if (view.layers.grid) drawGrid(ctx, view);
	if (view.layers.disk) drawDisk(ctx, view, cache.diskFor(view.quality));
	drawHorizon(ctx, cam);
	if (view.layers.references) drawReferences(ctx, view);
	drawScaleBar(ctx, view);
	for (const preview of view.previews) drawPreview(ctx, cam, preview);
	if (view.emitter) drawEmitter(ctx, view);
	drawBodies(ctx, view);
	if (view.launch) drawLaunchArrow(ctx, view);
	if (view.observer) drawObserver(ctx, view);
	ctx.restore();
}

function drawStars(ctx: CanvasRenderingContext2D, cam: Camera, stars: Star[]): void {
	ctx.fillStyle = '#ece6da';
	for (const s of stars) {
		ctx.globalAlpha = s.a;
		ctx.beginPath();
		ctx.arc(s.u * cam.width, s.v * cam.height, s.r, 0, Math.PI * 2);
		ctx.fill();
	}
	ctx.globalAlpha = 1;
}

/** Deformación radial visual, acotada y monótona: solo ilustración. */
function gridWarp(r: number): number {
	return r - (1.2 * r) / (r * r + 1.5);
}

function drawGrid(ctx: CanvasRenderingContext2D, view: SceneView): void {
	const cam = view.camera;
	const s = pixelsPerRs(cam);
	const step = QUALITY[view.quality].gridStep;
	const halfW = cam.width / 2 / s;
	const halfH = cam.height / 2 / s;
	const limit = Math.ceil(Math.max(halfW, halfH) / step) * step + step;
	ctx.strokeStyle = 'rgba(200, 189, 170, 0.2)';
	ctx.lineWidth = 1;
	const seg = 0.25;
	const line = (fixed: number, vertical: boolean) => {
		ctx.beginPath();
		for (let t = -limit; t <= limit + 1e-9; t += seg) {
			const x = vertical ? fixed : t;
			const y = vertical ? t : fixed;
			const r = Math.hypot(x, y);
			const k = r > 1e-9 ? gridWarp(r) / r : 0;
			const { px, py } = worldToScreen(cam, x * k, y * k);
			if (t === -limit) ctx.moveTo(px, py);
			else ctx.lineTo(px, py);
		}
		ctx.stroke();
	};
	for (let v = -limit; v <= limit + 1e-9; v += step) {
		line(v, true);
		line(v, false);
	}
	if (view.layers.labels) {
		ctx.font = `12px ${CANVAS_FONT}`;
		ctx.fillStyle = COLORS.muted;
		ctx.textAlign = 'left';
		ctx.textBaseline = 'top';
		ctx.fillText('Malla ilustrativa: no representa literalmente el espacio-tiempo', 12, 12);
	}
}

function drawDisk(ctx: CanvasRenderingContext2D, view: SceneView, particles: DiskParticle[]): void {
	const cam = view.camera;
	const s = pixelsPerRs(cam);
	const c = worldToScreen(cam, 0, 0);
	const inner = ISCO_RS * s;
	const outer = 7 * s;
	const g = ctx.createRadialGradient(c.px, c.py, inner, c.px, c.py, outer);
	g.addColorStop(0, 'rgba(255, 196, 120, 0.42)');
	g.addColorStop(0.25, 'rgba(255, 170, 80, 0.26)');
	g.addColorStop(0.7, 'rgba(220, 110, 50, 0.10)');
	g.addColorStop(1, 'rgba(180, 80, 40, 0)');
	ctx.fillStyle = g;
	ctx.beginPath();
	ctx.arc(c.px, c.py, outer, 0, Math.PI * 2);
	ctx.arc(c.px, c.py, inner, 0, Math.PI * 2, true);
	ctx.fill('evenodd');

	// Partículas decorativas con rotación diferencial artística (sin unidades orbitales).
	ctx.fillStyle = '#ffd9a0';
	for (const p of particles) {
		const phi = p.phi + view.decorationPhase * Math.pow(3 / p.r, 1.5);
		const { px, py } = worldToScreen(cam, p.r * Math.cos(phi), p.r * Math.sin(phi));
		ctx.globalAlpha = p.alpha;
		ctx.beginPath();
		ctx.arc(px, py, p.size, 0, Math.PI * 2);
		ctx.fill();
	}
	ctx.globalAlpha = 1;
}

function drawHorizon(ctx: CanvasRenderingContext2D, cam: Camera): void {
	const s = pixelsPerRs(cam);
	const c = worldToScreen(cam, 0, 0);
	// Halo decorativo acotado entre 1 y 3 rs; no es la sombra ni una medida. Aclara el hueco
	// interior del disco para que el único disco negro sea el horizonte.
	const halo = ctx.createRadialGradient(c.px, c.py, s, c.px, c.py, s * 3);
	halo.addColorStop(0, 'rgba(255, 180, 92, 0.20)');
	halo.addColorStop(0.25, 'rgba(255, 170, 90, 0.08)');
	halo.addColorStop(1, 'rgba(200, 189, 170, 0.04)');
	ctx.fillStyle = halo;
	ctx.beginPath();
	ctx.arc(c.px, c.py, s * 3, 0, Math.PI * 2);
	ctx.fill();
	ctx.fillStyle = '#000';
	ctx.beginPath();
	ctx.arc(c.px, c.py, s, 0, Math.PI * 2);
	ctx.fill();
	ctx.strokeStyle = COLORS.horizonEdge;
	ctx.lineWidth = 1.25;
	ctx.setLineDash([]);
	ctx.stroke();
}

function drawReferences(ctx: CanvasRenderingContext2D, view: SceneView): void {
	const cam = view.camera;
	const s = pixelsPerRs(cam);
	const c = worldToScreen(cam, 0, 0);
	ctx.lineWidth = 1.25;
	// Esfera de fotones: punteada.
	ctx.strokeStyle = 'rgba(242, 239, 232, 0.75)';
	ctx.setLineDash([2, 4]);
	ctx.beginPath();
	ctx.arc(c.px, c.py, PHOTON_SPHERE_RS * s, 0, Math.PI * 2);
	ctx.stroke();
	// ISCO: discontinua.
	ctx.strokeStyle = 'rgba(143, 208, 216, 0.75)';
	ctx.setLineDash([9, 6]);
	ctx.beginPath();
	ctx.arc(c.px, c.py, ISCO_RS * s, 0, Math.PI * 2);
	ctx.stroke();
	ctx.setLineDash([]);

	if (!view.layers.labels) return;
	drawRingCallouts(ctx, view);
}

/**
 * Etiquetas de los anillos apiladas en el lado opuesto al objeto principal, con línea guía
 * hasta su anillo: no se solapan entre sí aunque los radios estén cerca en pantalla.
 */
function drawRingCallouts(ctx: CanvasRenderingContext2D, view: SceneView): void {
	const cam = view.camera;
	const s = pixelsPerRs(cam);
	const c = worldToScreen(cam, 0, 0);
	const focusAngle =
		view.observer?.angleRad ?? view.emitter?.angleRad ?? view.launch?.angleRad ?? 0;
	const side = Math.cos(focusAngle) >= 0 ? -1 : 1;
	ctx.font = `12px ${CANVAS_FONT}`;
	ctx.textBaseline = 'middle';
	// En lienzos estrechos se usan rótulos cortos; la leyenda HTML conserva el texto completo.
	const compact = Math.min(cam.width, cam.height) < 520;
	const rings = [
		{ r: 1, text: compact ? 'Horizonte' : 'Horizonte · 1 rs', dy: -26 },
		{ r: PHOTON_SPHERE_RS, text: compact ? 'Fotones 1,5' : 'Esfera de fotones · 1,5 rs', dy: 0 },
		{ r: ISCO_RS, text: compact ? 'ISCO 3' : 'ISCO · 3 rs', dy: 26 }
	];
	const widest = Math.max(...rings.map((r) => ctx.measureText(r.text).width));
	let lx = c.px + side * (ISCO_RS * s + 28);
	// Mantener el texto dentro del lienzo.
	if (side < 0) lx = Math.max(lx, widest + 10);
	else lx = Math.min(lx, cam.width - widest - 10);
	for (const ring of rings) {
		const ly = c.py + ring.dy;
		const ang = Math.atan2(ly - c.py, lx - c.px);
		const ax = c.px + ring.r * s * Math.cos(ang);
		const ay = c.py + ring.r * s * Math.sin(ang);
		ctx.strokeStyle = 'rgba(164, 158, 148, 0.6)';
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(ax, ay);
		ctx.lineTo(lx - side * 4, ly);
		ctx.stroke();
		ctx.fillStyle = COLORS.text;
		ctx.beginPath();
		ctx.arc(ax, ay, 2, 0, Math.PI * 2);
		ctx.fill();
		ctx.textAlign = side < 0 ? 'right' : 'left';
		ctx.lineWidth = 3;
		ctx.strokeStyle = 'rgba(12, 11, 10, 0.9)';
		ctx.strokeText(ring.text, lx, ly);
		ctx.fillText(ring.text, lx, ly);
	}
}

function niceStep(rsPerHundredPx: number): number {
	const candidates = [0.5, 1, 2, 5, 10];
	return candidates.find((c) => c >= rsPerHundredPx * 0.6) ?? 10;
}

function drawScaleBar(ctx: CanvasRenderingContext2D, view: SceneView): void {
	const cam = view.camera;
	const s = pixelsPerRs(cam);
	const lengthRs = niceStep(100 / s);
	const px = lengthRs * s;
	const x0 = 16;
	const y0 = cam.height - 18;
	ctx.strokeStyle = COLORS.text;
	ctx.lineWidth = 1.5;
	ctx.beginPath();
	ctx.moveTo(x0, y0 - 4);
	ctx.lineTo(x0, y0);
	ctx.lineTo(x0 + px, y0);
	ctx.lineTo(x0 + px, y0 - 4);
	ctx.stroke();
	ctx.font = `12px ${CANVAS_FONT}`;
	ctx.fillStyle = COLORS.text;
	ctx.textAlign = 'left';
	ctx.textBaseline = 'bottom';
	ctx.fillText(
		`${fmt(lengthRs, lengthRs < 1 ? 1 : 0)} rs = ${fmtSig(lengthRs * view.rsKm, 3)} km`,
		x0,
		y0 - 6
	);
}

function trailStyle(ctx: CanvasRenderingContext2D, traj: Trajectory, alpha: number): void {
	ctx.globalAlpha = alpha;
	if (traj.kind === 'photon') {
		ctx.strokeStyle = COLORS.photon;
		ctx.setLineDash([]);
		ctx.lineWidth = 1.5;
	} else if (traj.model === 'newtonian') {
		ctx.strokeStyle = COLORS.comparison;
		ctx.setLineDash([7, 5]);
		ctx.lineWidth = 1.75;
	} else {
		ctx.strokeStyle = COLORS.warm;
		ctx.setLineDash([]);
		ctx.lineWidth = 2;
	}
}

/** Traza hasta la edad dada, decimada al presupuesto de puntos de la calidad. */
function strokeTrajectory(
	ctx: CanvasRenderingContext2D,
	cam: Camera,
	traj: Trajectory,
	age: number,
	maxPoints: number
): void {
	const end = Math.min(findSampleIndex(traj, age), traj.count - 1);
	if (end < 0) return;
	const stride = Math.max(1, Math.ceil((end + 1) / maxPoints));
	ctx.beginPath();
	for (let i = 0; i <= end; i += stride) {
		const r = traj.radiusRs[i] as number;
		const phi = traj.azimuthRad[i] as number;
		const { px, py } = worldToScreen(cam, r * Math.cos(phi), r * Math.sin(phi));
		if (i === 0) ctx.moveTo(px, py);
		else ctx.lineTo(px, py);
	}
	const head = sampleTrajectory(traj, age);
	const h = worldToScreen(
		cam,
		head.radiusRs * Math.cos(head.azimuthRad),
		head.radiusRs * Math.sin(head.azimuthRad)
	);
	ctx.lineTo(h.px, h.py);
	ctx.stroke();
}

function drawPreview(ctx: CanvasRenderingContext2D, cam: Camera, traj: Trajectory): void {
	ctx.save();
	ctx.strokeStyle = COLORS.photon;
	ctx.globalAlpha = 0.45;
	ctx.setLineDash([4, 5]);
	ctx.lineWidth = 1.25;
	strokeTrajectory(ctx, cam, traj, Number.POSITIVE_INFINITY, 4096);
	ctx.restore();
}

function drawBodies(ctx: CanvasRenderingContext2D, view: SceneView): void {
	const cam = view.camera;
	const maxPoints = QUALITY[view.quality].trailPoints;
	for (const body of view.bodies) {
		const age = Math.max(0, view.coordinateTime - body.spawnCoordinateTime);
		const dim = view.highlightGroupId !== null && view.highlightGroupId !== body.groupId;
		if (view.layers.trails) {
			ctx.save();
			trailStyle(ctx, body.trajectory, dim ? 0.35 : 0.9);
			strokeTrajectory(ctx, cam, body.trajectory, age, maxPoints);
			ctx.restore();
		}
		drawBodyMarker(ctx, cam, body.trajectory, age, dim);
	}
}

function drawBodyMarker(
	ctx: CanvasRenderingContext2D,
	cam: Camera,
	traj: Trajectory,
	age: number,
	dim: boolean
): void {
	const p = sampleTrajectory(traj, age);
	const { px, py } = worldToScreen(
		cam,
		p.radiusRs * Math.cos(p.azimuthRad),
		p.radiusRs * Math.sin(p.azimuthRad)
	);
	ctx.save();
	ctx.globalAlpha = dim ? 0.5 : 1;
	if (traj.kind === 'photon') {
		// Chevron orientado según el movimiento en pantalla.
		const prev = sampleTrajectory(traj, Math.max(0, age - 0.2));
		const q = worldToScreen(
			cam,
			prev.radiusRs * Math.cos(prev.azimuthRad),
			prev.radiusRs * Math.sin(prev.azimuthRad)
		);
		const ang = Math.atan2(py - q.py, px - q.px);
		ctx.translate(px, py);
		ctx.rotate(Number.isFinite(ang) && (px !== q.px || py !== q.py) ? ang : 0);
		ctx.strokeStyle = COLORS.photon;
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.moveTo(-6, -5);
		ctx.lineTo(1, 0);
		ctx.lineTo(-6, 5);
		ctx.stroke();
	} else {
		const color = traj.model === 'newtonian' ? COLORS.comparison : COLORS.warm;
		ctx.fillStyle = color;
		ctx.strokeStyle = COLORS.bg;
		ctx.lineWidth = 2;
		ctx.beginPath();
		if (traj.model === 'newtonian') {
			// Rombo para Newton: la forma no depende solo del color.
			ctx.moveTo(px, py - 6);
			ctx.lineTo(px + 6, py);
			ctx.lineTo(px, py + 6);
			ctx.lineTo(px - 6, py);
			ctx.closePath();
		} else {
			ctx.arc(px, py, 5, 0, Math.PI * 2);
		}
		ctx.stroke();
		ctx.fill();
	}
	if (p.ended && traj.status === 'captured') {
		ctx.restore();
		ctx.save();
		ctx.strokeStyle = COLORS.danger;
		ctx.lineWidth = 1.5;
		ctx.beginPath();
		ctx.arc(px, py, 8, 0, Math.PI * 2);
		ctx.stroke();
	}
	ctx.restore();
}

function drawLaunchArrow(ctx: CanvasRenderingContext2D, view: SceneView): void {
	const l = view.launch!;
	const cam = view.camera;
	const start = worldToScreen(
		cam,
		l.radiusRs * Math.cos(l.angleRad),
		l.radiusRs * Math.sin(l.angleRad)
	);
	// Dirección en mundo: radial exterior rotada α hacia +φ.
	const theta = l.angleRad + l.directionRad;
	const len = (l.speedLocalC / 0.5) * ARROW_PX_PER_HALF_C;
	const ex = start.px + len * Math.cos(theta);
	const ey = start.py - len * Math.sin(theta);
	ctx.save();
	ctx.strokeStyle = COLORS.launch;
	ctx.fillStyle = COLORS.launch;
	ctx.lineWidth = 2;
	ctx.beginPath();
	ctx.rect(start.px - 5, start.py - 5, 10, 10);
	ctx.stroke();
	if (len > 2) {
		ctx.beginPath();
		ctx.moveTo(start.px, start.py);
		ctx.lineTo(ex, ey);
		ctx.stroke();
		const a = Math.atan2(ey - start.py, ex - start.px);
		ctx.beginPath();
		ctx.moveTo(ex, ey);
		ctx.lineTo(ex - 10 * Math.cos(a - 0.4), ey - 10 * Math.sin(a - 0.4));
		ctx.lineTo(ex - 10 * Math.cos(a + 0.4), ey - 10 * Math.sin(a + 0.4));
		ctx.closePath();
		ctx.fill();
	}
	if (view.layers.labels) {
		ctx.font = `12px ${CANVAS_FONT}`;
		ctx.textAlign = 'left';
		ctx.textBaseline = 'bottom';
		ctx.lineWidth = 3;
		ctx.strokeStyle = 'rgba(12, 11, 10, 0.88)';
		const text = `β = ${fmt(l.speedLocalC, 3)} c (local)`;
		ctx.strokeText(text, start.px + 10, start.py - 8);
		ctx.fillStyle = COLORS.text;
		ctx.fillText(text, start.px + 10, start.py - 8);
	}
	ctx.restore();
}

function drawEmitter(ctx: CanvasRenderingContext2D, view: SceneView): void {
	const e = view.emitter!;
	const p = worldToScreen(
		view.camera,
		e.radiusRs * Math.cos(e.angleRad),
		e.radiusRs * Math.sin(e.angleRad)
	);
	ctx.save();
	ctx.strokeStyle = COLORS.photon;
	ctx.lineWidth = 1.5;
	ctx.beginPath();
	ctx.rect(p.px - 5, p.py - 5, 10, 10);
	ctx.stroke();
	if (view.layers.labels) {
		ctx.font = `12px ${CANVAS_FONT}`;
		ctx.fillStyle = COLORS.text;
		ctx.textAlign = Math.cos(e.angleRad) < 0 ? 'left' : 'right';
		ctx.textBaseline = 'bottom';
		ctx.fillText('Emisor', p.px + (Math.cos(e.angleRad) < 0 ? 8 : -8), p.py - 8);
	}
	ctx.restore();
}

function drawObserver(ctx: CanvasRenderingContext2D, view: SceneView): void {
	const o = view.observer!;
	const cam = view.camera;
	const c = worldToScreen(cam, 0, 0);
	const p = worldToScreen(
		cam,
		o.radiusRs * Math.cos(o.angleRad),
		o.radiusRs * Math.sin(o.angleRad)
	);
	ctx.save();
	if (isPolarVisible(cam, o.radiusRs, o.angleRad, 0)) {
		ctx.strokeStyle = 'rgba(255, 77, 31, 0.45)';
		ctx.lineWidth = 1;
		ctx.setLineDash([3, 4]);
		ctx.beginPath();
		ctx.moveTo(c.px, c.py);
		ctx.lineTo(p.px, p.py);
		ctx.stroke();
		ctx.setLineDash([]);
		// Halo de tinta para que el marcador se lea también sobre el disco.
		ctx.strokeStyle = 'rgba(12, 11, 10, 0.9)';
		ctx.lineWidth = 5;
		ctx.beginPath();
		ctx.arc(p.px, p.py, 10, 0, Math.PI * 2);
		ctx.stroke();
		ctx.strokeStyle = COLORS.signal;
		ctx.lineWidth = 2;
		ctx.stroke();
		ctx.fillStyle = COLORS.text;
		ctx.beginPath();
		ctx.arc(p.px, p.py, 3.5, 0, Math.PI * 2);
		ctx.fill();
		if (view.layers.labels) {
			ctx.font = `500 12px ${CANVAS_FONT}`;
			ctx.textBaseline = 'middle';
			const text = `Observador · ${fmt(o.radiusRs, 2)} rs · ${o.kmLabel}`;
			const w = ctx.measureText(text).width;
			let tx: number;
			let ty: number;
			if (p.px + 16 + w < cam.width - 8) {
				ctx.textAlign = 'left';
				tx = p.px + 16;
				ty = p.py - 16;
			} else {
				// Debajo (o encima) del marcador para no invadir los rótulos de los anillos.
				ctx.textAlign = 'center';
				tx = Math.min(cam.width - w / 2 - 8, Math.max(w / 2 + 8, p.px));
				ty = p.py + (p.py < cam.height - 40 ? 26 : -26);
			}
			ctx.lineWidth = 3;
			ctx.strokeStyle = 'rgba(12, 11, 10, 0.88)';
			ctx.strokeText(text, tx, ty);
			ctx.fillStyle = COLORS.signal;
			ctx.fillText(text, tx, ty);
		}
	} else {
		// Indicador en el borde hacia el observador fuera de campo.
		const ang = Math.atan2(p.py - c.py, p.px - c.px);
		const r = Math.min(cam.width, cam.height) / 2 - 18;
		const ix = c.px + r * Math.cos(ang);
		const iy = c.py + r * Math.sin(ang);
		ctx.translate(ix, iy);
		ctx.rotate(ang);
		ctx.fillStyle = COLORS.signal;
		ctx.beginPath();
		ctx.moveTo(8, 0);
		ctx.lineTo(-6, -7);
		ctx.lineTo(-6, 7);
		ctx.closePath();
		ctx.fill();
	}
	ctx.restore();
}
