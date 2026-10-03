# 10 · Texto del producto y educación

## Registro

Español claro, curioso, sin prometer magia ni inducir errores. Pocas palabras junto al control; explicación ampliable para fórmulas. El usuario no necesita leer un tratado para jugar. Separar magnitud, interpretación y limitación.

## Textos propuestos

| Lugar | Texto |
| --- | --- |
| Subtítulo | Acércate al horizonte. Mira cómo cambia el tiempo. |
| Relojes | Compara un reloj sostenido cerca del agujero negro con uno muy lejano. |
| Observador | Radio desde el centro |
| Lock rs | Mantener distancia en rs al cambiar masa |
| Lock km | Mantener distancia en km al cambiar masa |
| Reloj lejano | Reloj de referencia · muy lejos |
| Reloj local | Reloj local · observador estático |
| Razón | Aquí transcurren {q} s por cada 1 s de referencia. |
| Inversa | 1 s local equivale a {1/q} s de referencia. |
| Escala relojes | Relojes didácticos: 1 s de referencia por segundo de reproducción, a ×1. |
| Observer moving | Comparamos ritmos de relojes recolocados lentamente; el traslado no se simula. |
| Near horizon | Mantenerse estático tan cerca exigiría una aceleración enorme. |
| Malla | Malla ilustrativa; no representa literalmente el espacio-tiempo. |
| Disco | Disco artístico; no se calcula la física del gas ni su emisión. |
| Captura | Capturada. El cálculo se detiene justo fuera del horizonte. |
| Fuera | Fuera del área de simulación. |
| Error solver | No se pudo mantener la precisión. Reinicia o ajusta las condiciones. |
| Budget | Se alcanzó el límite de cálculo. La trayectoria mostrada es parcial. |
| Photon critical | Cerca del impacto crítico, pequeñas diferencias cambian mucho la trayectoria. |
| Photon time | Los fotones no tienen un reloj propio. La animación usa tiempo coordenado. |
| Newton | Modelo clásico con frontera de captura impuesta; no incluye un horizonte relativista. |
| Schwarzschild | Geodésicas de un agujero negro sin rotación ni carga. |
| Auto frame | Vista en unidades rs: aumentar la masa cambia km, no el tamaño relativo de la escena. |
| Hidden pause | Pausado al cambiar de pestaña. Puedes continuar cuando quieras. |

Mostrar valores con Intl.NumberFormat('es-ES'), texto no ambiguo y unidades fuera de aria-label duplicados. Relojes como duración acumulada `00:12.34`, no una hora civil inventada. Minutos/segundos se forman con precisión consistente; export científico puede incluir segundos exactos.

## Conceptos ampliables

**Horizonte de sucesos.** Frontera causal de este modelo. Desde dentro no puede salir una señal al exterior. La app representa su radio geométrico; no simula el interior.

**Radio de Schwarzschild.** Escala determinada por la masa, rs=2GM/c². Una masa solar con nuestras constantes tiene aproximadamente2.95 km. No es otro parámetro ajustable además de masa.

**Dilatación gravitatoria.** Un reloj estático en r avanza respecto a uno ideal muy lejano a razón sqrt(1−rs/r). Esto compara relojes; cada reloj mide normalmente su propio tiempo. Sostenerse cerca del horizonte necesita aceleración.

**Esfera de fotones.** Radio de una órbita circular de luz inestable en el modelo no giratorio. No es una capa de fotones pegados eternamente ni una pared que todo rayo deba seguir.

**ISCO.** Límite de estabilidad de órbitas circulares de partículas con masa. En3 rs la estabilidad es marginal. Entre1.5 rs y3 rs hay órbitas circulares inestables. No describe todas las trayectorias posibles.

**Precesión.** La dirección del periastro puede cambiar entre vueltas. La comparación usa modelos y condiciones iniciales especificados; su diferencia no es un efecto decorativo.

**Parámetro de impacto.** b=Lc/E en unidades físicas equivalentes para luz; en el motor B=ℓ/E. Caracteriza una trayectoria, y se relaciona con la separación perpendicular de un rayo asintótico. Para un emisor finito se obtiene del ángulo local, no de un offset de pantalla.

**Tiempo coordenado y propio.** T etiqueta eventos desde la coordenada temporal Schwarzschild; τ mide el reloj de una partícula masiva. El parámetro afín de un fotón es una herramienta de cálculo. No mezclar sus unidades o interpretaciones.

## Tutorial de 4 pasos

1. “Mueve el observador”: destacar slider o marcador, sin bloquear la interfaz.
2. “Compara los relojes”: cambiar x y observar q; mostrar advertencia de reloj estático.
3. “Activa las referencias”: horizonte, esfera fotones, ISCO con trazos distintos.
4. “Prueba una trayectoria”: elegir preset de órbita/fotón y empezar.

Omitible, reiniciable desde Ayuda, sin retener foco ni esconder controles. Si hay spotlight/modal, implementarlo con foco y Escape; una lista inline es suficiente y más robusta. No onboarding obligatorio en cada visita. Guardar tutorial completado separado del escenario si se necesita.

## Panel científico

Mostrar fórmulas de rs y q en Relojes; E,ℓ, rapidez local, radio y tiempo propio en masivas; B, E relativo, estado, T y ausencia de tiempo propio en fotones. Diagnóstico avanzado opcional: residual, pasos, tolerancia y cutoff. No saturar la interfaz normal con números del solver. Fórmulas con HTML/SVG accesible o render matemático ligero; no añadir KaTeX solo si basta una presentación legible con texto alternativo.

La página Modelo y fuentes identifica todas las aproximaciones y enumera fuentes primarias. No decir que la simulación está certificada o revisada por físicos si no ocurrió.
