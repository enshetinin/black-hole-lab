#!/usr/bin/env python3
"""Independent reference calculations for the specification, not app code.

Python 3.10+, standard library only. Run with --check for validation and with
--write to reproduce golden-values.json. Units: rs=1, GM/c^2=1/2.
Fixed-step RK4 is deliberately different from the proposed adaptive app solver.
"""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

G = 6.67430e-11
C = 299_792_458.0
SOLAR_MASS_KG = 1.98847e30
B_CRIT = 3 * math.sqrt(3) / 2
X_STOP = 1.01


def f(x: float) -> float:
    if not math.isfinite(x) or x <= 1:
        raise ValueError("Schwarzschild exterior requires finite x > 1")
    return 1 - 1 / x


def rs_m(solar: float) -> float:
    if not math.isfinite(solar) or solar <= 0:
        raise ValueError("Mass must be finite and positive")
    return 2 * G * solar * SOLAR_MASS_KG / C**2


def massive_initial(x: float, beta: float, alpha: float):
    if not math.isfinite(beta) or not 0 <= beta < 1:
        raise ValueError("Massive local speed requires 0 <= beta < 1")
    gamma = 1 / math.sqrt(1 - beta**2)
    energy = gamma * math.sqrt(f(x))
    angular = gamma * x * beta * math.sin(alpha)
    radial = gamma * math.sqrt(f(x)) * beta * math.cos(alpha)
    return energy, angular, [x, radial, 0.0, 0.0]


def photon_initial(x: float, impact: float):
    s = impact * math.sqrt(f(x)) / x
    if abs(s) > 1:
        raise ValueError("Impact is incompatible with finite emitter")
    alpha = math.pi - math.asin(s)
    energy = math.sqrt(f(x))
    angular = x * math.sin(alpha)
    radial = math.sqrt(f(x)) * math.cos(alpha)
    return energy, angular, [x, radial, math.pi, 0.0], alpha


def residual(y, energy, angular, kappa):
    x, radial, _, _ = y
    return (radial**2 + f(x) * (kappa + angular**2 / x**2) - energy**2) / max(1, energy**2)


def derivative(y, energy, angular, kappa):
    x, radial, _, _ = y
    return [
        radial,
        -kappa / (2 * x**2) + angular**2 / x**3 - 3 * angular**2 / (2 * x**4),
        angular / x**2,
        energy / f(x),
    ]


def rk4(y, h, energy, angular, kappa):
    def add(a, b, scale):
        return [aa + scale * bb for aa, bb in zip(a, b)]
    a = derivative(y, energy, angular, kappa)
    b = derivative(add(y, a, h / 2), energy, angular, kappa)
    c = derivative(add(y, b, h / 2), energy, angular, kappa)
    d = derivative(add(y, c, h), energy, angular, kappa)
    return [yy + h * (aa + 2 * bb + 2 * cc + dd) / 6 for yy, aa, bb, cc, dd in zip(y, a, b, c, d)]


