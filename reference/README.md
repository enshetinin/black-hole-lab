# Referencias numéricas independientes

`golden-values.json` contiene constantes, radios, relojes, órbitas circulares y endpoints de trayectorias calculados para este encargo. El script usa solo la biblioteca estándar de Python 3.10+; no será una dependencia de la aplicación Svelte.

## Reproducir

Desde la raíz del kit:

```bash
python3 reference/generate_reference.py --check
python3 reference/generate_reference.py --write
```

El primer comando calcula referencias y ejecuta comprobaciones. El segundo regenera JSON; ambos pueden combinarse con `--check --write`. No editar el JSON a mano para que pase un test. Si cambian constantes, convenciones o presets, actualizar script, documentos y pruebas.

## Qué valida

Dominios exteriores, linealidad de rs, normalización de condiciones iniciales, fórmulas circulares, rapidez local nula, captura/dispersión de fotones a ambos lados del crítico, caída radial, escape radial, precesión positiva, diez vueltas circulares, convergencia con reducción de paso y conservación newtoniana con Verlet.

Las magnitudes analíticas pueden compararse con tolerancia estricta. Endpoints de trayectorias tienen integración RK4 fija y eventos finales refinados por bisección; los periastros se interpolan linealmente. Son referencias aproximadas. El solver adaptativo de la app no debería copiar esos pasos. Para endpoints usar las tolerancias incluidas y verificar convergencia de forma independiente. Las tolerancias del residual en docs/05 y11 siguen siendo obligatorias.

Las muestras tienen tiempos relativos a cada lanzamiento. El parámetro de una partícula masiva es tiempo propio adimensional; el del fotón es afín. La escala de energía fotónica es arbitraria y normalizada localmente a 1 al emitir.

## Límites

Esta referencia no implementa rendering, accesibilidad, UI, URL, performance ni el motor completo. No valida una aplicación que todavía no se ha construido. El escape masivo de ejemplo solo comprueba energía>1 y movimiento radial exterior. La precisión cerca del impacto crítico depende de perturbaciones y budget. No es un ray tracer óptico ni un sistema de certificación científica.

Consultar `validation-report.json` para el resultado concreto ejecutado durante la preparación del kit. Ese archivo no es resultado de tests de la app.
