# 15 · Fuentes y verificación

Consulta realizada2026-10-03. Las APIs pueden cambiar: Claude debe volver a verificar lo que dependa de versiones al inicializar. No copiar una configuración de un tutorial viejo. Fórmulas y derivaciones del kit son la convención implementable del proyecto; las fuentes ayudan a comprobar fundamentos, no prescriben su diseño de producto.

## Fuentes primarias consultadas

1. [University of Maryland, Ted Jacobson, Physics675: notas de relatividad](https://physics.umd.edu/grt/taj/675c/675cnotes.html). Entradas de septiembre y octubre: potencial radial, Killing energy, tiempo/energía local, geodésicas nulas, ISCO y órbitas circulares. Atención: sus unidades M geométricas se convierten a rs=2M en este proyecto. Fuente principal de contraste de radios y estructura del problema orbital.
2. [Einstein Online, Max Planck Institute for Gravitational Physics: time dilation](https://www.einstein-online.info/en/explandict/time-dilation/). Contexto pedagógico de dilatación gravitatoria y comparación de relojes.
3. [Einstein Online: Changing places](https://www.einstein-online.info/en/spotlight/changing_places/). Interpretación causal y límites de coordenadas del modelo Schwarzschild. No usar este artículo para afirmar que la malla de una app representa 4D literalmente.
4. [Sean Carroll: Lecture Notes on General Relativity, arXiv gr-qc/9712019](https://arxiv.org/abs/gr-qc/9712019). Se verificó la existencia y metadata del trabajo, no se extrajeron todas sus derivaciones; lectura complementaria para revisar métrica y geodésicas con detalle.
5. [Svelte CLI: sv create](https://svelte.dev/docs/cli/sv-create). Generación actual con template minimal y TypeScript.
6. [Svelte: $state](https://svelte.dev/docs/svelte/$state). Estado reactivo de UI.
7. [Svelte: $derived](https://svelte.dev/docs/svelte/$derived). Magnitudes derivadas sin effects innecesarios.
8. [Svelte: lifecycle hooks](https://svelte.dev/docs/svelte/lifecycle-hooks). Montaje y cleanup; uso seguro de recursos de navegador.
9. [SvelteKit: static site generation](https://svelte.dev/docs/kit/adapter-static). Adaptador estático y prerender.
10. [SvelteKit: page options](https://svelte.dev/docs/kit/page-options). SSR/prerender y configuración por ruta.
11. [Claude Code: memory y CLAUDE.md](https://code.claude.com/docs/en/memory). Instrucciones persistentes breves en raíz y lectura por contexto. Se utiliza CLAUDE.md para no depender de compatibilidad de otros nombres.

No se incorporó como evidencia una URL que devolvió error al consultar. No atribuir al kit una revisión científica externa. Los tests de referencia verifican consistencia y convergencia de esta formulación, no todas las propiedades de un agujero negro real.

## Documentación a consultar al implementar

Estas son rutas oficiales de partida; verificar contenido y versiones en F0/Fase correspondiente:

- [Vitest](https://vitest.dev/guide/): configuración y modo run.
- [Playwright](https://playwright.dev/docs/intro): instalación, webServer, locators y trazas.
- [MDN Canvas](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API): bitmap, context, export y CORS.
- [MDN Page Visibility](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API): suspensión al ocultar.
- [WAI-ARIA APG Tabs](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/): interacción de tabs por teclado.
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/): contraste, teclado y objetivos de interacción.
- [GitHub Actions setup-node](https://github.com/actions/setup-node): compatibilidad y configuración actuales.

## Cómo revisar las ecuaciones

Primero fijar unidades y la firma de la métrica. Luego derivar E,ℓ y la normalización. Convertir r/M a x=r/rs antes de comparar coeficientes: r=3M equivale a 1.5 rs, r=6M a 3 rs. Verificar condiciones locales con tetrada estática. Diferenciar el potencial radial para obtener aceleración, probar órbitas circulares e invariantes. Solo después comparar curvas y tiempos.

Si una fuente usa energía específica masiva y otra energía fotónica, no mezclar su normalización. Las trayectorias nulas admiten reescalado afín: la forma de la curva depende de B=ℓ/E, no de su energía arbitraria inicial.
