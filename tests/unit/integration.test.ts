import { describe, expect, it } from 'vitest';
import golden from '../../reference/golden-values.json';
import { CAPTURE_CUTOFF_RS, CRITICAL_IMPACT_RS } from '../../src/lib/physics/constants';
import {
	massiveFromLocal,
	newtonFromLocal,
	photonFromImpact,
	type GeodesicLaunch
} from '../../src/lib/physics/initialConditions';
import { circularOrbit } from '../../src/lib/physics/schwarzschild';
import {
	GeodesicIntegrator,
	type GeodesicIntegratorOptions
} from '../../src/lib/simulation/integrators/rk4';
import { VerletIntegrator, type VerletOptions } from '../../src/lib/simulation/integrators/verlet';
import { sampleTrajectory, trajectoryDuration } from '../../src/lib/simulation/trajectory';
import type { Trajectory } from '../../src/lib/simulation/types';

const tolerance = golden.trajectoryComparisonTolerance;
const reference = Object.fromEntries(golden.trajectories.map((t) => [t.name, t]));

function unwrap<T>(r: { ok: true; value: T } | { ok: false; code: string }): T {
	if (!r.ok) throw new Error(r.code);
	return r.value;
}

function integrate(launch: GeodesicLaunch, options: Partial<GeodesicIntegratorOptions> = {}) {
	const integrator = new GeodesicIntegrator(launch.constants, launch.state, options);
	integrator.run(Number.MAX_SAFE_INTEGER);
	return { trajectory: integrator.result(), integrator };
}

function integrateNewton(
	launch: { radiusRs: number; azimuthRad: number; speedLocalC: number; directionRad: number },
	options: Partial<VerletOptions> = {}
) {
	const integrator = new VerletIntegrator(unwrap(newtonFromLocal(launch)).state, options);
	integrator.run(Number.MAX_SAFE_INTEGER);
	return integrator.result();
}

function last(traj: Trajectory) {
	const i = traj.count - 1;
	return {
		x: traj.radiusRs[i]!,
		phi: traj.azimuthRad[i]!,
		t: traj.ageCoordinateTime[i]!,
		param: traj.parameter[i]!
	};
}

function assertMonotonicTime(traj: Trajectory) {
	for (let i = 1; i < traj.count; i++) {
		expect(traj.ageCoordinateTime[i]!).toBeGreaterThan(traj.ageCoordinateTime[i - 1]!);
	}
}

const circular6 = () =>
	unwrap(
		massiveFromLocal({
			radiusRs: 6,
			azimuthRad: 0,
			speedLocalC: unwrap(circularOrbit(6)).localSpeedC,
			directionRad: Math.PI / 2
		})
	);

