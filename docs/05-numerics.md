# 05 · Integración y motor

## Decisión principal

Geodésicas integradas con RK4 adaptativo mediante step doubling, usando λ y acumulando T. Precalcular trayectoria y muestrear por T para render. Newton con velocity Verlet en T. El motor anima las dos sobre una T global común. Puede cambiarse a integración directa en T si hay evidencia clara de simplicidad y precisión, registrándolo y manteniendo todos los criterios.

La capa que precalcula es incremental y cancelable. Una solicitud más nueva invalida la anterior por generation id. No bloquear el main thread calculando miles de pasos en un handler de slider. Jobs cortos con presupuesto ~4 ms y yield entre chunks; usar Worker solo si una medición real lo justifica. No depender de OffscreenCanvas para 1.0.

## RK4 adaptativo

Estado y=[x,v,φ,T]. E,ℓ,κ constantes. Calcular un paso h completo y dos medios pasos. Estimación de error en el resultado fino: |yFine−yFull|/15 para RK4. Comparar por componente con atol+rtol*max(|yOld|,|yFine|). Aceptar el resultado de los dos medios pasos cuando max(errorNormalizado)≤1. Evitar extrapolar sin prueba adicional. Actualizar h con safety*error^(−1/5), safety≈0.9, crecimiento máximo 2 y reducción mínima 0.2. Error cero permite crecer hasta el máximo.

Defaults de partida: atol=1e−9, rtol=1e−8, hInitial=0.01, hMax=0.1, hMin=1e−8. Ajustarlos solo con convergencia e invariantes documentados. φ no se envuelve durante integración; T es acumulativo por trayectoria y nunca decrece. Evitar que una T grande relaje indebidamente su precisión: usar error absoluto o escala local para el incremento temporal además del error del resto.

Limitar pasos por variación radial, por ejemplo h≤0.05*x/max(|v|,1e−12), y limitar Δφ a ~0.03 rad para muestras de trazas. Estos controles son criterios numéricos, no fuerzas nuevas. Al rechazar un paso no modificar estado visible, relojes, buffers ni contadores de tiempo aceptado.

Todos los estados intermedios de RK4 necesitan x>xStop o manejo de evento antes de evaluar f. Si un candidato cruza cutoff o dominio, reducir el paso y localizar el evento. No evaluar la derivada a x≤1 y confiar en un clamp posterior.

## Eventos

Captura: primer cruce entrante de xStop=1.01. Bracketing con subpasos/halving para localizar tiempo y posición; tolerancia radial ~1e−5. La etiqueta habla de cutoff numérico y el render conserva horizonte en x=1.

Periastro/apastro: cambios de signo de v, útiles para diagnósticos de precesión. Interpolar o localizar raíz con refinamiento; no comparar ángulos de muestras muy espaciadas. No fabricar puntos de retorno cambiando v a cero.

Salida de escena: estado visual, no necesariamente término de la trayectoria. Límite exterior de integración xExit=24 por defecto para fotones del laboratorio. Para entrantes desde x0=12, salir nuevamente por x≥12 con v>0 ya demuestra dispersión exterior y puede clasificar el preset como escapado; si se usa el límite exterior registrar xExit. Masivas: etiqueta “Fuera del área”; escape al infinito solo si condiciones de energía y potencial permiten continuar sin retorno exterior. Si no implementas esa prueba, usa exclusivamente “Fuera del área”.

Órbita crítica de fotón: por presupuesto o proximidad prolongada se etiqueta “Próxima al crítico / límite de cálculo”, no estable. Una trayectoria circular exactamente inicializada puede ser un caso analítico de test, pero la UI no promete estabilidad física.

## Presupuestos y fallos

Máximo por trayectoria: 200000 pasos aceptados/rechazados en total, 500000 intentos de derivada como techo inicial a ajustar coherentemente con 12 evaluaciones RK4 por intento, TMax=2000 en masivas y TMax=400 en fotones, y presupuesto de pared cancelable. Si se alcanza cualquiera, devolver resultado parcial con budget-exceeded. No esperar agotar dos límites incompatibles: cada límite es independiente.

Al llegar a hMin sin poder aceptar, valores no finitos, T no creciente o residual excesivo, detener el cuerpo con numerical-error y preservar el resto de la UI. Devolver motivo y datos de diagnóstico; el producto muestra una explicación útil y permite reiniciar. La consola de desarrollo puede incluir detalles, sin exponerlos obligatoriamente en el flujo normal.

Objetivos iniciales: residual normalizado máximo <1e−6 en presets estables y dispersivos; radio circular x=6 con desviación relativa <1e−4 tras 10 vueltas; convergencia al reducir tolerancia. Cerca del crítico no exigir la misma clasificación para perturbaciones menores que el error numérico; comparar resultados a ambos lados con margen claro.

## Newton

Velocity Verlet: posición siguiente = posición + velocidad*h + 0.5*a*h²; calcular nueva a; velocidad siguiente = velocidad+0.5*(aOld+aNew)*h. h fijo por trayectoria seleccionable, default ≤0.01 T para pruebas; subpasos más pequeños cerca de centro si son necesarios y se documentan. Sin epsilon de softening que altere órbitas dentro del dominio. Antes de R≤xStop localizar el cruce y detener.

Monitorizar E_N y L_N con error relativo respecto a una escala no singular. En órbita circular de R=6, h=0.01, 10 vueltas: deriva energética relativa <1e−4, angular <1e−6. Añadir prueba de convergencia h vs h/2. Energía cercana a cero requiere error absoluto normalizado, no división por cero.

## Relación entre frame y física

Un único requestAnimationFrame. Delta de pared desde performance.now, no Date.now. Clamp a 0.05 s cuando un frame tarda mucho; pausado no añade delta. Cada frame avanza el reloj de animación TAnimation += deltaWall*20*speed, con speed∈[0.25,4]. Mostrar “20 rs/c por segundo de animación · ×1”, y segundos físicos acumulados T*tg. Es una escala de reproducción deliberada, independiente de los relojes didácticos.

Trajectories almacenan muestras monotónicas en T. Buscar muestras adyacentes por cursor/binary search e interpolar x,φ para una T de render común, con φ sin wrap. La precisión de la curva depende de muestreo por curvatura; no almacenar una muestra solo por frame. Para relojes de una partícula, interpolar λ en T; nunca inferir tiempo propio de la longitud de la traza.

El observador estático vive en el experimento Relojes; no aplicar un elapsedTime compartido entre ese experimento y el parámetro afín de fotones. El panel explica la escala de cada tab.

## Limpieza y determinismo

Stop cancela RAF; destroy elimina ResizeObserver, listeners, pointer capture, jobs y buffers. Remount produce exactamente un motor. Reset limpia acumuladores, eventos y cursores. Cambiar tolerancia invalida trayectorias; cambiar zoom solo re-renderiza. Semilla fija para estrellas y presets; física sin Math.random.

Integrador invocable sin navegador para tests. Misma entrada y calidad producen resultados numéricamente reproducibles dentro de tolerancia, no prometer binario idéntico entre todas las plataformas. Buffers de traza acotados, por ejemplo 4096 puntos por cuerpo; decimar adaptativamente o ring buffer con indicación de histórico truncado. No perder los datos de diagnóstico al recortar dibujo.
