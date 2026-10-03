# 14 · Registro de decisiones

Decisiones iniciales tomadas2026-10-03. Claude añadirá fecha, cambio, razón y evidencia si ajusta alguna. No reabrir elecciones cerradas por preferencia personal sin una mejora concreta.

| ID | Decisión | Motivo y consecuencia |
| --- | --- | --- |
| D01 | Svelte 5 + Kit estable | Runes para controles derivados; estructura, prerender y tooling oficiales |
| D02 | Canvas 2D + HTML/SVG | Escena fluida, controles accesibles y menor complejidad que3D |
| D03 | Un solo agujero Schwarzschild | Fórmulas verificables; Kerr requiere física y proyección adicionales |
| D04 | rs como unidad interna | Escalas de masa separadas; ecuaciones y presets sencillos |
| D05 | Radio areal en controles | Convención precisa, evita confundir altura y distancia propia |
| D06 | Vista geométrica de laboratorio | Overlays a escala sin confundir imagen óptica y geometría |
| D07 | Disco/malla ilustrativos | Aportan visualización sin fingir ray tracing o gas real |
| D08 | Dos escalas de animación explícitas | Relojes legibles y órbitas subsegundo visibles sin alterar física |
| D09 | Geodésicas exactas para modo GR | Evita una aproximación engañosa al horizonte y a los fotones |
| D10 | Newton como contraste | Enseña diferencias; frontera de captura impuesta claramente |
| D11 | Precompute cancelable + interpolación T | Comparación común, tolerancias independientes del framerate |
| D12 | Cutoff exterior1.01 rs | Evita singularidad de coordenadas y se etiqueta como límite numérico |
| D13 | Escenarios en URL/localStorage | Compartir sin backend; solo condiciones iniciales |
| D14 | Pausado al arrancar/restaurar | Control del movimiento y reproducibilidad |
| D15 | Pruebas analíticas e independiente Python | Ayudan a detectar errores compartidos entre UI y solver |
| D16 | App sin assets remotos requeridos | Export Canvas y offline de runtime más robustos |
| D17 | Sin publicar durante implementación | Entrega local/build para revisión; deploy por petición posterior |

Alternativas no elegidas: fuerza newtoniana corregida sin derivación, potencial Paczyński–Wiita como modo GR general, millones de partículas, física en un shader, diagrama4D literal, renderizar controls dentro del Canvas, store global para todas las trazas, backend para enlaces, framework de UI completo.

El potencial Paczyński–Wiita puede aproximar ciertos rasgos orbitales, pero no produce geodésicas exactas ni describe fotones; no sustituye las ecuaciones de docs/04 en este encargo. Three.js puede añadirse a una vista distinta posteriormente con una necesidad visual real.

## Plantilla de cambio

```text
Fecha:
ID:
Decisión anterior:
Decisión nueva:
Problema observado:
Alternativas consideradas:
Evidencia/pruebas:
Documentos/código/fixtures actualizados:
Impacto en alcance:
```

## Decisiones durante la implementación (2026-10-03)

| ID | Decisión | Motivo y evidencia |
| --- | --- | --- |
| D18 | SvelteKit 3.0.0 (latest estable, publicado 2026-10-01) con Svelte 5.57.1, Vite 8.3.2, TypeScript 6.0.3 | Es la versión `latest` que instala la CLI oficial `sv` 1.0.1; check, lint, Vitest, build y Playwright funcionaron en el scaffold antes de integrarlo. Kit 3 configura el adaptador en `vite.config.ts` y usa subpath imports `#lib/*` (con extensión `.ts`). |
| D19 | Encuadre base por experimento | Relojes y Órbitas: semieje corto ≈ 8,4 rs (o 1,15·x₀ de la órbita si es mayor); Fotones: 1,12·x₀ del emisor para que el emisor de 12 rs sea visible. «Encuadrar observador» ajusta la extensión sin cambiar el radio físico. Zoom sigue en [0,5; 2]. |
| D20 | «Reiniciar experimento» devuelve todos los cuerpos a su lanzamiento en T = 0 | Conserva los cuerpos lanzados (restablece cuerpos y tiempos manteniendo parámetros); «Limpiar trayectorias» los elimina. |
| D21 | Escape masivo solo con criterio suficiente | E ≥ 1, v > 0 y x más allá del máximo del potencial ⇒ no hay retorno. Fotones: saliente con x > 1,5. Si no se cumple, se integra hasta T máx. y fuera de la vista se muestra «Fuera del área». |
| D22 | Muestreo de trayectorias por geometría | Se guarda muestra cuando Δφ ≥ 0,02 rad, Δx ≥ 1 % o ΔT ≥ 1; interpolación lineal en T. Los periastros se localizan con regula falsi y pasos RK4 de prueba (independientes del muestreo). |
| D23 | Cambio de hash en la misma pestaña | Un enlace `#scenario=` pegado en la misma pestaña se carga en pausa (`hashchange`); si es inválido se avisa y se conserva el escenario actual. Al abrir la página con un enlace inválido se usan los valores iniciales. |
| D24 | Presupuestos de cálculo | 200 000 intentos, 2 400 000 evaluaciones (12 por intento), T máx. 2000/400 y 4 s de pared por job. Residual > 1e−4 ⇒ error numérico. |
| D25 | Lecturas digitales de relojes a ~10 Hz; manecillas por frame | Evita estado reactivo a 60 Hz y manipulación directa de nodos de texto gestionados por Svelte. |
| D26 | Lenguaje visual Yev Design v0.2 (petición explícita del usuario, 2026-10-03) sustituye los tokens de docs/02 | Prevalece sobre docs/02 por la regla de autoridad (petición más reciente). Dialecto de aplicación en `/` y de lectura en `/about`. Tinta cálida `#11100E`, papel `#F2EFE8`; **Yev Signal `#FF4D1F` solo como tinta**: observador, su reloj local, su barra de 60 s y la ubicación actual (pestaña/navegación). Colores de datos (Schwarzschild ámbar, Newton lavanda discontinuo, fotón papel, ISCO cian) y semánticos separados de la marca. Atkinson Hyperlegible Next (UI), Newsreader (lead, frase clave de relojes y lectura en /about), Atkinson Hyperlegible Mono (fórmulas, T de la escena), autoalojadas vía @fontsource (OFL-1.1, subconjunto latino, 6 woff2 ≈ 104 KB, sin carga remota). Rejilla de 12 columnas: escena 9 / contexto 3; /about 3/7. Geometría rectilínea (radio 2 px en controles, 0 en superficies), sin sombras ni tarjetas; agrupación por espacio; enlaces subrayados; foco papel independiente del naranja; botón primario por inversión papel/tinta. Contrastes en tests/unit/contrast.test.ts (texto AAA). Sin corte diagonal: no había un momento estructural que lo justificara. Sin modo claro: la escena es espacio oscuro y docs/02 define tema oscuro. |
