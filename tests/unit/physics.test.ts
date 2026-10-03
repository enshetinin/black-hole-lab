import { describe, expect, it } from 'vitest';
import golden from '../../reference/golden-values.json';
import {
	CAPTURE_CUTOFF_RS,
	CRITICAL_IMPACT_RS,
	C_SI,
	G_SI,
	ISCO_RS,
	PHOTON_SPHERE_RS,
	SOLAR_MASS_KG
} from '../../src/lib/physics/constants';
import {
	kmToRs,
	logSliderToValue,
	rsToKm,
	schwarzschildRadiusKm,
	schwarzschildRadiusMeters,
	timeScaleSeconds,
	validateMassSolar,
	valueToLogSlider
} from '../../src/lib/physics/units';
import {
	circularOrbit,
	massiveEscapeGuaranteed,
	radialAcceleration,
	staticClockInverseRate,
	staticClockRate,
	staticClockRatio,
	staticProperAcceleration
} from '../../src/lib/physics/schwarzschild';
import {
	circularLaunchSpeed,
	incomingPhotonDirection,
	localVelocity,
	massiveFromLocal,
	maxImpactParameter,
	newtonFromLocal,
	photonFromDirection,
	photonFromImpact
} from '../../src/lib/physics/initialConditions';
import { normalizedConstraintResidual } from '../../src/lib/physics/geodesics';
import { newtonCircularSpeed } from '../../src/lib/physics/newtonian';

/** Magnitudes adimensionales analíticas: tolerancia relativa 1e-10, absoluta 1e-12 (docs/11). */
function expectClose(actual: number, expected: number, rel = 1e-10, abs = 1e-12): void {
	expect(Number.isFinite(actual)).toBe(true);
	expect(Math.abs(actual - expected)).toBeLessThanOrEqual(abs + rel * Math.abs(expected));
}

function unwrap<T>(r: { ok: true; value: T } | { ok: false; code: string }): T {
	if (!r.ok) throw new Error(`Resultado inesperado: ${r.code}`);
	return r.value;
}

describe('constantes y unidades', () => {
	it('coinciden con las constantes SI del oráculo', () => {
		expect(G_SI).toBe(golden.constantsSI.G);
		expect(C_SI).toBe(golden.constantsSI.c);
		expect(SOLAR_MASS_KG).toBe(golden.constantsSI.solarMassKg);
		expect(CAPTURE_CUTOFF_RS).toBe(golden.captureCutoffRs);
	});

	it.each(golden.masses)('rs y tg para $massSolar M☉', (m) => {
		expectClose(schwarzschildRadiusMeters(m.massSolar), m.radiusMeters);
		expectClose(schwarzschildRadiusKm(m.massSolar), m.radiusKm);
		expectClose(timeScaleSeconds(m.massSolar), m.timeScaleSeconds);
	});

	it('rs es lineal en la masa', () => {
		expectClose(schwarzschildRadiusKm(20), 2 * schwarzschildRadiusKm(10));
		expectClose(timeScaleSeconds(100), 100 * timeScaleSeconds(1));
	});

	it('convierte km↔rs de forma inversa', () => {
		const km = rsToKm(4, 10);
		expectClose(km, 4 * golden.masses[2]!.radiusKm);
		expectClose(kmToRs(km, 10), 4);
		// Radio físico fijo y masa doble: x se reduce a la mitad.
		expectClose(kmToRs(km, 20), 2);
	});

	it('rechaza masas no finitas o fuera de rango', () => {
		for (const m of [NaN, Infinity, -1, 0, 2.99, 100.01]) {
			expect(validateMassSolar(m).ok).toBe(false);
		}
		expect(validateMassSolar(3).ok).toBe(true);
		expect(validateMassSolar(100).ok).toBe(true);
		expect(() => schwarzschildRadiusMeters(NaN)).toThrow(RangeError);
	});

	it('el slider logarítmico cubre el dominio y es invertible', () => {
		expectClose(logSliderToValue(0, 3, 100), 3);
		expectClose(logSliderToValue(1, 3, 100), 100);
		expectClose(logSliderToValue(0.5, 3, 100), Math.sqrt(300));
		expectClose(valueToLogSlider(logSliderToValue(0.37, 3, 100), 3, 100), 0.37);
	});
});