def trajectory(name, energy, angular, y0, kappa, h=0.004, lambda_max=300, exit_radius=None):
    y = list(y0)
    parameter = 0.0
    max_residual = abs(residual(y, energy, angular, kappa))
    min_radius = y[0]
    pericenters = []
    reason = "parameter-limit"
    steps = 0
    while parameter < lambda_max and steps < 500_000:
        # Reference safety guard: never evaluate RK stages across x=1.
        step = min(h, lambda_max - parameter, 0.1 * (y[0] - 1) / max(abs(y[1]), 1e-8))
        old = y
        new = rk4(old, step, energy, angular, kappa)
        if not all(math.isfinite(v) for v in new):
            raise AssertionError(f"Non-finite reference state: {name}")
        if new[3] <= old[3]:
            raise AssertionError(f"Coordinate time not increasing: {name}")
        fraction = None
        if new[0] <= X_STOP and new[1] < 0:
            fraction = (old[0] - X_STOP) / (old[0] - new[0])
            reason = "captured-at-cutoff"
        elif exit_radius is not None and new[0] >= exit_radius and new[1] > 0 and parameter > h:
            fraction = (exit_radius - old[0]) / (new[0] - old[0])
            reason = "outgoing-at-emitter-radius"
        if fraction is not None:
            boundary = X_STOP if reason == "captured-at-cutoff" else exit_radius
            low, high = 0.0, step
            inward = reason == "captured-at-cutoff"
            for _ in range(36):
                mid = (low + high) / 2
                trial = rk4(old, mid, energy, angular, kappa)
                crossed = trial[0] <= boundary if inward else trial[0] >= boundary
                if crossed:
                    high = mid
                else:
                    low = mid
            event_step = (low + high) / 2
            y = rk4(old, event_step, energy, angular, kappa)
            parameter += event_step
            steps += 1
            min_radius = min(min_radius, y[0])
            max_residual = max(max_residual, abs(residual(y, energy, angular, kappa)))
            break
        if old[1] < 0 <= new[1]:
            fraction = -old[1] / (new[1] - old[1])
            pericenters.append({
                "coordinateTime": old[3] + fraction * (new[3] - old[3]),
                "azimuthRad": old[2] + fraction * (new[2] - old[2]),
                "radiusRs": old[0] + fraction * (new[0] - old[0]),
            })
        y = new
        parameter += step
        steps += 1
        min_radius = min(min_radius, y[0])
        max_residual = max(max_residual, abs(residual(y, energy, angular, kappa)))
    return {
        "name": name,
        "energy": energy,
        "angularMomentum": angular,
        "kappa": kappa,
        "initialState": dict(zip(["radiusRs", "radialDerivative", "azimuthRad", "coordinateTime"], y0)),
        "fixedStep": h,
        "lambdaMax": lambda_max,
        "parameterReached": parameter,
        "steps": steps,
        "termination": reason,
        "finalState": dict(zip(["radiusRs", "radialDerivative", "azimuthRad", "coordinateTime"], y)),
        "minRadiusRs": min_radius,
        "maxConstraintResidual": max_residual,
        "pericenters": pericenters,
    }


def newton_trajectory(name, radius, tangential_speed, duration, h=0.01):
    x, y, vx, vy = radius, 0.0, 0.0, tangential_speed
    t = 0.0
    energy_initial = tangential_speed**2 / 2 - 1 / (2 * radius)
    angular_initial = radius * tangential_speed
    max_energy_error = max_angular_error = 0.0
    min_radius = max_radius = radius
    steps = 0
    while t < duration:
        step = min(h, duration - t)
        r = math.hypot(x, y)
        ax, ay = -x / (2 * r**3), -y / (2 * r**3)
        nx = x + vx * step + ax * step**2 / 2
        ny = y + vy * step + ay * step**2 / 2
        nr = math.hypot(nx, ny)
        nax, nay = -nx / (2 * nr**3), -ny / (2 * nr**3)
        vx += (ax + nax) * step / 2
        vy += (ay + nay) * step / 2
        x, y = nx, ny
        energy = (vx**2 + vy**2) / 2 - 1 / (2 * nr)
        angular = x * vy - y * vx
        max_energy_error = max(max_energy_error, abs((energy - energy_initial) / energy_initial))
        max_angular_error = max(max_angular_error, abs((angular - angular_initial) / angular_initial))
        min_radius, max_radius = min(min_radius, nr), max(max_radius, nr)
        t += step
        steps += 1
    return {
        "name": name,
        "initialRadiusRs": radius,
        "initialTangentialCoordinateSpeedC": tangential_speed,
        "fixedStep": h,
        "coordinateDuration": duration,
        "steps": steps,
        "finalState": {"xRs": x, "yRs": y, "vxC": vx, "vyC": vy},
        "minRadiusRs": min_radius,
        "maxRadiusRs": max_radius,
        "maxRelativeEnergyError": max_energy_error,
        "maxRelativeAngularMomentumError": max_angular_error,
    }