describe('geodésicas masivas (RK4 adaptativo)', () => {
	it('circular estable x = 6 durante 10 períodos: radio < 1e-4 y residual < 1e-6', () => {
		const period = unwrap(circularOrbit(6)).coordinatePeriod;
		const { trajectory } = integrate(circular6(), { maxCoordinateTime: 10 * period });
		expect(trajectory.status).toBe('budget-exceeded');
		expect(trajectory.diagnostics.terminationReason).toBe('max-coordinate-time');
		let maxDev = 0;
		for (let i = 0; i < trajectory.count; i++) {
			maxDev = Math.max(maxDev, Math.abs(trajectory.radiusRs[i]! - 6) / 6);
		}
		expect(maxDev).toBeLessThan(1e-4);
		expect(trajectory.diagnostics.maxConstraintResidual).toBeLessThan(1e-6);
		// 10 vueltas ⇒ φ − φ0 ≈ 20π
		expect(last(trajectory).phi).toBeGreaterThan(20 * Math.PI - 0.05);
		// Tiempo propio: dS/dT = √(1 − 3/(2x)) = √0,75
		const end = last(trajectory);
		expect(end.param / end.t).toBeCloseTo(Math.sqrt(0.75), 6);
		// La circular exacta no produce puntos de retorno espurios.
		expect(trajectory.turningPoints.length).toBe(0);
		assertMonotonicTime(trajectory);
	});

	it('precesión x = 6, β = 0,30, α = π/2: periastros coinciden con la referencia', () => {
		const ref = reference.precession!;
		const launch = unwrap(
			massiveFromLocal({ radiusRs: 6, azimuthRad: 0, speedLocalC: 0.3, directionRad: Math.PI / 2 })
		);
		const { trajectory } = integrate(launch, { maxCoordinateTime: 480 });
		const peri = trajectory.turningPoints.filter((p) => p.type === 'pericenter');
		expect(peri.length).toBeGreaterThanOrEqual(2);
		for (let i = 0; i < ref.pericenters.length; i++) {
			const expected = ref.pericenters[i]!;
			const actual = peri[i]!;
			expect(Math.abs(actual.radiusRs - expected.radiusRs)).toBeLessThan(tolerance.absoluteRadius);
			expect(Math.abs(actual.azimuthRad - expected.azimuthRad)).toBeLessThan(
				tolerance.absoluteAzimuth
			);
			expect(Math.abs(actual.ageCoordinateTime - expected.coordinateTime)).toBeLessThan(
				tolerance.absoluteCoordinateTime
			);
		}
		// Avance del periastro por vuelta: Δφ − 2π ≈ 3,77 rad (órbita muy relativista).
		const advance = peri[1]!.azimuthRad - peri[0]!.azimuthRad - 2 * Math.PI;
		expect(advance).toBeCloseTo(3.770890347089008, 2);
		expect(trajectory.diagnostics.maxConstraintResidual).toBeLessThan(1e-6);
	});

	it('caída radial desde reposo en x = 6 termina en el cutoff, sin radios negativos', () => {
		const ref = reference.infall!;
		const launch = unwrap(
			massiveFromLocal({ radiusRs: 6, azimuthRad: 0, speedLocalC: 0, directionRad: 0 })
		);
		const { trajectory } = integrate(launch);
		expect(trajectory.status).toBe('captured');
		const end = last(trajectory);
		expect(end.x).toBeGreaterThan(CAPTURE_CUTOFF_RS);
		expect(end.x - CAPTURE_CUTOFF_RS).toBeLessThan(1e-4);
		expect(Math.abs(end.t - ref.finalState.coordinateTime)).toBeLessThan(
			tolerance.absoluteCoordinateTime
		);
		expect(Math.abs(end.param - ref.parameterReached)).toBeLessThan(1e-3);
		for (let i = 0; i < trajectory.count; i++) {
			expect(trajectory.radiusRs[i]!).toBeGreaterThan(CAPTURE_CUTOFF_RS);
			expect(Number.isFinite(trajectory.radiusRs[i]!)).toBe(true);
		}
		// v se vuelve negativo
		expect(trajectory.radialRate[trajectory.count - 1]!).toBeLessThan(0);
	});

	it('escape radial con β = 0,7: E > 1 y r crece hasta confirmar escape', () => {
		const ref = reference.escape!;
		const launch = unwrap(
			massiveFromLocal({ radiusRs: 6, azimuthRad: 0, speedLocalC: 0.7, directionRad: 0 })
		);
		const { trajectory } = integrate(launch);
		expect(launch.constants.energy).toBeGreaterThan(1);
		expect(trajectory.status).toBe('escaped');
		expect(last(trajectory).x).toBeGreaterThanOrEqual(30);
		// Comparar con la referencia a λ = 60 (x ≈ 55,4 fuera del área): interpolar en λ no
		// es posible tras terminar en 30; se compara en la edad T donde λ alcanzó 25.
		for (let i = 1; i < trajectory.count; i++) {
			expect(trajectory.radiusRs[i]!).toBeGreaterThan(trajectory.radiusRs[i - 1]!);
		}
		const refEnd = integrate(launch, {
			exitRadius: 1e9,
			maxCoordinateTime: ref.finalState.coordinateTime
		});
		const p = sampleTrajectory(refEnd.trajectory, ref.finalState.coordinateTime);
		expect(Math.abs(p.radiusRs - ref.finalState.radiusRs)).toBeLessThan(tolerance.absoluteRadius);
	});

	it('converge al endurecer la tolerancia (endpoint de la precesión)', () => {
		const launch = unwrap(
			massiveFromLocal({ radiusRs: 6, azimuthRad: 0, speedLocalC: 0.3, directionRad: Math.PI / 2 })
		);
		const at = 300;
		// Con los defaults el paso queda limitado por hMax = 0,1; se relajan también los límites
		// geométricos para que la tolerancia controle el paso y el observable cambie.
		const loose = { hMax: 5, maxAzimuthStep: 1, maxRadialFraction: 1 };
		const coarse = integrate(launch, {
			...loose,
			atol: 1e-5,
			rtol: 1e-5,
			maxCoordinateTime: at + 1
		});
		const normal = integrate(launch, {
			...loose,
			atol: 1e-9,
			rtol: 1e-8,
			maxCoordinateTime: at + 1
		});
		const fine = integrate(launch, {
			...loose,
			atol: 1e-12,
			rtol: 1e-12,
			maxCoordinateTime: at + 1
		});
		// Observable independiente del muestreo: φ del segundo periastro (raíz refinada con RK4).
		const peri2 = (t: { trajectory: Trajectory }) =>
			t.trajectory.turningPoints.filter((p) => p.type === 'pericenter')[1]!.azimuthRad;
		const errCoarse = Math.abs(peri2(coarse) - peri2(fine));
		const errNormal = Math.abs(peri2(normal) - peri2(fine));
		expect(errNormal).toBeLessThan(errCoarse / 10);
		expect(errNormal).toBeLessThan(1e-4);
		// Los defaults del producto (hMax = 0,1) concuerdan con la referencia fina.
		const product = integrate(launch, { maxCoordinateTime: at + 1 });
		expect(Math.abs(peri2(product) - peri2(fine))).toBeLessThan(1e-6);
		expect(fine.trajectory.diagnostics.acceptedSteps).toBeGreaterThan(
			normal.trajectory.diagnostics.acceptedSteps
		);
	});

	it('los pasos rechazados no avanzan T ni λ', () => {
		const launch = unwrap(
			massiveFromLocal({ radiusRs: 6, azimuthRad: 0, speedLocalC: 0.3, directionRad: Math.PI / 2 })
		);
		// hInitial enorme fuerza rechazos iniciales.
		const integrator = new GeodesicIntegrator(launch.constants, launch.state, {
			hInitial: 20,
			hMax: 50,
			maxAzimuthStep: 10,
			maxRadialFraction: 100,
			atol: 1e-13,
			rtol: 1e-13
		});
		const before = integrator.currentState();
		integrator.run(1);
		const after = integrator.currentState();
		const traj = (() => {
			integrator.cancel();
			return integrator.result();
		})();
		expect(traj.diagnostics.rejectedSteps).toBeGreaterThan(0);
		expect(after.coordinateTime).toBe(before.coordinateTime);
		expect(after.parameter).toBe(before.parameter);
		expect(traj.count).toBe(1);
	});

	it('distingue underflow, presupuesto y estado no finito', () => {
		const launch = circular6();
		const precession = unwrap(
			massiveFromLocal({ radiusRs: 6, azimuthRad: 0, speedLocalC: 0.3, directionRad: Math.PI / 2 })
		);
		const underflow = integrate(precession, { atol: 1e-30, rtol: 1e-30, hMin: 1e-3 });
		expect(underflow.trajectory.status).toBe('numerical-error');
		expect(underflow.trajectory.diagnostics.terminationReason).toBe('step-underflow');

		const budget = integrate(launch, { maxAttempts: 50 });
		expect(budget.trajectory.status).toBe('budget-exceeded');
		expect(budget.trajectory.diagnostics.terminationReason).toBe('max-attempts');

		const evals = integrate(launch, { maxDerivativeEvaluations: 120 });
		expect(evals.trajectory.diagnostics.terminationReason).toBe('max-derivative-evaluations');

		const nonFinite = integrate({
			constants: { ...launch.constants, angularMomentum: Number.NaN },
			state: launch.state
		});
		expect(nonFinite.trajectory.status).toBe('numerical-error');
		expect(nonFinite.trajectory.diagnostics.terminationReason).toBe('non-finite-state');
	});

	it('no evalúa derivadas dentro del cutoff al refinar la captura', () => {
		const launch = unwrap(
			massiveFromLocal({ radiusRs: 3, azimuthRad: 0, speedLocalC: 0.5, directionRad: Math.PI })
		);
		const { trajectory } = integrate(launch);
		expect(trajectory.status).toBe('captured');
		const min = Math.min(...Array.from(trajectory.radiusRs));
		expect(min).toBeGreaterThan(CAPTURE_CUTOFF_RS);
	});

	it('rechaza estados iniciales dentro del cutoff', () => {
		const launch = circular6();
		expect(
			() =>
				new GeodesicIntegrator(launch.constants, { ...launch.state, radiusRs: CAPTURE_CUTOFF_RS })
		).toThrow(RangeError);
	});
});