describe('reloj estático', () => {
	it.each(golden.clocks)('q y 1/q en x = $radiusRs', (c) => {
		expectClose(unwrap(staticClockRate(c.radiusRs)), c.localPerReference);
		expectClose(unwrap(staticClockInverseRate(c.radiusRs)), c.referencePerLocal);
		expectClose(60 * unwrap(staticClockRate(c.radiusRs)), c.localAfter60ReferenceSeconds);
	});

	it('q aumenta monótonamente con x', () => {
		const qs = golden.clocks.map((c) => unwrap(staticClockRate(c.radiusRs)));
		for (let i = 1; i < qs.length; i++) expect(qs[i]!).toBeGreaterThan(qs[i - 1]!);
	});

	it('no se extiende al horizonte ni al interior', () => {
		for (const x of [1, 0.99, 0.5, 0, -2, NaN, Infinity, -Infinity]) {
			const r = staticClockRate(x);
			expect(r.ok).toBe(false);
		}
		const inside = staticClockRate(0.5);
		expect(inside.ok === false && inside.code).toBe('observer-inside-horizon');
		expect(staticClockRate(Infinity).ok === false && staticClockRate(Infinity)).toMatchObject({
			code: 'invalid-number'
		});
	});

	it('la razón no depende de la masa a x constante', () => {
		// q solo depende de x: duplicar masa con x fijo no altera q, pero sí km y tg.
		const q = unwrap(staticClockRate(4));
		expect(rsToKm(4, 20)).toBeCloseTo(2 * rsToKm(4, 10), 9);
		expectClose(unwrap(staticClockRate(4)), q);
	});

	it('dos relojes finitos se comparan con √(f(a)/f(b)), no con q de uno solo', () => {
		const ratio = unwrap(staticClockRatio(2, 4));
		expectClose(ratio, Math.sqrt(0.5 / 0.75));
		expect(Math.abs(ratio - unwrap(staticClockRate(2)))).toBeGreaterThan(0.05);
	});

	it('la aceleración propia estática diverge hacia el horizonte', () => {
		const far = unwrap(staticProperAcceleration(20, 10));
		const near = unwrap(staticProperAcceleration(1.01, 10));
		const nearer = unwrap(staticProperAcceleration(1.0001, 10));
		expect(near).toBeGreaterThan(far * 100);
		expect(nearer).toBeGreaterThan(near * 5);
		// a = GM/(r²√f): comprobación independiente a x=4, M=10.
		const gm = G_SI * 10 * SOLAR_MASS_KG;
		const r = 4 * schwarzschildRadiusMeters(10);
		expectClose(unwrap(staticProperAcceleration(4, 10)), gm / (r * r * Math.sqrt(0.75)), 1e-12);
		expect(staticProperAcceleration(1, 10).ok).toBe(false);
	});
});

describe('radios notables y órbitas circulares', () => {
	it('distingue horizonte, esfera de fotones, ISCO e impacto crítico', () => {
		expect(PHOTON_SPHERE_RS).toBe(1.5);
		expect(ISCO_RS).toBe(3);
		expectClose(CRITICAL_IMPACT_RS, golden.criticalImpactParameterRs);
		expect(CRITICAL_IMPACT_RS).not.toBeCloseTo(PHOTON_SPHERE_RS, 1);
		expect(CRITICAL_IMPACT_RS).not.toBeCloseTo(1, 1);
	});

	it.each(golden.circularOrbits)('circular en x = $radiusRs', (c) => {
		const o = unwrap(circularOrbit(c.radiusRs));
		expectClose(o.localSpeedC, c.localSpeedC);
		expectClose(o.energy, c.energy);
		expectClose(o.angularMomentum, c.angularMomentum);
		expectClose(o.properPerCoordinateTime, c.properPerCoordinateTime);
		expectClose(o.coordinatePeriod, c.coordinatePeriod);
		expectClose(o.newtonCircularSpeedC, c.newtonCircularSpeedC);
		expect(o.stability).toBe(c.stability);
	});

	it('en el ISCO E = √(8/9) y |ℓ| = √3', () => {
		const o = unwrap(circularOrbit(3));
		expectClose(o.energy, Math.sqrt(8 / 9));
		expectClose(o.angularMomentum, Math.sqrt(3));
		expect(o.stability).toBe('marginal');
		expect(unwrap(circularOrbit(2.5)).stability).toBe('unstable');
		expect(unwrap(circularOrbit(3.0001)).stability).toBe('stable');
	});

	it('no existen circulares masivas en x ≤ 1,5', () => {
		for (const x of [1.5, 1.2, 1, 0.5, NaN]) {
			const r = circularOrbit(x);
			expect(r.ok).toBe(false);
		}
		const r = circularOrbit(1.5);
		expect(!r.ok && r.code).toBe('invalid-orbit-radius');
	});

	it('la circular es un equilibrio del potencial radial', () => {
		for (const x of [2, 3, 6, 10]) {
			const o = unwrap(circularOrbit(x));
			expect(Math.abs(radialAcceleration(x, o.angularMomentum, 1))).toBeLessThan(1e-14);
		}
		// Fotón circular en x = 1.5: aceleración radial nula para cualquier ℓ.
		expect(Math.abs(radialAcceleration(1.5, 2.7, 0))).toBeLessThan(1e-14);
	});

	it('la velocidad newtoniana convertida coincide con la circular newtoniana', () => {
		for (const x of [2, 6, 10]) {
			const beta = circularLaunchSpeed(x);
			expectClose(beta, unwrap(circularOrbit(x)).localSpeedC);
			expectClose(Math.sqrt(1 - 1 / x) * beta, newtonCircularSpeed(x));
		}
	});
});

