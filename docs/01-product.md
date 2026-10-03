# 01 · Producto y alcance

## Visión

Un laboratorio donde la relatividad se entiende manipulando un experimento. El usuario mueve un observador, cambia la masa, lanza una partícula o ajusta un fotón y ve consecuencias cuantitativas inmediatas. La escena debe invitar a jugar; las explicaciones deben ayudar a interpretar lo observado.

Público: personas curiosas, estudiantes y desarrolladores. No exigir conocimiento de cálculo tensorial. Añadir profundidad progresiva con fórmulas y diagnósticos bajo demanda. No diseñar una consola de instrumentación industrial.

## Promesa verificable

En el primer minuto el usuario puede acercar el observador al horizonte, ver que el reloj cercano avanza menos y leer por qué. En cinco minutos puede distinguir horizonte, esfera de fotones e ISCO y comparar una órbita clásica con una relativista. Puede guardar o compartir las condiciones iniciales del experimento.

## Estructura

Una única ruta principal `/` con tres experimentos mediante tabs accesibles: **Relojes**, **Órbitas**, **Fotones**. Una ruta `/about` con fuentes, hipótesis y límites, prerenderizada. Los tabs no crean motores concurrentes. Evitar páginas separadas que pierdan el escenario al navegar.

En escritorio: cabecera compacta, escena protagonista, panel lateral de controles, banda de métricas y explicación contextual. En móvil: escena, métricas esenciales y controles en bloques verticales. Los controles nunca cubren el observador.

## Alcance P0

- Masa de 3 a 100 masas solares, control logarítmico y entrada numérica.
- Radio del observador de 1.01 a 20 rs; estado inicial 4 rs y 10 M☉.
- Distancia mostrada en rs y km, dominio validado.
- Horizonte, esfera de fotones e ISCO con geometría coherente.
- Dos relojes acumulativos, razón local/lejano y comparación por intervalos.
- Drag de observador y alternativa equivalente por teclado y campos.
- Zoom, play/pause, reset, capas, movimiento reducido y modo sin animación.
- Malla ilustrativa y disco artístico, ambos desactivables.
- Presets de relojes, explicación, fórmulas y límites del modelo.
- Pruebas de fórmulas, estado, accesibilidad básica y build estático.

## Alcance P1 obligatorio para 1.0

- Partículas de prueba: lanzamiento con posición y velocidad, drag y controles numéricos.
- Newton y geodésicas de Schwarzschild; trayectorias con separación real entre modelos.
- Comparación de órbitas sobre la misma escena, con inicialización documentada y tiempo coordenado común.
- Trayectorias de fotones con parámetro de impacto, dispersión, captura y caso próximo al crítico.
- Integración con tolerancias, eventos, límites de cómputo y diagnóstico de conservación.
- Presets deterministas, incluyendo órbita estable, precesión, caída, escape y fotones.
- Exportar/importar escenario JSON y enlace URL; exportar PNG de la escena con leyenda.
- Persistencia local opcional y robusta; restaurar valores iniciales de fábrica.
- Tutorial breve, ayuda contextual, fuentes y registro de hipótesis.
- Revisión responsive, teclados, pruebas de motor y flujos E2E.
- README de ejecución, lockfile, scripts y CI localmente reproducibles.

## P2 fuera de la entrega inicial

Kerr y rotación física; ray tracing de imagen completa; Three.js/WebGL; disco de acreción hidrodinámico; espectros, temperatura o brillo calibrado; ondas gravitatorias; radiación de Hawking; interior del horizonte; campos magnéticos; muchas partículas gravitándose entre sí; cuenta de usuario; servidor de escenarios; colaboración; VR; vídeo exportable. No mostrar botones para estas funciones en la app 1.0.

Los rayos de P1 son trayectorias 2D, no una imagen óptica del agujero negro. El disco cálido no implica que se haya calculado su transferencia radiativa.

## Historias y resultados

| ID | Acción | Resultado comprobable |
| --- | --- | --- |
| U01 | Acercar el observador | Disminuye sqrt(1−1/x); cambian km, razón y reloj local |
| U02 | Aumentar masa a x constante | Crecen rs y km; la razón de relojes permanece igual |
| U03 | Fijar radio físico y aumentar masa | Baja x y cambia la razón; se rechaza un radio interior |
| U04 | Desactivar disco | Quedan visibles referencias y partículas, sin perder datos |
| U05 | Preparar una órbita circular | Se ven velocidad y radio válidos; no afirmar estabilidad dentro del ISCO |
| U06 | Comparar modelos | Ambas curvas usan el mismo evento inicial y tiempo coordenado; se explica la conversión |
| U07 | Cambiar impacto de un fotón | Cambian captura/deflexión; el crítico es distinguible |
| U08 | Pausar y volver minutos después | No salta la simulación ni acumula tiempo oculto |
| U09 | Compartir condiciones | La URL restaura parámetros y deja la simulación pausada |
| U10 | Usar solo teclado | Puede modificar parámetros y ejecutar los mismos experimentos |

## Comportamiento global

Estado inicial pausado, con vista atractiva estática y botón “Iniciar”. Esto funciona con movimiento reducido y evita autoplay inesperado. El observador puede moverse mientras corren los relojes; se integra la razón a lo largo del movimiento como protocolo educativo de reloj recolocado cuasiestáticamente, sin pretender calcular el viaje de un observador real. Se explica en la ayuda. Cambiar masa reinicia ambos relojes y trayectorias; cambiar radio no reinicia relojes. “Reiniciar experimento” restablece tiempos y cuerpos manteniendo parámetros; “Valores iniciales” restaura todos los controles.

Una partícula no modifica la masa central. Escapar del campo de visión no basta para afirmar escape al infinito. No etiquetar como estable una trayectoria solo porque aún no ha caído.

## Criterios de éxito

Respuesta del control visual en el siguiente frame útil; geometría y números coherentes; sin scroll horizontal a 360 px; ninguna función depende exclusivamente del color o del drag; escena legible con capas decorativas apagadas. Cero errores no controlados en consola en los flujos principales. Los objetivos de rendimiento deben medirse con dispositivo y configuración registrados.
