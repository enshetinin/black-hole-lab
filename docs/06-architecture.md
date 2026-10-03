# 06 · Arquitectura y responsabilidades

## Capas

`physics/` calcula magnitudes, condiciones iniciales y derivadas. `simulation/` integra, detecta eventos y controla transporte. `rendering/` proyecta coordenadas y dibuja. `components/` contiene UI y accesibilidad. `scenarios/` valida y serializa configuración. `content/` contiene textos y fuentes. Cada capa puede probarse sin arrancar todas las demás.

Dependencias permitidas: UI → simulation/scenarios/physics; simulation → physics; rendering → tipos de snapshot y utilidades puras; physics → constants/types. Ninguna capa inferior importa componentes. Canvas no devuelve el radio físico que usan las métricas: ambos leen el mismo estado.

## Árbol objetivo

```text
src/
  app.html
  app.css
  lib/
    physics/
      constants.ts
      units.ts
      schwarzschild.ts
      initialConditions.ts
      geodesics.ts
      newtonian.ts
      diagnostics.ts
      types.ts
    simulation/
      engine.ts
      integrators/rk4.ts
      integrators/verlet.ts
      trajectory.ts
      events.ts
      scheduler.ts
      types.ts
    rendering/
      renderer.ts
      camera.ts
      layers.ts
      grid.ts
      disk.ts
      trails.ts
    state/lab.svelte.ts
    scenarios/
      schema.ts
      presets.ts
      url.ts
      storage.ts
      export.ts
    content/
      copy.ts
      concepts.ts
      sources.ts
    components/
      LabShell.svelte
      ExperimentTabs.svelte
      Scene.svelte
      SceneOverlay.svelte
      Transport.svelte
      MassControl.svelte
      ObserverControl.svelte
      OrbitControls.svelte
      PhotonControls.svelte
      LayerControls.svelte
      Metric.svelte
      ClockComparison.svelte
      ScientificPanel.svelte
      ScenarioActions.svelte
      HelpPanel.svelte
      RangeField.svelte
  routes/
    +layout.ts
    +layout.svelte
    +page.svelte
    about/+page.svelte
tests/
  unit/
  e2e/
static/
  favicon.svg
  social-preview.png   # solo si se genera un asset real
```

Es guía de límites, no obligación de crear archivos vacíos. Fusionar dos módulos pequeños si mejora claridad. Separar scene rendering del componente Svelte antes de que +page crezca en miles de líneas. Evitar barrels con imports circulares.

## Estado Svelte

Config de baja frecuencia en runes: masa, radio, unidades, tab, parámetros iniciales, capas, calidad y zoom. Valores derivados: rs, tg, q y métricas. Estado mutable de alta frecuencia, partículas y trazas dentro del motor; exponer snapshots ligeros a la UI a ~10 Hz. Canvas lee el snapshot de render por frame sin producir cientos de escrituras reactivas.

Crear estado por instancia de LabShell; no singleton mutable compartido durante SSR. Los módulos físicos son puros. `$effect` para conectar configuración con motor, con dependencias cuidadosamente acotadas; no para recalcular una fórmula que cabe en `$derived`. Evitar feedback entre campo km y x: mantener una fuente canónica x y estado de edición local.

## Ciclo de vida

SSR renderiza título, controles iniciales y texto. `onMount` crea motor/renderizador, obtiene tamaño, registra observadores y lee URL/localStorage. Cleanup retorna una función sincrónica que destruye recursos. No acceder a window/document/Canvas en evaluación de módulo ni convertir el callback onMount en async si eso elimina cleanup efectivo.

ResizeObserver entrega CSS width/height; renderer ajusta backing store con DPR cap. Eventos de input generan comandos explícitos. Al cambiar un escenario, validar todo y hacer commit atómico con pausa/reset, no una cadena de efectos que emiten cuerpos con configuración intermedia.

## API del motor

Crear, configurar, preparar trayectorias, play, pause, step, reset, snapshot, subscribe y destroy. Idempotencia: pause ya pausado no falla; destroy dos veces no deja listener; play no crea un segundo RAF. La UI no llama directamente al integrador por cada frame.

## Dependencias sugeridas

Svelte, SvelteKit, Vite, TypeScript y adapter-static; svelte-check; Vitest para unidades; Playwright para E2E; ESLint + plugin Svelte y Prettier compatibles. No añadir Three.js, Redux, una librería de física, un framework de componentes o charts para unas pocas líneas SVG. Zod opcional para validación si realmente reduce complejidad; de lo contrario validadores explícitos con tests.

## Errores

Errores de usuario por campo, parse/validation con resultado discriminado, fallos de integración por trayectoria. Fallo de Canvas deja controles y tabla científica disponibles y un mensaje claro. Sin try/catch global que convierta cualquier excepción en una simulación silenciosamente vacía. Un bug inesperado se registra durante desarrollo y mantiene un fallback útil.