describe('condiciones iniciales masivas', () => {
	const cases = [
		{ radiusRs: 6, azimuthRad: 0, speedLocalC: 0.3, directionRad: Math.PI / 2 },
		{ radiusRs: 6, azimuthRad: 1, speedLocalC: 0.7, directionRad: 0 },
		{ radiusRs: 2.2, azimuthRad: 2, speedLocalC: 0.5, directionRad: 2.1 },
		{ radiusRs: 12, azimuthRad: -1, speedLocalC: 0.94, directionRad: -0.4 },
		{ radiusRs: 6, azimuthRad: 0, speedLocalC: 0, directionRad: 0 }
	];

	it.each(cases)('cumplen la normalización y devuelven la velocidad local %#', (launch) => {
		const { constants, state } = unwrap(massiveFromLocal(launch));
		expect(constants.kappa).toBe(1);
		expect(
			normalizedConstraintResidual(state.radiusRs, state.radialDerivative, constants)
		).toBeLessThan(1e-14);
		const local = localVelocity(state, constants);
		expectClose(local.speedC, launch.speedLocalC, 1e-12, 1e-14);
		expectClose(local.radialC, launch.speedLocalC * Math.cos(launch.directionRad), 1e-12, 1e-14);
		// v = dx/dλ no es la velocidad local salvo casualidad.
		if (launch.speedLocalC > 0 && Math.abs(Math.cos(launch.directionRad)) > 0.1) {
			expect(Math.abs(state.radialDerivative - local.radialC)).toBeGreaterThan(1e-3);
		}
	});

	it('reproduce E y ℓ de las trayectorias de referencia', () => {
		const byName = Object.fromEntries(golden.trajectories.map((t) => [t.name, t]));
		const precession = unwrap(
			massiveFromLocal({ radiusRs: 6, azimuthRad: 0, speedLocalC: 0.3, directionRad: Math.PI / 2 })
		);
		expectClose(precession.constants.energy, byName.precession!.energy);
		expectClose(precession.constants.angularMomentum, byName.precession!.angularMomentum);
		const escape = unwrap(
			massiveFromLocal({ radiusRs: 6, azimuthRad: 0, speedLocalC: 0.7, directionRad: 0 })
		);
		expectClose(escape.constants.energy, byName.escape!.energy);
		expectClose(escape.state.radialDerivative, byName.escape!.initialState.radialDerivative);
		expect(escape.constants.energy).toBeGreaterThan(1);
		expect(
			massiveEscapeGuaranteed(6, escape.state.radialDerivative, escape.constants.energy, 0)
		).toBe(true);
		const infall = unwrap(
			massiveFromLocal({ radiusRs: 6, azimuthRad: 0, speedLocalC: 0, directionRad: 0 })
		);
		expectClose(infall.constants.energy, byName.infall!.energy);
	});

	it('rechaza β ≥ 1, valores no finitos y radios dentro del cutoff', () => {
		const base = { radiusRs: 6, azimuthRad: 0, speedLocalC: 0.3, directionRad: 0 };
		const superluminal = massiveFromLocal({ ...base, speedLocalC: 1 });
		expect(!superluminal.ok && superluminal.code).toBe('superluminal-input');
		expect(massiveFromLocal({ ...base, speedLocalC: NaN }).ok).toBe(false);
		expect(massiveFromLocal({ ...base, speedLocalC: -0.1 }).ok).toBe(false);
		expect(massiveFromLocal({ ...base, radiusRs: 1.005 }).ok).toBe(false);
		expect(massiveFromLocal({ ...base, radiusRs: 0.5 }).ok).toBe(false);
		expect(massiveFromLocal({ ...base, directionRad: Infinity }).ok).toBe(false);
	});

	it('el escape no se garantiza con E < 1 o movimiento entrante', () => {
		const bound = unwrap(
			massiveFromLocal({ radiusRs: 6, azimuthRad: 0, speedLocalC: 0.3, directionRad: 0 })
		);
		expect(bound.constants.energy).toBeLessThan(1);
		expect(
			massiveEscapeGuaranteed(6, bound.state.radialDerivative, bound.constants.energy, 0)
		).toBe(false);
		expect(massiveEscapeGuaranteed(6, -0.5, 1.2, 0)).toBe(false);
	});
});

