# 02 · Dirección visual

## Carácter

Un observatorio contemporáneo: oscuro, silencioso, profundo, con un disco ámbar y acentos fríos para información. La escena ocupa más espacio que las tarjetas. Calidad de portfolio por composición, tipografía, interacción y coherencia, no por acumular efectos.

No usar neón morado omnipresente, lluvia de estrellas, textos futuristas ilegibles o un tablero lleno de cajas idénticas. Una jerarquía clara: agujero negro → observador y trayectoria → relojes → controles → contexto.

## Composición exacta

Desktop ≥1100 px: contenedor máximo 1520 px, margen 32 px; cabecera 64 px; workspace con escena flexible y panel de 320–360 px; gap 20 px. Escena mínima aproximada 640×480 CSS px, ajustada al viewport. Métricas bajo la escena; explicación en un panel expandible. La página puede hacer scroll vertical; no encajar todo a costa de ilegibilidad.

Tablet 720–1099 px: escena arriba, controles en dos columnas debajo si caben. Móvil <720 px: margen 16 px, escena de ratio cercano a 1:1 y altura de 320–420 px; controles una columna; métricas en dos columnas o filas cuando la etiqueta sea larga. Probar también 360×800 y landscape. No esconder controles esenciales detrás de swipe.

La cabecera contiene logotipo tipográfico “Black Hole Lab”, subtítulo pequeño “Un laboratorio de relatividad” y enlace “Modelo y fuentes”. La barra del experimento muestra tabs y estado “Pausado / En marcha”. El transporte es visible y separado de acciones de compartir y restaurar.

## Tokens iniciales

| Token | Valor | Uso |
| --- | --- | --- |
| `--bg` | `#080C12` | Fondo |
| `--surface` | `#101720` | Paneles |
| `--surface-raised` | `#172230` | Menús y controles |
| `--text` | `#EDF3FA` | Texto principal |
| `--muted` | `#ACBACB` | Texto secundario |
| `--line` | `#2B3B4D` | Separadores decorativos |
| `--control-line` | `#65758A` | Bordes de controles con contraste verificable |
| `--accent` | `#6CDAE8` | Observador y foco |
| `--warm` | `#FFB45C` | Disco y curva Schwarzschild |
| `--comparison` | `#AEBBFF` | Curva Newton, además discontinua |
| `--warning` | `#FFD17B` | Aviso |
| `--danger` | `#FF8892` | Error |

Estos valores son un punto de partida: medir contraste del par concreto, incluida opacidad, y ajustar sin cambiar el carácter. Texto normal ≥4.5:1; texto grande y componentes esenciales ≥3:1. No reutilizar separadores sutiles como único contorno de un input.

Espaciado 4, 8, 12, 16, 24, 32, 48 px. Radios 8 px controles, 14 px paneles, 18 px escena. Borde fino, sombras moderadas. Evitar blur costoso sobre toda la escena.

## Tipografía

Sans del sistema para UI. Monoespaciada del sistema solo en valores y símbolos que lo necesiten; números tabulares en relojes y métricas. H1 28–36 px, cuerpo 15–16 px, etiqueta mínima 12–13 px. No requerir Google Fonts ni carga remota para terminar la app. Iconos SVG sencillos; no meter emojis como sistema de iconografía.

## Métricas

Primarias en Relojes: `Radio de Schwarzschild`, `Radio del observador`, `Ritmo local`, `1 s local equivale a`. Unidades junto al valor. Fórmula y contexto desplegables. Mostrar `0,866×` con Intl.NumberFormat es-ES; internamente números sin formato. Precisión visible razonable: tres decimales para razones, 2–3 cifras relevantes para km; más precisión en panel científico opcional.

No mostrar “gravedad: 95%”, “curvatura: extrema” ni porcentajes sin definición física. No usar un único “tiempo” para varios conceptos.

## Escena

En la vista principal a escala, un círculo negro de radio rs, halo tenue decorativo, disco artístico y tres círculos de referencia claramente rotulados. Horizonte sólido; esfera de fotones punteada; ISCO discontinua. Si se activa el disco, los anillos científicos se renderizan encima y no se deforman para fingir lensing. Fondo con pocas estrellas estáticas, semilla fija.

El observador es un punto con aro y etiqueta, hit area ≥44 px y una línea radial tenue. Su etiqueta indica x y km. Partículas masivas con marcador; fotones con rayo/chevron. Newton discontinuo frío; Schwarzschild continuo cálido; leyenda textual. Las etiquetas flotantes evitan colisión con observador y controles.

## Movimiento

Transiciones UI 120–180 ms, sin animar valores físicos con tween: los números reflejan el cálculo actual. Glow y disco pueden animarse lentamente a calidad alta, pero son prescindibles. Movimiento reducido desactiva decoraciones y deja avanzar la física solo mediante acción explícita, con alternativa de paso manual. No flashes ni cambios estroboscópicos.

## Estados que deben diseñarse

Pausado, en marcha, lanzamiento preparado, captura, salida del área, límite de cálculo, error numérico, input inválido, URL inválida, almacenamiento no disponible, copiado correcto/fallido, exportación, modo reducido. Mensajes cerca de su causa, con acción clara. No modales para cada cambio de slider.

## Evidencia visual de entrega

Capturas reales: desktop Relojes, desktop Comparación, desktop Fotones cerca del crítico, móvil Relojes y móvil controles. Guardar dimensiones, preset y estado usado. Capturas deterministas con simulación pausada; no snapshots frágiles de una animación en curso. La revisión verifica alineación, texto recortado, escala, foco y lectura con capas apagadas.
