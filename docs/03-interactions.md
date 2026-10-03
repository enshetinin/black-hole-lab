# 03 · Interacciones y estados

## Transporte común

`Iniciar / Pausar`, `Paso`, `Reiniciar experimento`, `Valores iniciales`. Paso está disponible en pausa y avanza un intervalo explícito: relojes 0.1 s de tiempo didáctico; órbitas/fotones 0.1 unidades T de tiempo coordenado. El control de velocidad altera la animación, no las ecuaciones. Seleccionar pestaña pausa y reinicia el experimento activo, conserva masa, observador y preferencias visuales; una pestaña no mantiene un motor oculto.

Al perder visibilidad se pausa, se vacía el acumulador de frames y se exige “Iniciar” al volver. No resumir automáticamente. Un cambio físico que invalide trayectorias hace reset y muestra un mensaje breve. Un cambio puramente visual no toca tiempos ni condiciones iniciales.

## Masa

Slider logarítmico, 3–100 M☉; campo numérico equivalente con step 0.1. Mapping para posición p∈[0,1]: M = exp(ln(3)+p ln(100/3)). El input permite edición parcial sin convertir cadena vacía en cero. Validar en blur/Enter; cancelar edición con Escape. Rechazar valores no finitos y fuera de rango mostrando el rango; el slider siempre produce valores válidos.

Masa y radio del horizonte no son sliders independientes. Al cambiar masa: mantener x del observador por defecto, recalcular km, limpiar trayectorias, reiniciar relojes y pausar. En modo “Fijar km”, mantener el radio físico si x sigue en [1.01,20]. Si no, rechazar el cambio de masa con explicación y opción explícita para volver a escala rs. No recolocar silenciosamente a través del horizonte.

## Observador

Slider x logarítmico entre 1.01 y 20, entrada x y entrada km con conversión atómica. Elegir unidades no modifica la posición. Drag radial sobre la escena: transformar coordenadas CSS a mundo, obtener x y ángulo, limitar x al dominio; permitir rodear el centro. El reloj depende de x, no del ángulo. Mostrar aviso cuando el drag alcanza el límite mínimo, sin anunciarlo cada frame.

Pointer capture durante drag; liberar en pointerup/cancel. El drag se detiene al perder foco o desmontar. La superficie permite scroll móvil fuera del hit area; usar touch-action adecuado en la zona de manipulación, no bloquear toda la página.

Alternativa de teclado: sliders nativos, entradas numéricas y botones “Acercar / Alejar”. Observador SVG/HTML enfocable si se usa como control: flechas izquierda/derecha cambian x por un paso documentado, Shift multiplica el paso, Home/End van a límites, aria-label incluye propósito y aria-valuetext valor. No intentar convertir cada estrella de Canvas en un elemento accesible.

Mover x con relojes activos integra razón variable respecto al tiempo didáctico; panel informa de que es una comparación cuasiestática de ritmos, sin tiempo del traslado. “Comparar 60 s” calcula una comparación con el x actual fijo, independiente de tiempos acumulados.

## Lanzar una partícula

Modo Órbitas: seleccionar Newton / Schwarzschild / Comparar. Preparar posición con x∈[1.1,15], φ libre; β∈[0,0.95] de referencia local y dirección α medida desde radial exterior, positiva hacia +φ. Panel numérico con radio, velocidad, dirección y botón “Lanzar”. En Newton se muestra también la velocidad coordenada convertida que usa su motor. No crear partículas con click accidental: activar “Preparar lanzamiento” primero.

Drag opcional define vector: punto inicial = posición y punta = dirección/velocidad. Mientras se arrastra mostrar flecha, β y explicación. Mapping visual explícito configurable, por ejemplo 120 CSS px = 0.5c y clamp 0.95c; ninguna fórmula usa píxeles. En Comparar, mostrar las velocidades iniciales resultantes de la conversión de coordenadas de docs/04.

La ejecución contiene como máximo 8 partículas masivas o 8 pares comparativos y 12 fotones; lanzar al alcanzar el límite debe pedir limpiar o eliminar la más antigua con opción visible, sin acumular indefinidamente. Todos los cuerpos del mismo experimento parten del mismo tiempo coordenado global; los nuevos se añaden en el T actual. Su edad y su tiempo propio parten de cero al lanzamiento.

Botón “Órbita circular”: solo para x>1.5 en Schwarzschild; advierte inestable en 1.5<x<3, marginal en x=3 y estable en x>3. Para el preset estable usar x=6. En Comparar se conserva el mismo estado coordenado inicial: para una circular exacta, ambas curvas espaciales pueden coincidir y el panel explica sus diferencias de estabilidad y tiempo propio. No inventar separación de curvas; usar el preset de precesión no circular para verla. El input mantiene su significado de referencia local incluso al preparar una circular Newton, convirtiendo desde la velocidad coordenada requerida.

## Fotones

Emitir desde x0=12 a φ0=π por defecto, hacia el interior. Control principal B=b/rs en [0,5], con presets 2.4, 3.0 y cercano a 3sqrt(3)/2. Signo de B disponible como dirección arriba/abajo. Actualizar trayectoria precomputada y dejarla pausada antes de animar. El modo avanzado puede cambiar x0 en [6,20] y calcula automáticamente el máximo admisible |B|≤x0/sqrt(f0); si hay conflicto, rechazar la entrada.

No llamar a B distancia perpendicular en la pantalla para emisor finito. Mostrar ángulo local derivado. El caso crítico se etiqueta “Próximo a órbita inestable”; no prometer una órbita eterna con números finitos. No hay slider de velocidad de la luz.

## Zoom y capas

Zoom 0.5–2.0 relativo al encuadre base, botones y rueda solo cuando la escena está enfocada; no secuestrar el scroll de la página. Doble click no hace reset secreto. Botón “Encuadrar” vuelve al zoom base. Observador fuera del viewport tiene indicador de dirección/distancia o botón para encuadrar; no se modifica su radio físico para hacerlo visible.

Toggles: disco, malla ilustrativa, referencias, trazas, etiquetas. Leyenda y métricas esenciales permanecen disponibles aunque se oculten las referencias. Al ocultar trazas, no detener integración. Incluir indicador de escala rs/km.

## Estados de la sesión

Estado de transporte: paused/running. Estado de cuerpo: active/captured/out-of-view/escaped/budget-exceeded/numerical-error. Captura significa llegar al cutoff exterior de cálculo; salida de área y escape confirmado se distinguen. Un cuerpo detenido por presupuesto no se clasifica como estable, capturado ni escapado.

La región aria-live anuncia cambios discretos —pausa, resultado, error—, nunca relojes por frame. Tooltips con foco y Escape; ayuda importante disponible inline. Tabs implementan roles, selección y navegación por flechas, sin interceptar atajos mientras el usuario escribe en un campo.
