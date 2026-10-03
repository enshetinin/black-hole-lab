import { CRITICAL_IMPACT_RS } from '../physics/constants';
import { cloneScenario, defaultScenario, validateScenario, type ScenarioV1 } from './schema';

export interface Preset {
	id: string;
	experiment: ScenarioV1['experiment'];
	title: string;
	description: string;
	expected: string;
	scenario: ScenarioV1;
}

function build(mutate: (s: ScenarioV1) => void): ScenarioV1 {
	const s = defaultScenario();
	mutate(s);
	return s;
}

/** Catálogo determinista (docs/09). Todos: masa 10, ×1, calidad balanced, en pausa. */
export const PRESETS: readonly Preset[] = [
	{
		id: 'clocks-far',
		experiment: 'clocks',
		title: 'Lejos',
		description: 'Observador a 20 rs.',
		expected: 'El ritmo local se acerca al de referencia (q ≈ 0,975).',
		scenario: build((s) => {
			s.observer.radiusRs = 20;
		})
	},
	{
		id: 'clocks-default',
		experiment: 'clocks',
		title: 'A 4 rs',
		description: 'Observador a 4 rs.',
		expected: 'q ≈ 0,866: diferencia visible entre relojes.',
		scenario: build((s) => {
			s.observer.radiusRs = 4;
		})
	},
	{
		id: 'clocks-close',
		experiment: 'clocks',
		title: 'Muy cerca',
		description: 'Observador a 1,1 rs.',
		expected: 'q ≈ 0,3015; sostenerse requiere una aceleración enorme.',
		scenario: build((s) => {
			s.observer.radiusRs = 1.1;
		})
	},
	{
		id: 'orbit-circular',
		experiment: 'orbits',
		title: 'Circular estable',
		description: 'Schwarzschild, x = 6, β = √0,1, α = π/2.',
		expected: 'Órbita circular estable (x > 3).',
		scenario: build((s) => {
			s.experiment = 'orbits';
			s.orbit = {
				...s.orbit,
				model: 'schwarzschild',
				radiusRs: 6,
				speedLocalC: Math.sqrt(0.1),
				directionRad: Math.PI / 2
			};
		})
	},
	{
		id: 'orbit-precession',
		experiment: 'orbits',
		title: 'Precesión',
		description: 'Comparar, x = 6, β = 0,30, α = π/2, mismo estado coordenado.',
		expected: 'El periastro relativista avanza ≈ 3,77 rad por vuelta; Newton casi cierra.',
		scenario: build((s) => {
			s.experiment = 'orbits';
			s.orbit = {
				...s.orbit,
				model: 'compare',
				radiusRs: 6,
				speedLocalC: 0.3,
				directionRad: Math.PI / 2
			};
		})
	},
	{
		id: 'orbit-infall',
		experiment: 'orbits',
		title: 'Caída',
		description: 'Schwarzschild, x = 6, desde reposo local.',
		expected: 'Cae y el cálculo se detiene en el cutoff 1,01 rs.',
		scenario: build((s) => {
			s.experiment = 'orbits';
			s.orbit = {
				...s.orbit,
				model: 'schwarzschild',
				radiusRs: 6,
				speedLocalC: 0,
				directionRad: 0
			};
		})
	},
	{
		id: 'orbit-escape',
		experiment: 'orbits',
		title: 'Escape radial',
		description: 'Schwarzschild, x = 6, β = 0,7 hacia fuera.',
		expected: 'E > 1: se aleja sin retorno.',
		scenario: build((s) => {
			s.experiment = 'orbits';
			s.orbit = {
				...s.orbit,
				model: 'schwarzschild',
				radiusRs: 6,
				speedLocalC: 0.7,
				directionRad: 0
			};
		})
	},
	{
		id: 'photon-captured',
		experiment: 'photons',
		title: 'B = 2,4',
		description: 'Emisor en 12 rs, B por debajo del crítico.',
		expected: 'Capturado.',
		scenario: build((s) => {
			s.experiment = 'photons';
			s.photon = {
				...s.photon,
				emissionRadiusRs: 12,
				emissionAngleRad: Math.PI,
				impactParameterRs: 2.4
			};
		})
	},
	{
		id: 'photon-scattered',
		experiment: 'photons',
		title: 'B = 3,0',
		description: 'Emisor en 12 rs, B por encima del crítico.',
		expected: 'Se desvía y escapa.',
		scenario: build((s) => {
			s.experiment = 'photons';
			s.photon = {
				...s.photon,
				emissionRadiusRs: 12,
				emissionAngleRad: Math.PI,
				impactParameterRs: 3
			};
		})
	},
	{
		id: 'photon-near-critical',
		experiment: 'photons',
		title: 'Casi crítico',
		description: 'B = Bcrit·(1 + 10⁻⁴).',
		expected: 'Varias vueltas cerca de 1,5 rs antes de escapar; inestable.',
		scenario: build((s) => {
			s.experiment = 'photons';
			s.photon = {
				...s.photon,
				emissionRadiusRs: 12,
				emissionAngleRad: Math.PI,
				impactParameterRs: CRITICAL_IMPACT_RS * (1 + 1e-4)
			};
		})
	}
];

export function findPreset(id: string): Preset | undefined {
	return PRESETS.find((p) => p.id === id);
}

/** Copia validada del escenario del preset. */
export function presetScenario(id: string): ScenarioV1 | null {
	const preset = findPreset(id);
	if (!preset) return null;
	const checked = validateScenario(preset.scenario);
	return checked.ok ? cloneScenario(checked.value.scenario) : null;
}