def build_reference():
    masses = [{"massSolar": m, "radiusMeters": rs_m(m), "radiusKm": rs_m(m) / 1000, "timeScaleSeconds": rs_m(m) / C} for m in [1, 3, 10, 20, 100]]
    clocks = [{"radiusRs": x, "localPerReference": math.sqrt(f(x)), "referencePerLocal": 1 / math.sqrt(f(x)), "localAfter60ReferenceSeconds": 60 * math.sqrt(f(x))} for x in [1.01, 1.1, 1.5, 2, 3, 4, 6, 20]]
    circular = []
    for x in [2, 3, 6, 10]:
        beta = 1 / math.sqrt(2 * (x - 1))
        energy, angular, y0 = massive_initial(x, beta, math.pi / 2)
        circular.append({
            "radiusRs": x,
            "localSpeedC": beta,
            "energy": energy,
            "angularMomentum": angular,
            "properPerCoordinateTime": math.sqrt(1 - 1.5 / x),
            "coordinatePeriod": 2 * math.pi * math.sqrt(2 * x**3),
            "newtonCircularSpeedC": 1 / math.sqrt(2 * x),
            "stability": "unstable" if x < 3 else "marginal" if x == 3 else "stable",
        })
    trajectories = []
    for impact in [2.4, 3.0, B_CRIT * (1 - 1e-4), B_CRIT * (1 + 1e-4)]:
        energy, angular, y0, alpha = photon_initial(12, impact)
        t = trajectory(f"photon-B-{impact:.12g}", energy, angular, y0, 0, exit_radius=12)
        t.update({"impactParameterRs": impact, "localEmissionAngleRad": alpha})
        trajectories.append(t)
    for name, beta, alpha, duration in [("infall", 0.0, 0.0, 80), ("escape", 0.7, 0.0, 60), ("precession", 0.30, math.pi / 2, 400)]:
        energy, angular, y0 = massive_initial(6, beta, alpha)
        trajectories.append(trajectory(name, energy, angular, y0, 1, h=0.01, lambda_max=duration))
    return {
        "referenceVersion": 1,
        "units": {"length": "Schwarzschild radii", "coordinateTime": "rs/c", "massiveParameter": "proper time in rs/c", "photonParameter": "affine, local initial energy normalized to 1"},
        "constantsSI": {"G": G, "c": C, "solarMassKg": SOLAR_MASS_KG},
        "criticalImpactParameterRs": B_CRIT,
        "captureCutoffRs": X_STOP,
        "masses": masses,
        "clocks": clocks,
        "circularOrbits": circular,
        "trajectories": trajectories,
        "newtonianTrajectories": [
            newton_trajectory("circular-ten-turns", 6, 1 / math.sqrt(12), 10 * 2 * math.pi * math.sqrt(2 * 6**3)),
            newton_trajectory("same-coordinate-precession-comparison", 6, math.sqrt(f(6)) * 0.30, 400),
        ],
        "trajectoryComparisonTolerance": {"absoluteRadius": 0.001, "absoluteAzimuth": 0.002, "absoluteCoordinateTime": 0.03},
        "notes": ["Trajectory terminal events are refined by bisection with RK4 substeps; pericenters use linear interpolation and are approximate.", "Analytic values are independent of integrator.", "Reference h is fixed; app should use adaptive error control and convergence tests.", "No app tests have run: the application is not implemented in this kit."],
    }


