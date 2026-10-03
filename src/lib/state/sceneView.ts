import type { SceneView } from '../rendering/renderer';
import type { FrameState } from '../simulation/engine';
import { fmtSig } from '../content/format';
import type { LabState } from './lab.svelte';

/** Vista inmutable de la escena para un frame: la leen el canvas en vivo y la exportación PNG. */
export function buildSceneView(
	lab: LabState,
	f: FrameState,
	width: number,
	height: number
): SceneView {
	const s = lab.scenario;
	return {
		camera: { width, height, extentRs: lab.extentRs, zoom: s.view.zoom },
		quality: s.view.quality,
		layers: {
			grid: s.view.grid,
			disk: s.view.disk,
			references: s.view.references,
			labels: s.view.labels,
			trails: s.view.trails
		},
		rsKm: lab.rsKm,
		observer:
			s.experiment === 'clocks'
				? {
						radiusRs: s.observer.radiusRs,
						angleRad: s.observer.angleRad,
						kmLabel: `${fmtSig(lab.observerKm, 3)} km`
					}
				: null,
		launch:
			s.experiment === 'orbits' && lab.launchPrepared
				? {
						radiusRs: s.orbit.radiusRs,
						angleRad: s.orbit.angleRad,
						speedLocalC: s.orbit.speedLocalC,
						directionRad: s.orbit.directionRad
					}
				: null,
		emitter:
			s.experiment === 'photons'
				? { radiusRs: s.photon.emissionRadiusRs, angleRad: s.photon.emissionAngleRad }
				: null,
		previews: s.experiment === 'photons' && lab.photonPreview ? [lab.photonPreview] : [],
		bodies: f.bodies,
		coordinateTime: f.coordinateTime,
		decorationPhase: f.decorationPhase,
		highlightGroupId: lab.selectedGroup
	};
}
