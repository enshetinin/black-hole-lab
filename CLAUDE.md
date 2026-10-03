# Black Hole Lab

## Objetivo

Implementa desde cero el producto descrito en `docs/01-product.md`. El resultado debe ser una aplicación terminada, interactiva, responsive y verificable; no una maqueta ni solamente una propuesta. Trabaja por fases de `TASKS.md` hasta cumplir `docs/13-acceptance.md` para 1.0.

## Antes de escribir código

Lee README, TASKS, docs/PROGRESS y el prompt de la sesión. Para F0/F1 lee docs/01–07 y 11–15. Para cada fase posterior lee sus documentos relacionados. Inspecciona el repositorio antes de cambiarlo y preserva archivos del usuario. Inicializa el framework en una carpeta temporal si la raíz contiene este kit.

## Decisiones técnicas

- Svelte 5 con runes, SvelteKit estable compatible, TypeScript estricto.
- Canvas 2D para escena; HTML para controles accesibles; SVG para gráficas y relojes.
- Adaptador estático, páginas prerenderizadas. Mantén SSR para el shell; APIs de navegador solo tras mount.
- npm y un solo package-lock.json. Selecciona Node LTS compatible, registra su versión.
- No backend, login, IA en runtime, pagos ni servicios externos.
- Física pura sin imports de Svelte, Canvas, DOM, Date o performance.
- Motor sin dependencia de UI; rendering sin autoridad sobre valores físicos.
- No motor por componente, bucles duplicados ni crear partículas reactivas a 60 Hz.

## Reglas físicas

`docs/04-physics.md` es la fuente normativa; `docs/05-numerics.md` define la integración. Un agujero negro de Schwarzschild tiene un solo parámetro físico central: masa. Zoom y disco son parámetros visuales. Distancia = radio areal desde el centro, no altura sobre el horizonte ni distancia propia.

- Reloj estático: sqrt(1 - 1/x), x > 1. Nunca extenderlo al interior.
- Esfera de fotones = 1.5 rs; ISCO = 3 rs. Distingue órbitas inestables y marginalmente estables.
- No llamar relatividad general a una fuerza newtoniana con un factor decorativo.
- Fotones sin reloj propio. No aplicarles Newton ni mostrar velocidades locales superiores a c.
- Malla y acreción son ilustraciones. La sombra aparente no es el horizonte.
- Masa constante por ejecución. Cambios de masa o condiciones iniciales reinician trayectorias y relojes.
- No silenciar NaN, errores de integración o escenarios inválidos con valores que parezcan físicos.

## Flujo de trabajo

1. Expón un plan corto, resuelve elecciones rutinarias con estos documentos y empieza.
2. Implementa un corte completo, ejecuta sus comprobaciones, corrige fallos.
3. Actualiza TASKS y docs/PROGRESS con evidencia real y siguiente paso.
4. Repite hasta F8. No termines la tarea en F1 porque ya hay un MVP visual.
5. Si falta contexto al cambiar de sesión, reconstruye el estado desde archivos y git.

No necesitas preguntarme por cada color, archivo o librería pequeña. Pregunta solo ante decisiones que cambien sustancialmente el alcance, un bloqueo real o acciones externas no autorizadas. Nunca borres trabajo existente ni publiques, hagas push o conectes servicios sin una petición explícita. No desactives controles de permisos del entorno.

## Calidad

Crear los scripts `dev`, `build`, `preview`, `check`, `lint`, `format`, `test:unit`, `test:e2e`, `test` y `verify`. Véase docs/12-delivery para su semántica.

Antes de dar por terminada una fase ejecuta sus pruebas pertinentes. Antes de 1.0 ejecuta npm run verify y npm run test:e2e. No afirmes que algo pasó si no lo ejecutaste. Si el entorno no permite una prueba, informa del bloqueo y deja el comando exacto pendiente.

Pruebas relevantes: fórmulas, dominios, conservación, convergencia, eventos, resize, pause, reset, URL, teclado y flujos de usuario. Nada de tests que solo repitan una constante de implementación. Revisión visual real en escritorio y móvil cuando haya navegador; no sustituirla por inspección de código.

## Estilo y entrega

- UI y documentación en español; identificadores en inglés; explicaciones concisas.
- Funciones pequeñas con unidades y dominios documentados; sin `any` ni ignores globales.
- Reutiliza controles por necesidad; evita una biblioteca de componentes genérica prematura.
- CSS con tokens, foco visible, movimiento reducido, contraste y números tabulares.
- No añadir dependencias, endpoints ni assets remotos sin una razón concreta.
- No introducir placeholders permanentes, botones inertes, datos mock disfrazados ni TODO dentro del alcance final.
- Entrega README de la app, comandos comprobados, límites físicos, resultados de pruebas y problemas abiertos reales.

## Autoridad de los documentos

Petición explícita más reciente del usuario > decisión documentada posterior > docs/04 de física, docs/07 de datos y docs/13 de aceptación > resto del kit. Si detectas contradicción no física, elige la opción coherente con estas fuentes y registra la corrección. Si detectas una ecuación errónea, verifícala con fuentes primarias y actualiza fórmula, fixtures y tests; no la reproduzcas ciegamente.
