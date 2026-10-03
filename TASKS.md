# Backlog ejecutable

Estado 2026-10-03: F0–F8 implementadas y verificadas (ver docs/PROGRESS.md). Matices: F7.2 revisado con viewports 360/768/1440/800×360 en Chromium; el zoom del navegador al 200 % y dispositivos físicos quedan pendientes de revisión manual. F8.1: CI creado, no ejecutado (requiere push). Estimaciones relativas: S pequeña, M media, L grande. No son promesas de duración. Los IDs sirven para progreso, commits e incidencias; no requieren crear50 issues externos.

## Orden y puertas de calidad

F0 → F1 → F2 → F3 → F4 → F5 → F6 → F7 → F8. P0 se alcanza tras F3; 1.0 exige F8. Se puede preparar contenido y pruebas de una fase mientras se implementa otra, pero no marcar completada una puerta con dependencias rotas. Los documentos se leen por fase; no es necesario mantener todo el kit en contexto siempre.

## F0 · Proyecto ejecutable · M

Leer README, CLAUDE, docs/06,12,14,15.

- [x] F0.1 Inspeccionar repo/git y revisiones, registrar archivos existentes.
- [x] F0.2 Verificar Node/Svelte/Kit/Vite compatibles y crear scaffold temporal.
- [x] F0.3 Integrar scaffold conservando encargo; package-lock, .nvmrc y TS estricto.
- [x] F0.4 adapter-static, prerender, SSR shell, `/` y `/about` iniciales.
- [x] F0.5 Configurar lint/formato/Vitest/Playwright y scripts reales.
- [x] F0.6 Página base en español, tokens, layout y estilos de foco.
- [x] F0.7 Ejecutar check/lint/build y una prueba real de smoke.

Salida: `npm ci` y scripts funcionan en entorno limpio, app abre y build estático existe. No crear workflow que falle por scripts ausentes. Actualizar PROGRESS con versiones y comandos.

## F1 · Física pura y referencias · L

Leer docs/04,05,07,11 y reference/README.

- [x] F1.1 Constantes, conversiones, tipos/unidades y errores de dominio.
- [x] F1.2 rs,tg,q,inversa, radios1/1.5/3 y aceleración estática si se muestra.
- [x] F1.3 Condiciones iniciales masivas/fotónicas y transformaciones a Newton.
- [x] F1.4 Ecuaciones geodésicas y velocidad local, sin dependencias de navegador.
- [x] F1.5 Circulares, estabilidad, período, Bcrit y potencial radial.
- [x] F1.6 Unit tests analíticos e invariantes de inicialización contra golden-values.
- [x] F1.7 Especificar dominios y comprobar NaN/Infinity/valores límite.

Salida: fórmulas correctas con datos de referencia; ninguna función acepta estados físicamente imposibles silenciosamente.

## F2 · Corte completo de relojes · L

Leer docs/01–03,06–08,10–11.

- [x] F2.1 Shell con tabs, escena y panel de controles responsive.
- [x] F2.2 Cámara/mapping CSS↔mundo, resize/DPR, horizonte y referencias.
- [x] F2.3 Masa/radio inputs y sliders log, lock rs/km, validación de edición.
- [x] F2.4 Observador drag con pointercapture, límites y alternativa teclado.
- [x] F2.5 Dos relojes/razón/inversa y comparación de60s.
- [x] F2.6 Transporte play/pause/step/reset, dt monotónico y protocolo de movimiento.
- [x] F2.7 Pausa al ocultar, cleanup y montaje idempotente.
- [x] F2.8 Tests de controles y estado, un flujo E2E de relojes.

Salida: mover observador produce métricas/relojes correctos; cambio masa comporta según lock y reinicia; móvil/teclado son usables.

## F3 · Presentación y comprensión · M

Leer docs/02,08,10,13.

- [x] F3.1 Disco artístico, malla opcional, leyenda y escala claras.
- [x] F3.2 Capas, zoom y encuadre, recuperar observador fuera de campo.
- [x] F3.3 Presets de relojes, tutorial omitible y fórmulas accesibles.
- [x] F3.4 /about con hipótesis y fuentes; distinción horizonte/sombra.
- [x] F3.5 Movimiento reducido, no autoplay, mensajes discretos accesibles.
- [x] F3.6 Revisión visual desktop/móvil/zoom200% y correcciones.

Salida P0: laboratorio de relojes completo, verificado y cuidado. Seguir F4, no declarar1.0.

## F4 · Integración y órbitas · L

Leer docs/03–08,11.