describe('fotones', () => {
	const photon = (b: number) => unwrap(photonFromImpact(12, Math.PI, b));

	it('B = 2,4 se captura en el cutoff (referencia)', () => {
		const ref = reference['photon-B-2.4']!;
		const { trajectory } = integrate(photon(2.4));
		expect(trajectory.status).toBe('captured');
		const end = last(trajectory);
		expect(Math.abs(end.phi - ref.finalState.azimuthRad)).toBeLessThan(tolerance.absoluteAzimuth);
		expect(Math.abs(end.t - ref.finalState.coordinateTime)).toBeLessThan(
			tolerance.absoluteCoordinateTime
		);
		expect(trajectory.diagnostics.maxConstraintResidual).toBeLessThan(1e-6);
		expect(trajectory.kind).toBe('photon');
	});

	it('B = 3 se dispersa con periastro de referencia y escapa', () => {
		const ref = reference['photon-B-3']!;
		const { trajectory } = integrate(photon(3));
		expect(trajectory.status).toBe('escaped');
		const peri = trajectory.turningPoints.find((p) => p.type === 'pericenter')!;
		expect(Math.abs(peri.radiusRs - ref.minRadiusRs)).toBeLessThan(tolerance.absoluteRadius);
		expect(Math.abs(peri.azimuthRad - ref.pericenters[0]!.azimuthRad)).toBeLessThan(
			tolerance.absoluteAzimuth
		);
		// Al volver a x = 12 saliente: φ y T de la referencia.
		let crossing = -1;
		for (let i = 1; i < trajectory.count; i++) {
			if (trajectory.radialRate[i]! > 0 && trajectory.radiusRs[i]! >= 12) {
				crossing = i;
				break;
			}
		}
		const i = crossing;
		const s =
			(12 - trajectory.radiusRs[i - 1]!) / (trajectory.radiusRs[i]! - trajectory.radiusRs[i - 1]!);
		const phi =
			trajectory.azimuthRad[i - 1]! +
			s * (trajectory.azimuthRad[i]! - trajectory.azimuthRad[i - 1]!);
		expect(Math.abs(phi - ref.finalState.azimuthRad)).toBeLessThan(5 * tolerance.absoluteAzimuth);
		expect(trajectory.diagnostics.maxConstraintResidual).toBeLessThan(1e-6);
	});

	it('Bcrit(1 ± 1e−4) cae a lados distintos de la barrera', () => {
		const below = integrate(photon(CRITICAL_IMPACT_RS * (1 - 1e-4))).trajectory;
		const above = integrate(photon(CRITICAL_IMPACT_RS * (1 + 1e-4))).trajectory;
		expect(below.status).toBe('captured');
		expect(above.status).toBe('escaped');
		const refAbove = reference['photon-B-2.59833601897']!;
		const peri = above.turningPoints.find((p) => p.type === 'pericenter')!;
		expect(Math.abs(peri.radiusRs - refAbove.minRadiusRs)).toBeLessThan(tolerance.absoluteRadius);
		// Muchas vueltas cerca de x = 1,5: mucho más giro que B = 3.
		expect(last(above).phi - Math.PI).toBeGreaterThan(10);
		const refBelow = reference['photon-B-2.59781640373']!;
		expect(Math.abs(last(below).phi - refBelow.finalState.azimuthRad)).toBeLessThan(
			5 * tolerance.absoluteAzimuth
		);
	});

	it('el parámetro del fotón es afín: crece pero no se interpreta como reloj', () => {
		const { trajectory } = integrate(photon(3));
		expect(trajectory.constants?.kappa).toBe(0);
		expect(last(trajectory).param).toBeGreaterThan(0);
	});
});

