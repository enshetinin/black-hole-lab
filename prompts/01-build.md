 -# Prompt inicial — pegar en Claude Code

Construye Black Hole Lab desde cero en este repositorio. Ya tienes la especificación completa; quiero que la implementes y la verifiques, no que te limites a describir cómo la harías.

Primero lee CLAUDE.md, README.md, TASKS.md y docs/PROGRESS.md. Después lee los documentos necesarios, especialmente producto, diseño, interacciones, física, integración, arquitectura, contratos, testing y aceptación. Inspecciona los archivos existentes y respétalos.

Quiero una experiencia científica espectacular y usable: una escena oscura cuidada con disco cálido y referencias geométricas claras, observador arrastrable, relojes comparativos, magnitudes en vivo, órbitas Newton/Schwarzschild y fotones con captura y dispersión. El rigor debe verse en la interfaz: diferenciar tiempos, modelos y dibujos ilustrativos.

Usa Svelte 5, SvelteKit estable compatible, TypeScript estricto, Canvas 2D, SVG y CSS. Sin backend. Verifica las APIs actuales de las dependencias cuando inicialices y guarda las versiones resueltas. No copies configuraciones antiguas sin comprobarlas.

Este repositorio inicialmente contiene documentación: genera SvelteKit en una carpeta temporal y combina los archivos de la aplicación sin sobrescribir el kit. El README raíz puede evolucionar a README del producto, conservando una sección que enlace el encargo y los prompts.

Trabaja por F0–F8 de TASKS.md. Prioriza un primer corte funcional de relojes y luego continúa con todas las funciones P1 de 1.0. Cada fase debe incluir implementación, pruebas pertinentes y registro del estado. Prefiero pasos terminados a decenas de archivos a medio hacer.

Resuelve tú las decisiones rutinarias con la especificación. No pares a pedirme aprobación de cada fase. Si una tarea opcional retrasa el núcleo, déjala fuera y sigue. Si una prueba falla, investiga y corrígela antes de avanzar. Si hay un bloqueo externo, indica qué falta, qué comprobaste y qué puede seguirse haciendo.

No cambies fórmulas para mejorar el aspecto de una animación. No uses física de Newton para un modo llamado Schwarzschild. Los fotones no tienen tiempo propio. La malla y el disco se identifican como ilustraciones, y el horizonte no se confunde con la sombra.

No hagas deploy ni push; deja una aplicación local y un build estático listos para revisión. No incluyas herramientas de desarrollo en la interfaz del usuario final.

Empieza con un plan breve y ejecuta F0 inmediatamente. Continúa hasta cumplir 
docs/13-acceptance.md para 1.0. En la entrega final explica qué funciona, cómo 
arrancarlo, qué pruebas ejecutaste y cualquier limitación real. 
No declares completada una función sin comportamiento y evidencia.