describe('Newton con el mismo estado coordenado', () => {
	it('convierte β local en derivadas coordenadas dr/dT = f0βr y x0dφ/dT = √f0βφ', () => {
		const n = unwrap(
			newtonFromLocal({ radiusRs: 6, azimuthRad: 0, speedLocalC: 0.3, directionRad: Math.PI / 2 })
		);
		const ref = golden.newtonianTrajectories.find(
			(t) => t.name === 'same-coordinate-precession-comparison'
		)!;
		expectClose(n.tangentialCoordinateSpeedC, ref.initialTangentialCoordinateSpeedC);
		expect(Math.abs(n.radialCoordinateSpeedC)).toBeLessThan(1e-15);
		expectClose(n.state.xRs, 6);
		expectClose(n.state.vyC, ref.initialTangentialCoordinateSpeedC);
	});

	it('coincide con dx/dT de la geodésica en el evento inicial', () => {
		const launch = { radiusRs: 5, azimuthRad: 0.7, speedLocalC: 0.4, directionRad: 0.9 };
		const g = unwrap(massiveFromLocal(launch));
		const n = unwrap(newtonFromLocal(launch));
		const f = 1 - 1 / 5;
		// dx/dT = f v / E ; x dφ/dT = f ℓ / (E x)
		expectClose(n.radialCoordinateSpeedC, (f * g.state.radialDerivative) / g.constants.energy);
		expectClose(
			n.tangentialCoordinateSpeedC,
			(f * g.constants.angularMomentum) / (g.constants.energy * 5)
		);
	});
});

describe('fotones', () => {
	it('Bcrit vale 3√3/2', () => {
		expectClose(CRITICAL_IMPACT_RS, (3 * Math.sqrt(3)) / 2);
	});

	const photonRefs = golden.trajectories
		.filter((t) => t.kappa === 0)
		.map((t) => ({
			...t,
			impactParameterRs: t.impactParameterRs as number,
			localEmissionAngleRad: t.localEmissionAngleRad as number
		}));

	it.each(photonRefs)('condiciones iniciales de $name', (t) => {
		const launch = unwrap(photonFromImpact(12, Math.PI, t.impactParameterRs));
		expect(launch.constants.kappa).toBe(0);
		expectClose(launch.constants.energy, t.energy);
		expectClose(launch.constants.angularMomentum, t.angularMomentum);
		expectClose(launch.state.radialDerivative, t.initialState.radialDerivative);
		expectClose(unwrap(incomingPhotonDirection(12, t.impactParameterRs)), t.localEmissionAngleRad);
		expectClose(launch.constants.angularMomentum / launch.constants.energy, t.impactParameterRs);
		expect(launch.state.radialDerivative).toBeLessThan(0);
	});

	it('la rapidez local de la luz es c en cualquier dirección', () => {
		for (const alpha of [0, 0.4, Math.PI / 2, 2.5, Math.PI, -1.2]) {
			const { constants, state } = unwrap(photonFromDirection(7, 0, alpha));
			expect(
				normalizedConstraintResidual(state.radiusRs, state.radialDerivative, constants)
			).toBeLessThan(1e-14);
			expectClose(localVelocity(state, constants).speedC, 1, 1e-12, 1e-14);
		}
	});

	it('el fotón circular en x = 1,5 tiene derivada radial nula y rapidez local 1', () => {
		const { constants, state } = unwrap(photonFromDirection(1.5, 0, Math.PI / 2));
		expect(Math.abs(state.radialDerivative)).toBeLessThan(1e-15);
		expect(Math.abs(radialAcceleration(1.5, constants.angularMomentum, 0))).toBeLessThan(1e-14);
		expectClose(localVelocity(state, constants).speedC, 1);
		expectClose(constants.angularMomentum / constants.energy, CRITICAL_IMPACT_RS);
	});

	it('admite B negativo y rechaza |B| fuera del máximo geométrico', () => {
		const neg = unwrap(photonFromImpact(12, Math.PI, -3));
		expectClose(neg.constants.angularMomentum / neg.constants.energy, -3);
		const bMax = maxImpactParameter(12);
		expectClose(bMax, 12 / Math.sqrt(11 / 12));
		expect(photonFromImpact(12, Math.PI, bMax).ok).toBe(true);
		const tooBig = photonFromImpact(12, Math.PI, bMax * 1.001);
		expect(!tooBig.ok && tooBig.code).toBe('invalid-impact');
		expect(photonFromImpact(12, Math.PI, NaN).ok).toBe(false);
	});
});