def check_reference(data):
    checks = 0
    for x in [1, 0, -2, math.nan, math.inf]:
        try:
            f(x)
        except ValueError:
            checks += 1
        else:
            raise AssertionError(f"Invalid radius accepted: {x}")
    assert math.isclose(rs_m(10), 10 * rs_m(1), rel_tol=1e-14)
    checks += 1
    for row in data["circularOrbits"]:
        x = row["radiusRs"]
        e, angular, y = massive_initial(x, row["localSpeedC"], math.pi / 2)
        assert abs(residual(y, e, angular, 1)) < 1e-12
        assert abs(derivative(y, e, angular, 1)[1]) < 1e-12
        assert math.isclose(e, f(x) / math.sqrt(1 - 1.5 / x), rel_tol=1e-12)
        assert math.isclose(angular, x / math.sqrt(2 * x - 3), rel_tol=1e-12)
        coordinate_tangential = f(x) * angular / (x * e)
        assert math.isclose(coordinate_tangential, 1 / math.sqrt(2 * x), rel_tol=1e-12)
        checks += 5
    photon_cases = [t for t in data["trajectories"] if t["kappa"] == 0]
    for t in photon_cases:
        expected = "captured-at-cutoff" if t["impactParameterRs"] < B_CRIT else "outgoing-at-emitter-radius"
        assert t["termination"] == expected, (t["name"], t["termination"])
        assert t["maxConstraintResidual"] < 1e-6, t["name"]
        x, radial, _, _ = t["initialState"].values()
        beta2 = (radial / t["energy"])**2 + (t["angularMomentum"] * math.sqrt(f(x)) / (x * t["energy"]))**2
        assert math.isclose(beta2, 1, abs_tol=1e-12)
        checks += 3
    by_name = {t["name"]: t for t in data["trajectories"]}
    assert by_name["infall"]["termination"] == "captured-at-cutoff"
    assert by_name["escape"]["energy"] > 1 and by_name["escape"]["finalState"]["radiusRs"] > 6
    peri = by_name["precession"]["pericenters"]
    assert len(peri) >= 2
    advance = peri[1]["azimuthRad"] - peri[0]["azimuthRad"] - 2 * math.pi
    assert advance > 0.1, advance
    checks += 4
    # Long circular reference: ten revolutions, checked independently of samples.
    x = 6.0
    e, angular, y = massive_initial(x, math.sqrt(0.1), math.pi / 2)
    period_t = 2 * math.pi * math.sqrt(2 * x**3)
    lambda_duration = 10 * period_t * math.sqrt(1 - 1.5 / x)
    circle = trajectory("circular-ten-turns", e, angular, y, 1, h=0.02, lambda_max=lambda_duration)
    assert abs(circle["finalState"]["radiusRs"] - x) / x < 1e-8
    assert abs(circle["finalState"]["azimuthRad"] - 20 * math.pi) < 1e-7
    assert circle["maxConstraintResidual"] < 1e-10
    checks += 3
    # Convergence on the non-circular orbit at equal affine endpoint.
    e, angular, y = massive_initial(6, 0.30, math.pi / 2)
    coarse = trajectory("precession-coarse", e, angular, y, 1, h=0.08, lambda_max=100)
    medium = trajectory("precession-medium", e, angular, y, 1, h=0.04, lambda_max=100)
    fine = trajectory("precession-fine", e, angular, y, 1, h=0.02, lambda_max=100)
    error_coarse = abs(coarse["finalState"]["radiusRs"] - fine["finalState"]["radiusRs"])
    error_medium = abs(medium["finalState"]["radiusRs"] - fine["finalState"]["radiusRs"])
    assert error_medium < error_coarse, (error_coarse, error_medium)
    checks += 1
    for t in data["trajectories"]:
        assert t["maxConstraintResidual"] < 1e-6, t["name"]
        checks += 1
    for t in data["newtonianTrajectories"]:
        assert t["maxRelativeEnergyError"] < 1e-4
        assert t["maxRelativeAngularMomentumError"] < 1e-6
        checks += 2
    return {
        "assertionsPassed": checks,
        "circularTenTurnsFinalRadiusRs": circle["finalState"]["radiusRs"],
        "circularTenTurnsConstraintResidual": circle["maxConstraintResidual"],
        "precessionAdvanceRadBetweenFirstTwoPericenters": advance,
        "convergenceRadiusErrorCoarse": error_coarse,
        "convergenceRadiusErrorMedium": error_medium,
        "newtonCircularMaxRelativeEnergyError": data["newtonianTrajectories"][0]["maxRelativeEnergyError"],
        "newtonCircularMaxRelativeAngularMomentumError": data["newtonianTrajectories"][0]["maxRelativeAngularMomentumError"],
        "scope": "Independent kit reference only; not the future Svelte application",
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write", action="store_true", help="Write golden-values.json next to this script")
    parser.add_argument("--check", action="store_true", help="Run independent consistency and convergence checks")
    args = parser.parse_args()
    data = build_reference()
    if args.check:
        report = check_reference(data)
        print(json.dumps(report, indent=2, allow_nan=False))
    if args.write:
        target = Path(__file__).with_name("golden-values.json")
        target.write_text(json.dumps(data, indent=2, ensure_ascii=False, allow_nan=False) + "\n", encoding="utf-8")
        print(f"Wrote {target.name}")
        if args.check:
            report_target = Path(__file__).with_name("validation-report.json")
            report_target.write_text(json.dumps(report, indent=2, allow_nan=False) + "\n", encoding="utf-8")
            print(f"Wrote {report_target.name}")
    if not args.check and not args.write:
        print(json.dumps(data, indent=2, ensure_ascii=False, allow_nan=False))


if __name__ == "__main__":
    main()
