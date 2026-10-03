import { CANVAS_FONT, COLORS, SceneCache, drawScene, type SceneView } from './renderer';

export const PNG_WIDTH = 1600;
export const PNG_HEIGHT = 1000;
const SCENE_SIZE = 1000;

export interface ExportInfo {
	title: string;
	lines: { label: string; value: string }[];
	legend: {
		label: string;
		style:
			'horizon' | 'dotted' | 'dashed' | 'gr' | 'newton' | 'photon' | 'observer' | 'disk' | 'grid';
	}[];
	notes: string[];
}

/**
 * Compone la escena (1000×1000) y un panel de contexto (600×1000) en un canvas de salida.
 * Usa una vista inmutable del instante visible: no muta el motor. Sin recursos remotos.
 */
export function composeExport(
	view: SceneView,
	info: ExportInfo,
	doc: Document = document
): HTMLCanvasElement {
	const canvas = doc.createElement('canvas');
	canvas.width = PNG_WIDTH;
	canvas.height = PNG_HEIGHT;
	const ctx = canvas.getContext('2d');
	if (!ctx) throw new Error('Canvas 2D no disponible');
	const sceneView: SceneView = {
		...view,
		camera: { ...view.camera, width: SCENE_SIZE, height: SCENE_SIZE }
	};
	drawScene(ctx, sceneView, new SceneCache());

	// Panel lateral
	const x0 = SCENE_SIZE;
	ctx.fillStyle = '#11100e';
	ctx.fillRect(x0, 0, PNG_WIDTH - SCENE_SIZE, PNG_HEIGHT);
	ctx.fillStyle = COLORS.line;
	ctx.fillRect(x0, 0, 1, PNG_HEIGHT);
	const pad = 40;
	let y = 56;
	ctx.textBaseline = 'alphabetic';
	ctx.textAlign = 'left';
	ctx.fillStyle = COLORS.text;
	ctx.font = `700 30px ${CANVAS_FONT}`;
	ctx.fillText('Black Hole Lab', x0 + pad, y);
	y += 32;
	ctx.font = `500 20px ${CANVAS_FONT}`;
	ctx.fillStyle = COLORS.muted;
	ctx.fillText(info.title, x0 + pad, y);
	y += 36;

	ctx.font = `17px ${CANVAS_FONT}`;
	for (const line of info.lines) {
		ctx.fillStyle = COLORS.muted;
		ctx.fillText(line.label, x0 + pad, y);
		ctx.fillStyle = COLORS.text;
		ctx.textAlign = 'right';
		ctx.fillText(line.value, PNG_WIDTH - pad, y);
		ctx.textAlign = 'left';
		y += 28;
	}

	y += 16;
	ctx.fillStyle = COLORS.text;
	ctx.font = `500 18px ${CANVAS_FONT}`;
	ctx.fillText('Leyenda', x0 + pad, y);
	y += 28;
	ctx.font = `16px ${CANVAS_FONT}`;
	for (const item of info.legend) {
		drawSwatch(ctx, item.style, x0 + pad, y - 6);
		ctx.fillStyle = COLORS.text;
		ctx.fillText(item.label, x0 + pad + 40, y);
		y += 26;
	}

	y += 16;
	ctx.font = `15px ${CANVAS_FONT}`;
	ctx.fillStyle = COLORS.warning;
	for (const note of info.notes) {
		for (const l of wrap(ctx, note, PNG_WIDTH - SCENE_SIZE - 2 * pad)) {
			ctx.fillText(l, x0 + pad, y);
			y += 21;
		}
		y += 6;
	}
	return canvas;
}

function drawSwatch(
	ctx: CanvasRenderingContext2D,
	style: ExportInfo['legend'][number]['style'],
	x: number,
	y: number
) {
	ctx.save();
	ctx.lineWidth = 2.5;
	ctx.setLineDash([]);
	const line = (color: string, dash: number[] = []) => {
		ctx.strokeStyle = color;
		ctx.setLineDash(dash);
		ctx.beginPath();
		ctx.moveTo(x, y);
		ctx.lineTo(x + 28, y);
		ctx.stroke();
	};
	switch (style) {
		case 'horizon':
			ctx.fillStyle = '#000';
			ctx.strokeStyle = COLORS.horizonEdge;
			ctx.beginPath();
			ctx.arc(x + 10, y, 8, 0, Math.PI * 2);
			ctx.fill();
			ctx.stroke();
			break;
		case 'dotted':
			line(COLORS.text, [2, 4]);
			break;
		case 'dashed':
			line(COLORS.isco, [8, 5]);
			break;
		case 'gr':
			line(COLORS.warm);
			break;
		case 'newton':
			line(COLORS.comparison, [7, 5]);
			break;
		case 'photon':
			line(COLORS.photon);
			break;
		case 'observer':
			ctx.strokeStyle = COLORS.signal;
			ctx.beginPath();
			ctx.arc(x + 10, y, 7, 0, Math.PI * 2);
			ctx.stroke();
			break;
		case 'disk': {
			const g = ctx.createLinearGradient(x, 0, x + 28, 0);
			g.addColorStop(0, 'rgba(255,196,120,0.9)');
			g.addColorStop(1, 'rgba(220,110,50,0.2)');
			ctx.fillStyle = g;
			ctx.fillRect(x, y - 5, 28, 10);
			break;
		}
		case 'grid':
			ctx.strokeStyle = 'rgba(120,150,185,0.8)';
			ctx.lineWidth = 1;
			ctx.strokeRect(x, y - 6, 28, 12);
			ctx.beginPath();
			ctx.moveTo(x + 14, y - 6);
			ctx.lineTo(x + 14, y + 6);
			ctx.stroke();
			break;
	}
	ctx.restore();
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
	const words = text.split(' ');
	const lines: string[] = [];
	let current = '';
	for (const w of words) {
		const next = current ? `${current} ${w}` : w;
		if (ctx.measureText(next).width > maxWidth && current) {
			lines.push(current);
			current = w;
		} else current = next;
	}
	if (current) lines.push(current);
	return lines;
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
	return new Promise((resolve, reject) => {
		canvas.toBlob(
			(blob) => (blob ? resolve(blob) : reject(new Error('toBlob devolvió null'))),
			'image/png'
		);
	});
}
