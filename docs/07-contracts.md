# 07 · Contratos de datos

Estos tipos son diseño, no código ya compilado. Implementarlos en TypeScript y refinarlos sin cambiar unidades o semántica. Los números externos necesitan validación runtime; TypeScript no valida un JSON.

## Configuración persistible

```ts
type Experiment = 'clocks' | 'orbits' | 'photons';
type OrbitModel = 'newtonian' | 'schwarzschild' | 'compare';
type Quality = 'low' | 'balanced' | 'high';
type DistanceLock = 'rs' | 'km';

interface ScenarioV1 {
  schemaVersion: 1;
  experiment: Experiment;
  massSolar: number;                   // [3,100]
  observer: {
    radiusRs: number;                  // [1.01,20], fuente canónica
    angleRad: number;                  // normalizada a [0,2π)
    distanceLock: DistanceLock;
  };
  orbit: {
    model: OrbitModel;
    radiusRs: number;                  // [1.1,15]
    angleRad: number;
    speedLocalC: number;               // [0,0.95], input de referencia local
    directionRad: number;              // desde radial exterior
    comparison: 'same-coordinate-state'; // comparación 1.0 con T común
  };
  photon: {
    emissionRadiusRs: number;          // [6,20]
    emissionAngleRad: number;
    impactParameterRs: number;         // finito y geométricamente permitido
    incoming: true;                    // emisor entrante para UI 1.0
  };
  view: {
    zoom: number;                     // [0.5,2]
    grid: boolean;
    disk: boolean;
    references: boolean;
    labels: boolean;
    trails: boolean;
    quality: Quality;
  };
  playback: { speed: number };         // [0.25,4]; nunca persistir running
}
```

Un escenario no contiene partículas vivas, trazas, timestamps, clipboard, diagnósticos o referencias DOM. Exporta condiciones iniciales; al restaurarlo no aparece una simulación avanzada arbitrariamente. Un optional presetId es metadata y no sustituye parámetros. Si se añade, validar contra catálogo.

Defaults: clocks, masa10, observer radius4/angle0/lock rs, orbit Schwarzschild radius6/angle0/β=sqrt(0.1)/directionπ/2/comparison same-coordinate-state, photon emission12/angleπ/B3/incoming true, zoom1, grid false, disk true, references true, labels true, trails true, quality balanced, speed1.

## Estado de integración

```ts
type GeodesicKind = 'massive' | 'photon';
interface GeodesicConstants {
  kind: GeodesicKind;
  kappa: 0 | 1;
  energy: number;
  angularMomentum: number;
}
interface GeodesicState {
  radiusRs: number;
  radialDerivative: number;            // dx/dλ, NO velocidad local
  azimuthRad: number;                  // sin envolver
  coordinateTime: number;              // T
  parameter: number;                   // λ; S solo para massive
}
interface NewtonState {
  xRs: number;
  yRs: number;
  vxC: number;                         // dX/dT
  vyC: number;
  coordinateTime: number;
}
type BodyStatus = 'active' | 'captured' | 'out-of-view' | 'escaped'
  | 'budget-exceeded' | 'numerical-error';
interface TrajectorySample {
  coordinateTime: number;              // relativo al lanzamiento
  radiusRs: number;
  azimuthRad: number;
  parameter?: number;                  // significado definido por kind
}
```

La constante kind y kappa deben ser coherentes; idealmente discriminated union evita massive/kappa0. coordinateTime global del motor incluye spawnT, muestras guardan edad en T. No confundir “T relativo a lanzamiento” y “T global”: documentar el campo en el tipo real, por ejemplo `ageCoordinateTime` para samples y `spawnCoordinateTime` para body.

Render lee cartesiano derivado X=x cosφ, Y=x sinφ. Mantener un marcador de modelo en cada traza y el identificador del par comparativo. ID incremental determinista, nunca derivado de r o color.

## Errores tipados

```ts
type Result<T> = { ok: true; value: T }
  | { ok: false; code: string; message: string; field?: string };

interface IntegrationDiagnostics {
  acceptedSteps: number;
  rejectedSteps: number;
  derivativeEvaluations: number;
  maxConstraintResidual: number;
  lastStep: number;
  terminationReason: string;
}
```

Códigos estables sugeridos: invalid-number, out-of-range, observer-inside-horizon, invalid-orbit-radius, superluminal-input, invalid-impact, unsupported-schema, malformed-scenario, storage-unavailable, clipboard-unavailable, step-underflow, non-finite-state, budget-exceeded. Mensajes de UI se localizan; tests comprueban código, no cada palabra.

## Contrato operativo del motor

```ts
interface LabEngine {
  configure(scenario: ScenarioV1): Result<void>;
  prepareLaunch(): Promise<Result<void>>;
  launch(): Result<string[]>;
  play(): void;
  pause(): void;
  step(deltaCoordinateTime?: number): void;
  reset(): void;
  getSnapshot(): LabSnapshot;
  subscribe(listener: (s: LabSnapshot) => void): () => void;
  destroy(): void;
}
```

LabSnapshot contiene transporte, experiment, relojes didácticos si corresponde, T global si corresponde, cuerpos visibles, resultados discretos y diagnósticos. No serialize callbacks ni permitir que un consumidor mutile buffers internos. La firma exacta puede distinguir clock step y orbital step en una unión, mejor que un parámetro temporal ambiguo.

## Validación y atomicidad

Validar objeto plano, schemaVersion, enum, boolean estricto, números finitos, rangos y dependencias. No coercionar "false" a true ni cadenas vacías a cero. Rechazar NaN/Infinity antes de serializar. Restringir tamaño de entradas. No merge profundo ciego de JSON en estado u objetos de clases.

Import exitoso produce un ScenarioV1 completo validado y luego un solo commit. Import fallido preserva el escenario actual. Si faltan campos de schemaVersion1, rechazar con error concreto; para URLs compactas permitir defaults explícitamente definidos en su codec. Migraciones solo para versiones que realmente existan; no inventar compatibilidad futura.
