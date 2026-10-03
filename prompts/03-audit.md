# Prompt de revisión final

Audita Black Hole Lab contra docs/13-acceptance.md y la especificación. Lee primero CLAUDE.md, física, integración, contratos y testing. Inspecciona código y ejecuta la app: no te limites a revisar capturas o nombres de archivos.

Comprueba especialmente:

1. Dominios del reloj estático y diferencias entre reloj estático, orbital y fotón.
2. Horizonte, esfera de fotones, ISCO y ausencia de confusión con sombra.
3. Ecuaciones exactas del modo Schwarzschild, conservación y convergencia.
4. Un único bucle, pause/reset, cambio de pestaña, resize y desmontaje.
5. Contratos de tiempo: reloj visual educativo, coordenada temporal, tiempo propio y parámetro afín.
6. Controles y drag accesibles, móvil, zoom y lectura sin Canvas.
7. Validación de escenarios URL/localStorage/JSON y ausencia de datos externos innecesarios.
8. Todos los botones, presets, exportaciones y estados de error funcionan.
9. Build estático limpio, CI y scripts reproducibles.
10. Diferencias entre documentación, resultados observados y funciones prometidas.

Clasifica defectos como bloqueante, alto, medio o bajo. Para cada hallazgo incluye archivo, reproducción, comportamiento esperado e impacto. Corrige los defectos dentro del alcance, añade regresiones útiles y vuelve a ejecutar las comprobaciones. No declares aprobada 1.0 si quedan bloqueantes o altos; no reduzcas los criterios para ocultar fallos.

Entrega resultados comprobados, capturas si el entorno permite generarlas, comandos ejecutados y límites reales. No inventes resultados de rendimiento ni revisión física externa.
