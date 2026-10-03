# 04 · Modelo físico normativo

## Hipótesis

Agujero negro aislado de Schwarzschild, no giratorio y sin carga; exterior de vacío, partículas de prueba sin retroacción. Trayectorias en un plano ecuatorial, posible por simetría esférica. No calcular materia del disco, fuerzas de presión, emisión, gravitación mutua ni interior. La masa es constante durante cada ejecución. Cambiarla inicia un experimento nuevo, no simula crecimiento del agujero negro.

Las ecuaciones siguientes son una formulación propia para este proyecto en unidades rs, derivada de la métrica y del potencial radial estándar. Ver fuentes primarias en docs/15. Los dibujos decorativos no se usan para inferir métricas.

## Constantes y unidades

G = 6.67430e−11 m³ kg⁻¹ s⁻²; c = 299792458 m/s; M☉ = 1.98847e30 kg como convención numérica del proyecto. Esta masa solar es un valor convencional de referencia, no una constante exacta. Mantener los mismos valores en código y fixtures.

rs = 2GM/c²; tg = rs/c; x = r/rs; T = ct/rs; S = cτ/rs; f(x) = 1−1/x. Radio areal: una esfera de ese radio tiene área 4πr². No es la distancia propia radial medida por una cadena de reglas. Altura sobre horizonte = r−rs; mostrarla solo si se etiqueta aparte.

Cada función pública explicita si recibe m, km, M☉, rs o cantidades adimensionales. Evitar G=1 en un módulo y rs=1 en otro sin conversión. Este kit usa rs=1 en el motor adimensional: GM/c²=1/2.

## Métrica y tiempo estático

En el plano ecuatorial:

ds²/rs² = −f dT² + dx²/f + x² dφ².

Para un reloj inmóvil respecto a estas coordenadas, x>1:

dτ/dt = sqrt(f) = q; dt/dτ = 1/q.

Comparación con un reloj ideal en infinito. Dos relojes estáticos a radios finitos a,b tienen razón sqrt(f(a)/f(b)); no aplicar automáticamente q a un segundo observador finito. Un reloj orbitante o en caída incluye movimiento y no usa solo sqrt(f).

En la UI principal, los relojes acumulan una escala didáctica de 1 s de referencia por segundo real a velocidad 1×, y local += q*dtDidactic. Esa escala está separada de la animación orbital. Se mide con dt monotónico validado, se pausa con la pestaña oculta y se integra q variable sin saltos. Mover el marcador representa recolocar cuasiestáticamente un reloj ideal; se omite el tiempo y la aceleración del traslado. No prometer una worldline física de viaje.

Un observador estático necesita aceleración propia a = GM/(r² sqrt(f)), que diverge al aproximarse al horizonte. La UI no permite x≤1. La fórmula no afirma que el reloj de una persona cayendo se detenga en su propia experiencia. No hay observador estático dentro del horizonte.

Para una órbita circular geodésica masiva, dτ/dt = sqrt(1−3/(2x)), con x>1.5. Es otro reloj, distinto del estático. En el modo orbital, obtener tiempo propio integrando S y T, no el q del marcador.

## Radios importantes

Horizonte x=1. Esfera de fotones x=1.5: órbita circular nula inestable. ISCO x=3: órbita circular masiva marginalmente estable; las órbitas circulares masivas son estables para x>3 e inestables para 1.5<x<3. No existen órbitas circulares geodésicas masivas para x≤1.5. Dentro de 3 puede haber movimiento no circular; ISCO no es una pared ni un segundo horizonte.

Impacto crítico de rayos que llegan desde infinito: Bcrit=bcrit/rs=3sqrt(3)/2≈2.598076211. No confundirlo con radio de la esfera de fotones ni con rs. Una sombra observada depende de geometría óptica y observador; su tamaño angular no se representa con el círculo rs de la vista de laboratorio.

## Geodésicas: constantes y ecuaciones

κ=1 para partícula masiva y κ=0 para fotón. Para masivas, λ=S (tiempo propio adimensional). Para fotones, λ es un parámetro afín adimensional normalizado por la energía local inicial; no es tiempo propio. Usar una denominación distinta en tipos/UI.

E = f dT/dλ; ℓ = x² dφ/dλ; v = dx/dλ.

Normalización:

v² + f(κ + ℓ²/x²) = E².

Sistema de primer orden sin elegir raíz en puntos de retorno:

dx/dλ = v

dv/dλ = −κ/(2x²) + ℓ²/x³ − 3ℓ²/(2x⁴)

dφ/dλ = ℓ/x²

dT/dλ = E/f

Derivación para el término radial: definir V=f(κ+ℓ²/x²), diferenciar v²+V=E² y obtener dv/dλ=−V′/2. La extensión continua al punto v=0 permite atravesar periastro/apastro sin cambiar un signo manualmente. E y ℓ permanecen constantes por trayectoria. No recomputarlos por frame para ocultar deriva.

También se puede integrar directamente en T con dx/dT=f v/E, dv/dT=(f/E)*aceleración radial, dφ/dT=f ℓ/(E x²), dλ/dT=f/E. Ambas formulaciones deben producir las mismas curvas. Elegir una sola principal, documentar y probar su convergencia. Para partículas masivas, τ = λ*tg. Para fotones, no convertir λ*tg en un reloj propio.

No integrar hasta x=1 con coordenadas Schwarzschild. Finalizar en xStop=1.01 y declarar “Capturada · cálculo detenido cerca del horizonte”. Este cutoff numérico no redefine el horizonte. T crece mucho cerca de x=1; no mostrar cruce exacto en tiempo coordenado finito.

## Condiciones iniciales masivas

