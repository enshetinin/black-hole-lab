# 09 · Presets, compartir y exportar

## Catálogo inicial

Todos usan masa10, speed1, pausados y calidad balanced. Cada preset es un objeto validado de ScenarioV1, no un bloque de setters. Mostrar descripción y resultado esperado sin garantizar exactitud más allá de la tolerancia.

| ID | Experimento | Parámetros principales | Qué enseña |
| --- | --- | --- | --- |
| clocks-far | Relojes | x=20 | Lejos, el ritmo se aproxima al de referencia |
| clocks-default | Relojes | x=4 | q≈0.866 y diferencia visible |
| clocks-close | Relojes | x=1.1 | q≈0.3015, sostenerse requiere aceleración |
| orbit-circular | Órbitas Schwarzschild | x=6, β=sqrt(0.1), α=π/2 | Circular estable |
| orbit-precession | Comparar | x=6, β=0.30, α=π/2, mismo estado coordenado | Periastro cambia de dirección |
| orbit-infall | Schwarzschild | x=6, β=0, α=0 | Soltar desde reposo local |
| orbit-escape | Schwarzschild | x=6, β=0.7, α=0 | Movimiento radial exterior, E>1 |
| photon-captured | Fotones | x0=12, B=2.4, φ0=π | Captura por debajo del crítico |
| photon-scattered | Fotones | x0=12, B=3.0, φ0=π | Desviación y retorno exterior |
| photon-near-critical | Fotones | x0=12, B=Bcrit*(1+1e−4) | Mucho giro cerca de la órbita inestable |

El preset precession debe confirmarse con cálculo y mostrarse durante suficientes períodos para apreciar el efecto; si un ajuste mejora su claridad sin cambiar intención, documentar parámetros y regenerar fixtures. No cambiarlo por una espiral pintada. Caso opcional avanzado ISCO x3 y circular inestable x2, con advertencias correctas.

## URL

Usar fragmento `#scenario=...` para datos de escenario; no necesita backend ni rewrite de query. Codec compacto determinista: JSON validado → UTF-8 → base64url o campos abreviados. No usar btoa sobre caracteres Unicode sin codificar bytes. Máximo fragmento aceptado12000 caracteres; objetivo enlaces habituales<4000. Rechazar demasiado grande antes de parsear.

SchemaVersion incluido. Exportar solo configuración persistible, con precisión suficiente para mantener preset crítico y valores físicos. Nunca redondear B a dos decimales en URL. Determinismo por orden de campos. Copiar enlace se ejecuta por gesto de usuario y usa Clipboard API si disponible; fallback seleccionable de texto, sin afirmar éxito falso.

Prioridad de carga: URL válida > último escenario local válido > defaults. URL presente inválida: mostrar error y usar defaults, sin contaminar silenciosamente con un escenario antiguo. Quitar/corregir URL mediante acción explícita; no reescribir historial cada frame. Import/restauración siempre en pausa con relojes y trayectorias reiniciados.

## localStorage

Clave `black-hole-lab:scenario:v1`. Guardar configuración con debounce~300 ms tras cambios válidos; ninguna escritura por frame. No guardar estado de transporte running. try/catch para quota, modo privado o acceso bloqueado. La app sigue funcionando sin almacenamiento. “Valores iniciales” restablece controles y elimina esa clave; permite después guardar defaults si hay nuevos cambios.

No registrar clicks, cookies, telemetría o ubicación por defecto. En1.0 todo vive en navegador y URL compartida por el usuario. La información local no se envía a un servidor.

## JSON

Nombre `black-hole-lab-scenario.json`; JSON legible con schemaVersion, parámetros y metadata opcional `exportedBy`/`appVersion` si existen. No exportar fecha obligatoria si se quiere reproducibilidad; no serializar los relojes como condiciones iniciales.

Import por selector de archivo. Tamaño máximo64KiB; leer texto, parsear y validar. Rechazar campos desconocidos por defecto, excepto metadata documentada; no ignorar un typo en massSolar. Si falla, conservar escenario anterior y dar explicación. Revocar object URLs de download y limpiar input para permitir reimportar el mismo archivo.

## PNG

Exportar escena en resolución consistente, por ejemplo 1600 px en eje largo con DPR de salida fijo, composición sin recursos remotos. Incluir nombre, experimento, masa, escala, modelo, condiciones iniciales, leyenda y aviso “Disco y malla ilustrativos”. Si está animando, capturar snapshot inmutable del instante visible; no mutar el motor para exportar. Para Relojes incluir los dos tiempos y su escala didáctica. Para Órbitas/Fotones incluir T y escala rs/c.

PNG corresponde a la escena, no se promete una captura de toda la página. Botón deshabilitado mientras se genera y mensaje en caso de fallo. Descargar no equivale a publicar. No exportar una imagen ópticamente calibrada si solo hay dibujo artístico.

## Tests de escenarios

Round-trip conserva números dentro de precisión declarada; URL inválida y storage fallido no rompen app; import inválido no muta estado; import crítico no cruza de lado por redondeo; versión futura se rechaza; XSS no se ejecuta porque ningún texto importado se inserta como HTML. Reducir/remontar recursos no filtra Blob URLs.
