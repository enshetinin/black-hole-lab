# Progreso de construcción

## Estado actual (2026-10-03)

Fases F0–F8 implementadas en una sesión. `npm ci`, `npm run verify` y `npm run test:e2e` pasan en entorno limpio. Pendientes reales al final de este archivo.

```text
Fecha / ambiente / versiones:
  2026-10-03 · macOS 27.0.1 · Node 24.21.0 · npm 11.19.0
  svelte 5.57.1 · @sveltejs/kit 3.0.0 · adapter-static 4.0.0 · vite 8.3.2 · typescript 6.0.3
  vitest 4.1.11 · @playwright/test 1.63.0 (Chromium 1243) · eslint 10.12.0 · prettier 3.9.9
  svelte-check 4.7.6 · CLI de scaffold: sv 1.0.1 (template minimal, TS)

Fase y tareas terminadas: F0–F8 (ver TASKS.md). Detalle de evidencia abajo.

Archivos principales:
  src/lib/physics/*            constantes, unidades, Schwarzschild, condiciones iniciales, geodésicas, Newton
  src/lib/simulation/*         rk4.ts, verlet.ts, trajectory.ts, scheduler.ts, engine.ts
  src/lib/rendering/*          camera.ts, renderer.ts, exportImage.ts
  src/lib/scenarios/*          schema.ts, presets.ts, url.ts, storage.ts, export.ts
  src/lib/state/*              lab.svelte.ts, sceneView.ts
  src/lib/components/*.svelte  LabShell, Scene, controles, tabla, paneles
  src/routes/+page.svelte, src/routes/about/+page.svelte
  tests/unit/*.test.ts, tests/e2e/lab.e2e.ts, .github/workflows/ci.yml
  docs/screenshots/*.png, docs/14-decisions.md (D18–D25), README.md

Comandos realmente ejecutados (último ciclo, desde raíz limpia: rm -rf build .svelte-kit):
  npm ci                     → OK (aviso informativo de install-scripts de fsevents)
  npm run verify             → check 0 errores/0 avisos; prettier+eslint OK; 126 tests unitarios OK; build estático OK
  npm run test:e2e           → 18/18 OK (Chromium, build + vite preview :4173)
  python3 reference/generate_reference.py --check → 57 aserciones OK (oráculo del kit)

Resultados y evidencia:
  Física (tests/unit/physics.test.ts): rs, tg y q contra golden-values (rel 1e-10); dominios x ≤ 1, NaN, ±∞;
    circulares x=2,3,6,10 (E, ℓ, β, dτ/dt, período, estabilidad); rechazo x ≤ 1,5; β ≥ 1; |B| > x0/√f0;
    normalización de condiciones masivas y nulas; rapidez local de la luz = 1; Newton con mismo estado coordenado.
  Integración (tests/unit/integration.test.ts):
    circular x=6, 10 períodos: desviación de radio < 1e-4, residual < 1e-6, dS/dT = √0,75, sin falsos periastros;
    precesión x=6, β=0,30: 3 periastros dentro de la tolerancia del oráculo (r 1e-3, φ 2e-3, T 0,03); avance 3,77 rad;
    convergencia: error del 2.º periastro disminuye >10× al endurecer tolerancias; defaults vs fina < 1e-6 rad;
    caída radial: captura en el cutoff, T y λ según referencia; escape β=0,7: E>1, x creciente, r(T) según referencia;
    fotones B=2,4 capturado, B=3 dispersado (periastro 2,2267), Bcrit(1±1e-4) a lados distintos;
    pasos rechazados no avanzan T/λ/buffers; underflow, presupuesto, evaluaciones y no-finito distinguibles
    (corregido un fallo: un NaN se interpretaba como cruce del cutoff → ahora numerical-error).
    Newton circular R=6, h=0,01, 10 períodos: ΔE/E < 1e-4, ΔL/L < 1e-6; convergencia h vs h/2.
  Motor (tests/unit/engine.test.ts): un solo frame pendiente con play repetido; pausa sin avance ni tiempo oculto;
    clamp 0,05 s; paso manual; razón variable al mover x; reset/restartPhysics; destroy idempotente;
    snapshots ≤ ~10 Hz; T común a 20 rs/c por s; τ solo en masivas; límites 8/12; jobs obsoletos sin resultado.
  Escenarios (tests/unit/scenarios.test.ts): validación estricta (strings numéricas, booleanos como texto, campos
    desconocidos/ausentes, arrays, __proto__, schema futuro), URL round-trip con B crítico exacto, UTF-8,
    fragmentos > 12000, storage que lanza, debounce, JSON import/export, presets válidos y con el resultado anunciado.
  Contraste (tests/unit/contrast.test.ts): tokens de texto ≥ 4,5:1 sobre bg/surface/surface-raised; bordes ≥ 3:1.
  E2E (tests/e2e/lab.e2e.ts): carga sin errores de consola; relojes x=1,1 con reloj de Playwright controlado;
    pausa 60 s sin cambio; paso y reset; masa con lock rs/km y rechazo; entrada vacía/fuera de rango/Escape;
    tabs y observador por teclado; observador fuera de campo y «Encuadrar observador»; drag con límite 1,01;
    precesión con dos curvas separadas y diagnóstico 3,77 rad; límite de 8 lanzamientos; caída/escape;
    fotones capturado/dispersado/casi crítico y previsión al cambiar B; enlace copiado restaura en pausa;
    URL inválida; JSON y PNG reales (firma PNG) y reimportación; import inválido conserva estado;
    persistencia y Valores iniciales; pausa al ocultar; /about con recarga directa;
    sin desbordamiento en 360×800, 768×1024, 1440×900 y 800×360.
  Revisión visual real (Chromium headless, capturas en docs/screenshots): desktop-relojes, desktop-comparacion
    (precesión tras ~340 T), desktop-fotones-critico, movil-relojes (x=1,5), movil-controles; todas con la
    simulación en pausa, masa 10, calidad equilibrada. Corregido tras revisarlas: rótulos de anillos solapados
    (ahora con líneas guía y rótulos cortos en lienzos < 520 px), etiqueta del observador en móvil, hueco del
    disco que parecía un segundo disco negro, panel lateral con scroll anidado, alineación de presets.
  Rendimiento (Chromium 1243 headless, macOS, MacBook del usuario; preview del build; 30 s; Órbitas con
    8 pares Newton/Schwarzschild = 16 cuerpos en marcha):
    1440×900, DPR 1, calidad equilibrada: 60,0 fps de media, p95 16,8 ms, 0 long tasks > 50 ms.
    360×800, DPR 2, calidad baja: 60,0 fps, p95 16,7 ms, 0 long tasks. Heap ≈ 10 MB.
  Estrés de recursos (5 min, 151 ciclos de lanzar 8 pares + 12 fotones, reproducir, reiniciar, cambiar pestaña
    y masa; después 10 remontajes vía /about): heap tras GC 17,1 MB → 17,1 MB → 17,1 MB; 0 errores;
    en pausa no hay bucle continuo de RAF.

Problemas abiertos / severidad:
  - (medio, verificación) CI creado pero no ejecutado: requiere push, no autorizado. Comando local equivalente
    probado: npm ci && npm run verify && npm run test:e2e.
  - (medio, verificación) Revisión solo con Chromium headless. Pendiente: Safari/Firefox reales, dispositivo
    móvil físico (scroll táctil fuera del asa del observador), lector de pantalla y zoom del navegador al 200 %
    (aproximado con viewports 768 y 800×360).
  - (bajo) Las cifras de rendimiento son de headless en un único equipo; no son garantía para otros dispositivos.
  - (bajo) Los asas de lanzamiento en la escena no son enfocables; la alternativa de teclado son los campos
    numéricos del panel (documentado).
  Sin defectos bloqueantes ni altos conocidos.

Decisiones nuevas: D18–D25 en docs/14-decisions.md.

Siguiente tarea concreta: si se quiere publicar, hacer push para que corra CI y elegir hosting estático
  (revisar base path). Para revisión manual: npm ci && npm run build && npm run preview.

Estado de git: sin commits nuevos (no se pidió commitear). Todo el trabajo está en el árbol de trabajo.
```

