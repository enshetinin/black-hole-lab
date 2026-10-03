# 13 · Criterios normativos de aceptación

## Regla

Todos los requisitos siguientes, salvo los marcados opcionales, son necesarios para 1.0. El avance por fases no cambia este alcance. Bloqueante = impide uso, física engañosa o pérdida de datos; alto = función requerida rota, inaccesible o resultado falso. No aprobar1.0 con defectos bloqueantes/altos.

## A · Base y arquitectura

- [ ] Svelte 5/runes, Kit estable compatible, TS estricto; dependencias/Node fijados.
- [ ] App estática sin backend, secretos o servicios requeridos.
- [ ] Física, motor, dibujo y UI con límites claros y comprobables.
- [ ] SSR del shell y mount seguro; window no rompe build.
- [ ] Un solo loop, cleanup idempotente, cancelación de jobs obsoletos.
- [ ] README y fuentes describen lo implementado.

## B · Laboratorio de relojes

- [ ] Masa3–100M☉, control log y entrada equivalente, radio y km validados.
- [ ] rs=2GM/c², q=sqrt(1−1/x), x>1; fixtures y dominios probados.
- [ ] Drag y alternativa teclado; x y distancia del observador sincronizados.
- [ ] Dos relojes acumulativos con escala didáctica visible, pause/step/reset.
- [ ] Cambio de masa reinicia; cambio de radio integra el protocolo explicado.
- [ ] Lock rs conserva x; lock km válido conserva r; cambios inválidos se rechazan.
- [ ] Horizonte1 rs, fotones1.5 rs, ISCO3 rs correctos a cualquier zoom.
- [ ] Malla/disco identificados como ilustraciones, sombra no confundida.
- [ ] Comparación por intervalo y advertencia de observador estático.

## C · Órbitas

- [ ] Preparación/lanzamiento numérico y drag opcional realmente funcionan.
- [ ] Newton con Verlet; Schwarzschild con geodésicas y eventos verificables.
- [ ] Velocidad medida/convertida e inicialización descritas; ningún v del solver se llama velocidad local.
- [ ] Comparación usa misma T; tipo de comparación y condiciones visibles.
- [ ] Circular estable, precesión, caída y escape radial verificables.
- [ ] Es estable x>3, marginal x3, inestable1.5<x<3; sin circular masiva x≤1.5.
- [ ] Captura cutoff diferenciada de horizonte; salida de área no falsa prueba de escape.
- [ ] Trazas/modelos distinguibles por texto y estilo; tiempo propio solo para masivas.
- [ ] Conservación y convergencia cumplen tolerancias documentadas.

## D · Fotones

- [ ] Condiciones nulas, rapidez local c, sin tiempo propio.
- [ ] B desde ángulo/emisor finito; rango y dependencia validados.
- [ ] B2.4 capturado, B3 dispersado, crítico≈2.598 explicado y demostrado.
- [ ] Curvas calculadas, no sprites que sigan caminos inventados.
- [ ] Caso próximo al crítico no prometido estable/eterno.
- [ ] Animación sobre T, parámetro afín correctamente distinguido.
- [ ] Cutoff/budget/error no clasificados como hechos físicos distintos.

## E · UI y accesibilidad

- [ ] Composición, tipografía, contraste y estados del diseño aplicados.
- [ ] Desktop/tablet/móvil 360 px y zoom200% sin controles perdidos.
- [ ] Tabs/fields/actions tienen labels, foco y navegación correcta.
- [ ] Movimiento reducido, pausa al ocultar y paso manual disponibles.
- [ ] Explicación/tabla permiten entender resultados sin Canvas.
- [ ] No dependencia exclusiva del color, drag o hover.
- [ ] Capas/zoom/encuadre no alteran física; observador fuera de campo recuperable.
- [ ] Todos los botones funcionan, incluidos export y copiar con fallback.

## F · Escenarios y entrega

- [ ] Presets deterministas completos y validados.
- [ ] URL, JSON y localStorage cumplen precedencias/rangos/límites/versionado.
- [ ] Restaurar en pausa y reset atómico; fallo de import conserva estado.
- [ ] PNG incluye contexto, valores y límites; JSON se puede reimportar.
- [ ] verify y E2E pasan; resultados reales registrados.
- [ ] Build estático probado y `/about` recargable.
- [ ] Sin excepciones no controladas en flujos principales ni crecimiento ilimitado de recursos.
- [ ] Revisión visual y de teclado realizada o limitación explícita pendiente de aceptación.
- [ ] TASKS/PROGRESS reflejan estado comprobado, no aspiraciones.

## Opcional posterior

Rotación Kerr, óptica de imagen,3D, hidrodinámica, export de vídeo, traducción inglesa, precisión configurable para usuarios expertos. No son condiciones de 1.0 ni sustituyen pendientes del núcleo.