- [x] F4.1 RK4 step-doubling, tolerancias, aceptación/rechazo y budgets.
- [x] F4.2 Verlet y eventos de captura/salida/periastro.
- [x] F4.3 Precompute incremental/cancelable, samples T e interpolación.
- [x] F4.4 Inicialización/lanzamiento de partículas, numérico y drag.
- [x] F4.5 Trayectorias/pairs acotados y estilos distintos.
- [x] F4.6 Circular, precesión, infall, escape; tiempo propio en masivas.
- [x] F4.7 Comparación T común y explicación de mismas condiciones coordenadas.
- [x] F4.8 Diagnóstico residual/energía; error/budget no disfrazados de resultado.
- [x] F4.9 Tests de conservación, convergencia,10 vueltas y eventos.
- [x] F4.10 E2E de lanzamiento, comparación, reset y límite de partículas.

Salida: órbitas calculadas reproduciblemente y diferencias de modelo reales. Los puntos de retorno no dependen de un cambio manual de raíz.

## F5 · Fotones · L

Leer docs/03–05,07–11.

- [x] F5.1 Emisor finito, B→α, dominio de impacto y presets.
- [x] F5.2 Geodésicas nulas con integración común T, sin tiempo propio.
- [x] F5.3 Render rays/trails y resultados captura/dispersión/crítico.
- [x] F5.4 Previsualización al cambiar B sin bloquear slider.
- [x] F5.5 Pruebas B2.4/B3 y ambos lados del crítico.
- [x] F5.6 E2E de fotones, ayuda contextual y resultados accesibles.

Salida: se observa el cambio de trayectoria con B; crítico explicado como inestable, no como una animación circular perpetua.

## F6 · Guardar y compartir · M

Leer docs/07,09,11.

- [x] F6.1 SchemaV1, catálogo final y validación atómica.
- [x] F6.2 Codec URL/Unicode/límites y precedencia de carga.
- [x] F6.3 Persistencia debounce y errores de storage.
- [x] F6.4 JSON import/export y estado anterior preservado en fallo.
- [x] F6.5 Clipboard con fallback y mensaje fiable.
- [x] F6.6 PNG con labels/contexto/escala/modelo, Blob cleanup.
- [x] F6.7 Round-trip, entradas inválidas, schema futuro y E2E.

Salida: compartir reproduce condiciones en pausa; no filtra datos ni requiere servidor.

## F7 · Calidad transversal · L

Leer docs/02,05,08,11,13.

- [x] F7.1 Auditoría teclado, labels, contraste, tabs y aria-live.
- [x] F7.2 Responsive360/768/1440, landscape y200% zoom.
- [x] F7.3 Stress de remount/reset/jobs/cuerpos5 min; recursos acotados.
- [x] F7.4 Medir frames/long tasks y ajustar rendering con evidencia.
- [x] F7.5 Fallback Canvas/storage/clipboard/export/integration errors.
- [x] F7.6 Revisar toda microcopy y unidades; quitar placeholders/TODO del alcance.
- [x] F7.7 Capturas reales y fixtures deterministas de regresión.

Salida: sin fallos altos/bloqueantes en uso normal y recursos; resultados de rendimiento contextualizados.

## F8 · Release local1.0 · M

Leer docs/12–15 y prompt de auditoría.

- [x] F8.1 Crear CI después de scripts probados; versiones actions verificadas.
- [x] F8.2 npm ci limpio, npm run verify y npm run test:e2e.
- [x] F8.3 Servir build estático y probar rutas recargadas/export/compartir.
- [x] F8.4 Auditoría completa de docs/13 y corrección de defectos.
- [x] F8.5 Actualizar README, límites, decisiones y PROGRESS.
- [x] F8.6 Entrega con evidencia y problemas reales; sin deploy/push.

Salida: 1.0 lista para revisión local. Si faltan verificaciones por entorno, registrar pendiente explícito; no declarar aceptación completa.

## Protocolo ante bloqueo

Registrar tarea, comando/acción, fallo, causa probable y alternativas intentadas. Continuar trabajo independiente que no necesite ese bloqueo. No eliminar requisitos, bajar precisión ni fingir resultados para cerrar una casilla. Dejar un siguiente paso concreto y pedir contexto solo si es indispensable.

## Cambios de alcance

Si el usuario añade una función, clasificar P0/P1/P2, anotar impacto y actualizar aceptación y backlog antes de implementarla. No añadir un modo visual sin aclarar su física. Un requerimiento P2 no debe desplazar la corrección de la física de 1.0.
