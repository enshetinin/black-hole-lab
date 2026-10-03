# 08 · Rendering y rendimiento

## Vista de laboratorio

Plano de coordenadas equatoriales, agujero negro centrado. Proyección ortográfica radial: pantalla = centro + escala*(X,−Y). Inversa exacta para drag, usando boundingClientRect y CSS pixels. El backing store DPR no interviene en la conversión física. Cámara base visible hasta ~8 rs en el eje corto; el observador puede alcanzar 20 y entonces ofrecer “Encuadrar observador” y un indicador fuera de campo. Si Encuadrar necesita zoom menor a0.5, extender el encuadre base temporalmente con estado de cámara documentado; no cambiar x ni fingir que está dentro. Una opción más simple es hacer fit explícito ajustando extent y conservar zoom en[0.5,2].

Dibujo del horizonte radio scale*1, esfera fotones scale*1.5, ISCO scale*3. Los círculos conservan estas proporciones con cualquier masa y zoom. Distancia siempre desde centro. Nada de escalar un glow y usar su tamaño como horizonte.

## Capas y orden

1. Fondo oscuro y estrellas estáticas en cache.
2. Malla ilustrativa opcional.
3. Disco artístico opcional.
4. Horizonte negro opaco y halo decorativo delimitado.
5. Anillos científicos, escala y ejes opcionales.
6. Trazas, cuerpos, fotones y flecha de preparación.
7. Observador y selección.
8. Etiquetas HTML/SVG, estado y leyenda.

Exportación compone estas capas en un canvas de salida y añade las leyendas; etiquetas HTML no aparecen mágicamente en toDataURL. No usar una captura parcial que pierde el contexto.

## Disco

Composición artística en esta vista: anillos/partículas cálidas de3–7 rs, gradiente radial y pequeña variación angular. El borde interno3 rs recuerda el ISCO de un disco ideal delgado, sin afirmar que se haya simulado acreción. Rotación decorativa configurable por calidad, sin unidades orbitales. No añadir un arco tipo Interstellar sobre el horizonte en la vista a escala: sería una proyección óptica distinta y confundiría geometría.

Si más adelante hay vista cinematográfica, debe ser una vista separada con etiqueta y sin overlays de radio que parezcan calibrados. No forma parte de 1.0.

## Malla ilustrativa

Una cuadrícula deformada sirve de analogía, no define la posición del observador, trayectorias ni radios. Usar una transformación radial visual suave/acotada o líneas pseudo-3D que sugieran profundidad, con label “Malla ilustrativa: no representa literalmente el espacio-tiempo”. No llamarla solución de las ecuaciones de Einstein.

Opcional posterior: diagrama de embebimiento de sección espacial ecuatorial Schwarzschild z/rs=±2sqrt(x−1), x≥1. Es geometría de una sección espacial, no toda la gravedad ni todo el espacio-tiempo. No mezclar esa altura con radio areal en controles. No se exige para 1.0.

## Canvas y labels

DPR efectivo min(devicePixelRatio,2), permitir cap menor en calidad baja. Canvas CSS ocupa contenedor y bitmap redimensiona sin crear otro RAF. Tras resize restablecer transform/estilos del contexto y redibujar. Evitar aplicar scale repetidamente sin resetTransform.

Renderizar trails con buffers acotados, batching y path por modelo. Cache de background y geometría estática invalidado por tamaño/zoom/capas. Gradientes y sprites de glow precalculados cuando ayuden; evitar shadowBlur alto en cada partícula. No asignar miles de objetos por frame. Etiquetas de posición actualizadas por transforms, con throttling donde no afecte la interacción.

## Calidad

| Nivel | Estrellas | Disco | Malla | DPR | Trazas |
| --- | --- | --- | --- | --- | --- |
| low | 40 estáticas | estático simple | densidad baja | ≤1.5 | máximo 1024 puntos/cuerpo |
| balanced | 100 estáticas | moderado | media | ≤2 | máximo 2048 |
| high | 180 estáticas | más partículas visuales | media | ≤2 | máximo 4096 |

Estos números son presupuesto inicial. Calidad visual no cambia ecuaciones, cutoff, constantes ni presets. Si se cambia precisión numérica, ofrecer un control separado explícito. Bajada automática de calidad solo con aviso discreto y sin tocar física.

## Objetivos medibles

Con viewport 1440×900, balanced y un experimento estándar, buscar60 fps en escritorio moderno. Con móvil 360×800, low, buscar30 fps. Declarar dispositivo/navegador, número de cuerpos, DPR y duración de prueba≥30s. Son objetivos, no garantía universal. Long tasks repetidas>50 ms durante drag o precompute indican trabajo que debe fragmentarse.

Memoria se estabiliza con límites de partículas/trails; probar5 min, varios resets y remounts. Pausado permite render por invalidación sin RAF continuo, salvo si se decidió una decoración explícita; movimiento reducido nunca necesita loop decorativo. No benchmarks artificiales en CI con umbrales absolutos de fps.

Fallback Canvas inexistente: mantener números, fórmulas, controles y tabla de resultado. Error de export no rompe transporte. No cargar texturas externas que ensucien Canvas/CORS y hagan fallar PNG.
