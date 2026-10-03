# 12 · Inicialización, CI y entrega

## F0 reproducible

Inspeccionar repo y estado git antes de crear archivos. Elegir Node LTS compatible con SvelteKit/Vite resueltos; fijar en `.nvmrc` y `engines`, y registrar versión completa en README. No hardcodear una versión vieja por hábito. Usar npm, guardar package-lock y no mezclar pnpm/yarn/bun.

La CLI oficial usa `npx sv create`. Como el kit ya llena la raíz, generar en `.bootstrap-svelte` con template minimal y TypeScript, revisar `--help` para confirmar flags vigentes, e integrar archivos uno por uno sin sobrescribir README/CLAUDE/docs/.gitignore. Ejemplo orientativo verificado en documentación de la CLI:

```bash
npx sv create .bootstrap-svelte --template minimal --types ts --no-add-ons --install npm
```

Los addons de lint, formato, Vitest y Playwright pueden instalarse por CLI oficial o manualmente según documentación actual. Ajustar configuración al framework resuelto. No añadir tipos/API de SvelteKit de una major distinta al scaffold generado. Limpiar la carpeta temporal al finalizar y combinar reglas de .gitignore.

Generar configuración real de adapter-static con prerender en layout, SSR del shell habilitado y rutas estáticas. `/about` debe poder recargarse directamente con el hosting local seleccionado. Confirmar base path si se planea alojamiento bajo subdirectorio; default raíz. No convertir toda la app a ssr=false para evitar arreglar imports de window.

## Scripts exigidos

| Script | Semántica |
| --- | --- |
| `dev` | Vite dev server |
| `build` | Compilación de producción y salida estática real |
| `preview` | Preview de build con puerto documentado |
| `check` | Sincronizar tipos de Kit y svelte-check/TypeScript |
| `lint` | ESLint + comprobación de formato sin modificar archivos |
| `format` | Formatear archivos soportados |
| `test:unit` | Vitest en modo run, no watch |
| `test:e2e` | Playwright contra dev o preview con webServer configurado |
| `test` | Alias no interactivo de test:unit |
| `verify` | check, lint, test:unit y build, falla al primer error |

`verify` no incluye E2E para no ocultar la necesidad de navegador; CI ejecuta E2E además. Comandos posteriores se ejecutan realmente desde raíz. Evitar `--passWithNoTests` para declarar victoria con directorio vacío. No ignorar warnings de Svelte sobre accesibilidad globalmente.

## CI

Claude crea `.github/workflows/ci.yml` cuando existen package.json, lockfile y config. No se incluye workflow activo en este kit porque fallaría antes de inicializar la app.

Pipeline: checkout → setup Node versión de .nvmrc → npm ci → npm run verify → instalar Chromium de Playwright con dependencias cuando el runner lo permita → npm run test:e2e → subir reportes/traces solo en fallo, build como artifact opcional. Tests sin secretos y sin conexión externa en runtime. Cancelar runs obsoletos con concurrency. Permisos mínimos contents:read. Verificar versiones actuales de actions con sus repos oficiales, fijar releases estables o SHA según política del repo; no inventar hashes.

En desarrollo local, si no hay navegador instalado, instalarlo con el mecanismo estándar permitido o registrar limitación. No afirmar E2E ejecutado a partir de unit tests. No intentar eludir las restricciones de entorno.

## Build estático

Comprobar que salida sirve sin backend y que scripts/assets no requieren secretos, funciones server-only o red. Revisar recarga de rutas, favicon, meta title/description, viewport y lang es. Compartir escenarios por fragmento no necesita API. Assets locales; no render remoto de fórmulas ni fuentes externas imprescindibles.

No desplegar como parte de este encargo. Dejar instrucciones neutrales para servir la carpeta build y elegir un host estático posteriormente. Si el usuario pide deploy en otra sesión, revisar base path y requisitos del host antes de publicar.

## README del producto terminado

Explicar resultado y cómo arrancar con versión Node, `npm ci`, `npm run dev`; validar con verify/E2E y servir build. Incluir controles, presets, arquitectura mínima, unidades, modelos, límites, fuentes y política local de escenarios. Conservar enlaces a los documentos del kit y prompts. Nada de lista de features futuras presentada como implementada.

## Entrega final de Claude

- Funciones realmente implementadas y requisitos pendientes, si los hay.
- Comandos ejecutados, resultados y limitaciones del ambiente.
- Capturas reales/revisión visual cuando disponible.
- Valores y escenarios de referencia comprobados.
- Rendimiento con contexto, no promesas generales.
- Límites científicos y decisiones modificadas documentadas.
- Estado de TASKS/PROGRESS consistente con código.

Una app compilada que carece de fotones o cuyo modo Schwarzschild es una fuerza decorativa no cumple1.0. Un bloqueo externo puede impedir evidencia de una prueba, pero no autoriza a marcarla pasada.

## Licencia y assets

El kit no decide la licencia jurídica del proyecto. Antes de publicación el propietario elige la licencia; no copiar una licencia con autor inventado. Assets creados con CSS/SVG/Canvas propios y fuentes del sistema eliminan dependencias de stock. Si se añade cualquier asset ajeno, incluir procedencia y licencia. No copiar texto extenso de las referencias.