Radio x0>1, velocidad medida por observador estático local β<1, ángulo α desde la radial exterior hacia la dirección azimutal positiva. βr=β cosα; βφ=β sinα; γ=1/sqrt(1−β²).

E=γ sqrt(f0); ℓ=γ x0 βφ; v0=γ sqrt(f0) βr; φ0 elegido; T0 y edad de trayectoria según lanzamiento. Estas expresiones cumplen la normalización. Velocidad local posterior: βr=v/E y βφ=ℓ sqrt(f)/(xE), por lo que β²=1−κ f/E². No confundir v=dx/dλ con velocidad local/c.

Órbita circular masiva:

βcirc=1/sqrt(2(x−1)); ℓcirc=±x/sqrt(2x−3); Ecirc=(1−1/x)/sqrt(1−3/(2x)); v0=0.

ΩT=dφ/dT=±1/sqrt(2x³); período coordenado P_T=2πsqrt(2x³); P_seconds=P_T*tg. Dominio x>1.5. A x=3, Ecirc=sqrt(8/9) y |ℓ|=sqrt(3).

El período puede ser subsegundo para masas estelares: ralentizar la visualización de forma explícita. Mostrar escala de tiempo. No manipular c o masa para conseguir una animación lenta.

## Newton y comparación

Motor Newton en coordenadas cartesianas adimensionales X,Y y tiempo T:

X″=−X/(2R³); Y″=−Y/(2R³); R=sqrt(X²+Y²).

E_N=0.5(VX²+VY²)−1/(2R); L_N=X VY−Y VX. Integración velocity Verlet con subpasos. La captura por R≤xStop es una frontera impuesta para compararla con el agujero negro; Newton por sí mismo no tiene horizonte. Etiqueta del modo y ayuda deben decirlo.

El motor Newton recibe velocidades coordenadas V/c. Circular: Vcirc=1/sqrt(2x). La UI conserva un input de velocidad de referencia local β en todos los modos y lo convierte a velocidad coordenada antes de inicializar Newton; se muestran ambos valores. Esto también define la comparación:

dr/dT=f0 βr; x0 dφ/dT=sqrt(f0) βφ.

Transformar radial y tangencial a VX,VY usando φ0. Así los dos modelos parten del mismo evento, dirección y derivadas espaciales respecto a T; no afirmar que Newton tiene la misma tetrada local. Mostrar la velocidad local relativista y la velocidad coordenada convertida con sus nombres, sin tratar valores distintos como velocidades medidas por el mismo observador.

Ambas curvas se animan a la misma T, nunca al mismo tiempo propio de la partícula. Para una comparación de precesión usar x0=6, β=0.30, α=π/2, mismo evento coordenado. En una órbita circular exacta, sqrt(f)*βcirc=1/sqrt(2x): la velocidad tangencial coordenada coincide con la circular newtoniana y ambas curvas espaciales pueden coincidir. Esto no es un bug: Schwarzschild añade diferencias de tiempo propio y estabilidad. No forzar separación visual artificial en el preset circular; usar el preset no circular para mostrar precesión.

En campo débil y velocidades bajas deben converger de forma aproximada; no esperar identidad cerca del horizonte. Newton admite velocidades arbitrarias matemáticamente; el producto limita entradas para una comparación pedagógica.

## Fotones

Energía local inicial elegida =1 en unidades arbitrarias. E=sqrt(f0), ℓ=x0 sinα, v0=sqrt(f0) cosα y κ=0. La rapidez local es c; la rapidez coordenada depende de f y dirección. Un fotón tiene intervalo propio nulo: no tiene un reloj rest-frame.

B=ℓ/E = x0 sinα/sqrt(f0). Para rayo inicial entrante: sinα=B sqrt(f0)/x0, α=π−asin(B sqrt(f0)/x0), con cosα<0 y |B|≤x0/sqrt(f0). Esta parametrización admite B negativo. No interpretar B como desplazamiento cartesiano exacto de un emisor a radio finito.

Con emisor x0>1.5 y dirección entrante, |B|<Bcrit atraviesa la barrera efectiva y cae; |B|>Bcrit encuentra un retorno exterior y se dispersa, si el emisor está en la región radial exterior permitida. Para el rango x0≥6 y B∈[0,5] de la UI esos presets están permitidos. El caso exacto crítico es asintótico e inestable; el cálculo finito cercano puede terminar por presupuesto. Un rayo radial inicialmente saliente puede escapar incluso desde dentro de 1.5: no aplicar el criterio entrante a toda condición inicial.

La pequeña deflexión asintótica en campo débil satisface δ≈2/B rad cuando B≫1. Para probarla hay que usar emisor y detector lejanos y corregir el ángulo finito; no comparar la tangente final a x0=12 sin esa corrección. 1.0 no necesita ofrecer este test en UI.

## Escala de masa y cámara

A x y condiciones adimensionales constantes, cambiar masa cambia km y tg, no la forma adimensional ni el ritmo estático q. La vista inicial autoencuadrada en rs puede mantener el mismo tamaño en píxeles: indicarlo en la escala. Una vista “km fijos” puede mostrar crecimiento aparente, pero no es obligatoria. Zoom es cámara, nunca masa física.

## Invariantes y límites

Monitorizar residual C=v²+f(κ+ℓ²/x²)−E². Normalizar por max(1,E²), registrar máximo absoluto y tolerancia. El solver debe conservar ℓ,E por construcción y C por precisión; no llamar “energía conservada” solo porque E está almacenada y nunca cambia.

Estado inválido devuelve error de dominio. No usar sqrt(max(0,f)) para aceptar radios interiores. Clamp solo en interacción o en redondeo de asin dentro de una tolerancia explícita (~1e−12); entradas físicamente fuera de dominio se rechazan. La geometría equatorial a escala muestra coordenadas, no fotografía ni medición de distancias propias.
