# 11 · Plan de pruebas

## Estrategia

Unit tests de física y codecs; integración del motor con reloj/RAF inyectables; E2E de flujos de usuario; revisión visual real. No usar snapshots de HTML como sustituto de comprobar comportamiento. Toda tolerancia explica escala, duración y motivo. La referencia Python del kit es una implementación independiente de diagnóstico, no una biblioteca de producción.

## Física analítica

| Caso | Comprobación |
| --- | --- |
| M=1,10,100 | rs coincide con referencia; linealidad en masa |
| x=1.01,1.1,1.5,3,4,20 | q coincide con golden-values y aumenta monótonamente |
| x≤1, NaN, Infinity | Error de dominio, ninguna métrica aparentemente válida |
| x constante, masa×2 | q igual, km y tg×2 |
| Radio km fijo | Conversión x cambia, dominio validado |
| Circulares x=2,3,6 | E,ℓ y velocidad local correctos; estabilidad etiquetada |
| Circular x≤1.5 | Rechazo sin NaN |
| Velocidad β≥1 | Rechazo de condiciones masivas |
| Condiciones locales | Invariante radial satisfecho, v no confundido con β |
| Fotón radial/oblicuo | βlocal²≈1, κ=0, sin reloj propio |
| Bcrit | 3sqrt(3)/2, distinguido de1.5 y1 |
| Ángulo de fotón | E,ℓ y v iniciales satisfacen B=ℓ/E y normalización |
| Impacto inválido | Rechazo, no asin silenciosamente truncado |

Tolerancias analíticas típicas abs1e−12, rel1e−10 para magnitudes adimensionales; metros según escala. No comparar string formateado como prueba de ecuación.

## Integración

- Circular Schwarzschild x6, 10 períodos: máximo error relativo en radio<1e−4 y residual normalizado<1e−6. Estimar10 vueltas con φ−φ0≈20π o T≈10P_T.
- Circular Newton x6, h0.01, 10 períodos: deriva energía<1e−4, angular<1e−6.
- Repetir a tolerancia más estricta / h/2 y confirmar convergencia del observable, no solo que la traza sea bonita.
- Geodésica precession x6,β0.30,απ/2: ≥2 periastros no triviales; detectar cambio de ángulo; comparar referencia de fixture con tolerancia documentada. Newton con el mismo estado coordenado cierra aproximadamente.
- Radial desde reposo x6: v se vuelve negativo y termina en cutoff, nunca salta a radio negativo ni pierde finitud.
- Radial saliente β0.7: aumenta r y E>1; no afirmar captura por un error de signo.
- Fotón B2.4 entrante x12: cutoff alcanzado. B3: retorno exterior y dispersión. Bcrit*(1±1e−4): lados distintos de la barrera con integración suficiente; si termina por presupuesto, distinguir ese resultado.
- Estado exacto de fotón circular x1.5: comprobar derivada radial0 y rapidez local1; no exigir estabilidad frente a perturbaciones.
- Pasos rechazados no avanzan T, λ o buffers. Orden de muestras T estricto. No integrador real dependiente del framerate.
- Refinar captura no evalúa derivadas dentro del dominio prohibido. Step underflow, budget y nonfinite generan estados distinguibles.

No usar el fixture fijo de RK4 como valor exacto de una trayectoria: comparar endpoint/periastro con tolerancias y confirmar convergencia por separado. El critical es especialmente sensible.

## Motor y recursos

Inyectar scheduler/reloj y testear un solo RAF con play repetido, pause, step y reset. Pausado no avanza. Visibilitychange pausa y no acumula delta oculto. Resize no resetea física. Cambio de masa reinicia; zoom/capas no. Mover observador integra razón variable con el protocolo documentado.

Cancelación de job: escenario antiguo no sustituye al nuevo tras resolver una promesa. Destroy limpia subscriptions/listeners/jobs/observer. Remount no duplica callbacks. Límite de cuerpos y puntos respetado. Interpolación común T hace comparables dos curvas; tiempo propio solo en masivas.

## Contratos externos

Round-trip JSON/URL, Unicode, inputs enormes, arrays en lugar de objetos, strings numéricas, undefined en defaults, campos desconocidos, schema futuro, valor fuera de rango y dependencia B/x0 inválida. Intentos de __proto__/constructor no se mezclan ciegamente. URL inválida conserva fallback definido. localStorage throwing no rompe UI. Clipboard throwing ofrece alternativa y no anuncia éxito.

## E2E mínimos

1. Cargar `/`: título, controles y métricas iniciales; sin excepciones de consola.
2. Set x4→1.1, comprobar q y km; iniciar, comprobar ambos relojes y razón en un intervalo controlado.
3. Pausar, esperar con reloj de test, confirmar valores sin cambio; reset conserva parámetros.
4. Masa10→20 con lock rs mantiene q y duplica rs; lock km responde según dominio.
5. Teclado puede controlar observador y tabs; foco visible y sin trampa.
6. Drag cambia x, pointercancel no deja estado atascado; mobile permite scroll exterior.
7. Preset circular funciona; comparación de precesión muestra dos leyendas y curvas distintas después de tiempo suficiente. En circular exacta se permite coincidencia espacial y se explica.
8. Fotones capturado/escapado producen resultados correctos; near-critical no se etiqueta estable.
9. Compartir y recargar restaura escenario en pausa; import inválido conserva anterior.
10. PNG produce archivo real con leyenda; JSON tiene schema correcto; reimport restaura.
11. `/about` y recarga directa funcionan en build estático.
12. Viewports360×800,768×1024,1440×900 sin desbordamiento horizontal ni controles inaccesibles.

Esperas por condición observable o reloj controlado; no dormir arbitrariamente10s en cada test. No exponer internals de desarrollo en producto: test hooks solo build/test cuando sean indispensables. Tests del parser son puros, sin necesidad de subir archivos reales para cada variante.

## Accesibilidad

Labels, nombres/roles, valores, estados, foco, navegación tabs, inputs y acciones. Contraste de tokens finales, zoom navegador200%, prefers-reduced-motion, orientación, target44 px para acciones principales. Canvas acompañado por métricas y descripción de resultado en HTML. Color acompañado de estilo/texto. Screen reader no recibe60 announcements/s. Automated axe si se incorpora puede detectar fallos, pero no sustituye teclado ni lectura humana.

## Rendimiento y evidencia

Medir interacción y frames con fixtures estándar durante 30s; stress5 min de resets y límites. Registrar ambiente, no cifras genéricas. Verificar memoria/recursos estabilizados. Capturas deterministas de UI pausada con semilla fija; trazar curvas no requiere snapshot por pixel de cada sample.

La entrega registra comando, resultado, fecha y ambiente. Cualquier prueba no ejecutada queda pendiente, no marcada pasada. Resolver bloqueantes y altos antes de 1.0.
