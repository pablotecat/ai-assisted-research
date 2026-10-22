# Publicación de entregables

Publica la versión completa vigente de cada [documento consolidado de sesión](informe.md) en cuanto esté lista. Ante cambios materiales, sustituye el mismo archivo; una confirmación sin cambios conserva el vigente. Aplica los tres guardados independientes:

| Informe | Condición |
|---|---|
| `investigacion-codebase.md` | Código solicitado/permitido y guardado de `lee-codigo` activo. |
| `investigacion-documentacion.md` | Documentación solicitada/permitida y guardado de `lee-docs` activo, aunque la consulta no se guarde. |
| `resumen-ejecutivo.md`, `informe-detallado.md` | Guardado de `investiga` activo. |

## Sesión y destinos

Resuelve `sesiones.carpetaRaiz` dentro de la carpeta anfitriona; su valor predeterminado procede de la plantilla de ajustes. Cada investigación tiene una carpeta directamente bajo esa raíz. Los cuatro informes y el `indice.md` local se guardan directamente en la carpeta de investigación.

Conserva carpeta e identificador durante toda la conversación: las preguntas posteriores amplían la investigación activa, incluso si varía el tema. Inicia otra solo por petición explícita del usuario; una conversación nueva comienza otra por defecto. Si la interfaz exige abrir una investigación, usa su operación y conserva el identificador devuelto para lectores, ampliaciones, revisiones y síntesis. Si la primera publicación la abre automáticamente, reserva la apertura explícita para una investigación nueva solicitada.

## Quién publica

- **Lector delegado:** publica su informe de la tabla antes de devolverlo mediante su publicador acotado, limitado a ese entregable y a la sesión asignada. Con cambio material, publica la versión consolidada antes de devolver su revisión puntual.
- **Coordinador:** publica la síntesis consolidada con el mecanismo exclusivo indicado abajo. Publica también los informes de los lectores que ejerce en su contexto o que carecen de publicador compatible. Al cerrar cada respuesta, actualiza el [índice global de sesiones](indice-sesiones.md), tanto con publicador como con escritura nativa.

Usa los esquemas reales de las herramientas. La síntesis conserva el contraste y enlaza los informes existentes en lugar de reproducirlos; un informe ya publicado por su lector se reutiliza.

## Guardado interno de la síntesis

Para `resumen-ejecutivo.md` e `informe-detallado.md`, usa exclusivamente el publicador `write_report_pair` anunciado por el entorno, respetando el guardado de `investiga`. Envía ambos documentos completos y consolidados en una sola llamada; el publicador escribe y verifica internamente y devuelve solo estado y rutas. Su confirmación basta: evita una relectura adicional de los documentos recién publicados.

Si falta ese publicador o falla, deja el guardado de la síntesis pendiente y responde igualmente a la pregunta según la [presentación al usuario](presentacion.md). No lo sustituyas por `write`, edición, parches, shell ni otro volcado del contenido. Esta exclusividad afecta solo a los dos archivos de síntesis; los informes de lectores y los índices conservan sus vías de guardado.

## Publicador del runtime

Con publicador compatible, el propio publicador comprueba el contenido antes de confirmar cada ruta; usa esa confirmación sin otra relectura. El runtime prepara los archivos, los sustituye atómicamente por archivo bajo bloqueo de sesión y restaura los anteriores si falla la publicación. Considera el par de síntesis guardado solo si ambos archivos están confirmados.

El runtime mantiene el `indice.md` local con tema, fuentes y enlaces a los entregables vigentes. El coordinador mantiene el índice global con herramientas nativas.

## Escritura nativa

Para los informes de lectores y los índices, si falta publicador compatible y hay escritura autorizada, el coordinador puede guardar sin terminal, Node ni servicios auxiliares:

1. Resuelve `sesiones.carpetaRaiz` dentro de la carpeta anfitriona. Comprueba padres y destino: carpetas reales, sin enlaces que desvíen la salida. Si no puedes comprobarlo, registra el pendiente y aplica la [presentación al usuario](presentacion.md).
2. Si hay algún informe que guardar, crea una carpeta nueva `AAAAMMDD-HHMM__tema` bajo esa raíz; si existe, elige un sufijo libre. Conserva su ruta para toda la investigación y aplica los destinos definidos arriba.
3. Escribe únicamente los informes de lectores habilitados y mantén el `indice.md` local con tema, fuentes y enlaces a los archivos confirmados. Lee cada archivo escrito y contrasta el contenido completo antes de anunciar su ruta: esta vía no tiene la verificación interna del publicador.
4. Si una escritura falla, identifica exactamente los archivos confirmados y los pendientes y aplica la [presentación al usuario](presentacion.md). Anuncia una entrega conjunta como completa solo si todos sus archivos están confirmados.

Esta vía no ofrece los controles de identidad, bloqueo, concurrencia ni atomicidad del runtime. Si dos coordinadores comparten carpeta, cada uno debe elegir una carpeta nueva y verificar sus destinos. Un fallo opcional de guardado no invalida hallazgos comprobados ni cambia por sí mismo `SUFICIENTE`/`INSUFICIENTE`.