## Rediseño Yev Design (2026-10-03, petición del usuario `/yev-design`)

```text
Cambios: tokens y tipografía en src/app.css; layout de 12 columnas (escena 9 / contexto 3) en LabShell;
  cabecera con navegación y ubicación actual; tabs subrayadas; métricas, relojes, presets, tablas, lecturas y
  plegables sin tarjetas; control segmentado rectilíneo; /about en dialecto de lectura; paleta del lienzo y
  observador en Yev Signal con halo de tinta; fuentes en Canvas/PNG y redibujado al cargar fuentes.
Dependencias nuevas (devDependencies, bundled): @fontsource/atkinson-hyperlegible-next 5.3.0,
  @fontsource/atkinson-hyperlegible-mono 5.3.0, @fontsource/newsreader 5.3.0 (OFL-1.1).
Comandos ejecutados: npm run verify → 0 errores/avisos, lint OK, 130 tests unitarios, build OK;
  npm run test:e2e → 18/18. build/ contiene 6 woff2 (104 KB) y ninguna referencia a servidores de fuentes.
Revisión visual real: capturas regeneradas en docs/screenshots (relojes, comparación, fotones casi críticos,
  móvil relojes y controles, /about). Ajustado tras revisarlas: lecturas de reloj en Atkinson Next (la mono
  espaciaba demasiado la puntuación), alineación del enlace «Valores iniciales», marca naranja retirada del logo.
Decisión: D26 en docs/14-decisions.md (prevalece sobre los tokens de docs/02).
```

## GitHub Pages (2026-10-04)

```text
Cambios: BASE_PATH → paths.base en vite.config.ts; detección de /about por route.id; .github/workflows/pages.yml;
  README (sección GitHub Pages); D27.
Comandos: npm run verify → 0 errores, 130 unit, build OK; npm run test:e2e → 18/18;
  BASE_PATH=/black-hole-lab npm run build → OK; BASE_PATH inválido → error explícito.
Prueba local bajo subdirectorio (servidor que imita la resolución de Pages, Chromium): /black-hole-lab/,
  navegación y recarga de /about, aria-current correcto, 5 fuentes locales cargadas, enlace #scenario restaurado
  en otra pestaña, 0 respuestas ≥ 400 y 0 errores de consola.
Pendiente: activar Pages (Source: GitHub Actions) y el primer despliegue real tras el push.
```

## Estado inicial (histórico)

Kit preparado 2026-10-03; aplicación no inicializada; valores de referencia generados por el script del kit.