describe('Newton (velocity Verlet)', () => {
	it('circular R = 6, h = 0,01, 10 períodos: energía < 1e−4, L < 1e−6', () => {
		const period = 2 * Math.PI * Math.sqrt(2 * 216);
		const traj = integrateNewton(
			{ radiusRs: 6, azimuthRad: 0, speedLocalC: 1 / Math.sqrt(10), directionRad: Math.PI / 2 },
			{ maxCoordinateTime: 10 * period }
		);
		expect(traj.diagnostics.maxConstraintResidual).toBeLessThan(1e-4);
		expect(traj.diagnostics.maxAngularMomentumError).toBeLessThan(1e-6);
		let maxDev = 0;
		for (let i = 0; i < traj.count; i++) maxDev = Math.max(maxDev, Math.abs(traj.radiusRs[i]! - 6));
		expect(maxDev).toBeLessThan(1e-4);
		expect(traj.parameter.every((p) => Number.isNaN(p))).toBe(true);
	});

	it('comparación de precesión: misma condición coordenada que la referencia', () => {
		const ref = golden.newtonianTrajectories.find(
			(t) => t.name === 'same-coordinate-precession-comparison'
		)!;
		const traj = integrateNewton(
			{ radiusRs: 6, azimuthRad: 0, speedLocalC: 0.3, directionRad: Math.PI / 2 },
			{ maxCoordinateTime: ref.coordinateDuration + 0.5 }
		);
		const p = sampleTrajectory(traj, ref.coordinateDuration);
		const x = p.radiusRs * Math.cos(p.azimuthRad);
		const y = p.radiusRs * Math.sin(p.azimuthRad);
		expect(Math.abs(x - ref.finalState.xRs)).toBeLessThan(1e-3);
		expect(Math.abs(y - ref.finalState.yRs)).toBeLessThan(1e-3);
		expect(Math.min(...Array.from(traj.radiusRs))).toBeCloseTo(ref.minRadiusRs, 3);
		// Newton cierra aproximadamente: periastros consecutivos separados ≈ 2π.
		const peri = traj.turningPoints.filter((t) => t.type === 'pericenter');
		expect(peri.length).toBeGreaterThanOrEqual(1);
	});

	it('Newton y Schwarzschild divergen con el mismo estado coordenado', () => {
		const launch = { radiusRs: 6, azimuthRad: 0, speedLocalC: 0.3, directionRad: Math.PI / 2 };
		const n = integrateNewton(launch, { maxCoordinateTime: 400 });
		const g = integrate(unwrap(massiveFromLocal(launch)), { maxCoordinateTime: 400 }).trajectory;
		const pn = sampleTrajectory(n, 300);
		const pg = sampleTrajectory(g, 300);
		const d = Math.hypot(
			pn.radiusRs * Math.cos(pn.azimuthRad) - pg.radiusRs * Math.cos(pg.azimuthRad),
			pn.radiusRs * Math.sin(pn.azimuthRad) - pg.radiusRs * Math.sin(pg.azimuthRad)
		);
		expect(d).toBeGreaterThan(1);
	});

	it('convergencia h vs h/2 en energía', () => {
		const launch = { radiusRs: 6, azimuthRad: 0, speedLocalC: 0.3, directionRad: Math.PI / 2 };
		const a = integrateNewton(launch, { step: 0.02, maxCoordinateTime: 400 });
		const b = integrateNewton(launch, { step: 0.01, maxCoordinateTime: 400 });
		expect(b.diagnostics.maxConstraintResidual).toBeLessThan(a.diagnostics.maxConstraintResidual);
		const pa = sampleTrajectory(a, 350);
		const pb = sampleTrajectory(b, 350);
		const pc = sampleTrajectory(
			integrateNewton(launch, { step: 0.005, maxCoordinateTime: 400 }),
			350
		);
		expect(Math.abs(pb.azimuthRad - pc.azimuthRad)).toBeLessThan(
			Math.abs(pa.azimuthRad - pc.azimuthRad)
		);
	});

	it('la caída desde reposo se detiene en la frontera impuesta', () => {
		const traj = integrateNewton({ radiusRs: 6, azimuthRad: 0, speedLocalC: 0, directionRad: 0 });
		expect(traj.status).toBe('captured');
		const r = traj.radiusRs[traj.count - 1]!;
		expect(r).toBeGreaterThan(CAPTURE_CUTOFF_RS);
		expect(r - CAPTURE_CUTOFF_RS).toBeLessThan(1e-4);
		expect(trajectoryDuration(traj)).toBeGreaterThan(0);
	});
});

describe('interpolación en T común', () => {
	it('interpola x y φ entre muestras y marca el final', () => {
		const { trajectory } = integrate(circular6(), { maxCoordinateTime: 200 });
		const p = sampleTrajectory(trajectory, 100);
		expect(p.radiusRs).toBeCloseTo(6, 6);
		expect(p.azimuthRad).toBeCloseTo(100 / Math.sqrt(2 * 216), 3);
		expect(p.ended).toBe(false);
		expect(sampleTrajectory(trajectory, 1e6).ended).toBe(true);
	});
});
