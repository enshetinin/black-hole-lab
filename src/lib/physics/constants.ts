/** Constantes SI de la convención del proyecto (docs/04). Iguales a reference/golden-values.json. */
export const G_SI = 6.6743e-11; // m³ kg⁻¹ s⁻²
export const C_SI = 299_792_458; // m/s
/** Masa solar convencional del proyecto, kg (no es una constante exacta). */
export const SOLAR_MASS_KG = 1.98847e30;

/** Radios notables, en rs. */
export const HORIZON_RS = 1;
export const PHOTON_SPHERE_RS = 1.5;
export const ISCO_RS = 3;
/** Cutoff numérico exterior: el cálculo se detiene aquí; no redefine el horizonte. */
export const CAPTURE_CUTOFF_RS = 1.01;
/** Impacto crítico B = b/rs para rayos desde infinito: 3√3/2. */
export const CRITICAL_IMPACT_RS = (3 * Math.sqrt(3)) / 2;

/** Dominios de producto (docs/01, docs/07). */
export const MASS_MIN_SOLAR = 3;
export const MASS_MAX_SOLAR = 100;
export const OBSERVER_MIN_RS = 1.01;
export const OBSERVER_MAX_RS = 20;
export const ORBIT_RADIUS_MIN_RS = 1.1;
export const ORBIT_RADIUS_MAX_RS = 15;
export const ORBIT_SPEED_MAX_C = 0.95;
export const PHOTON_EMITTER_MIN_RS = 6;
export const PHOTON_EMITTER_MAX_RS = 20;
export const PHOTON_IMPACT_MAX_RS = 5;
