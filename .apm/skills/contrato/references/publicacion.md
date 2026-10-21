# Publicación de entregables

Cada entregable se publica una sola vez y su dueño lo escribe en cuanto existe la versión completa vigente. Una revisión con cambio material sobrescribe el mismo archivo con la versión reconstruida; una confirmación sin cambios no republica nada. Aplica los tres guardados independientes:

| Informe | Condición |
|---|---|
| `investigacion.md` | Código solicitado/permitido y guardado de `lee-codigo` activo. |
| `investigacion-documentacion.md` | Documentación solicitada/permitida y guardado de `lee-docs` activo, aunque la consulta no se guarde. |
| `resumen-ejecutivo.md`, `informe-detallado.md` | Guardado de `investiga` activo. |

## Quién publica

- **Lector delegado:** publica `investigacion.md` (código) o `investigacion-documentacion.md` (documentación) en cuanto termina el informe, antes de devolverlo. Su único canal de escritura es su publicador acotado, limitado a su entregable y a su carpeta de sesión. Tras una repregunta con cambio material, reconstruye la versión completa y sobrescribe su entregable antes de devolver la revisión puntual.
- **Coordinador:** publica la síntesis de la consulta (`resumen-ejecutivo.md` e `informe-detallado.md`) agrupada por pregunta al sintetizar; una entrega nueva por pregunta distinta. Publica también los informes de lectura cuando ejerce el lector en su propio contexto (secuencial o una sola fuente) o cuando un lector delegado no dispuso de publicador compatible.

Abre una investigación si su interfaz lo requiere y conserva su identificador para lectores, revisiones y síntesis; usa únicamente identificadores devueltos. Usa los esquemas reales: si el publicador exige contenido completo, quien publica reconstruye desde la base y las revisiones; una revisión diferencial no supone una API de parches. Si el documental ya se guardó por separado, nadie lo republica. La síntesis conserva el contraste y enlaza los informes existentes en lugar de reproducirlos.

## Publicador del runtime

Con publicador compatible, la escritura es atómica y el propio publicador comprueba el contenido guardado antes de confirmar cada ruta: no relean esos archivos para verificarlos. Cada entrega de consulta se escribe y anuncia en conjunto; anuncia solo rutas confirmadas y registra los pendientes individualmente. Una entrega conjunta se anuncia como completa solo si todos sus archivos están confirmados.

## Escritura nativa

Si falta publicador compatible y hay escritura autorizada, el coordinador puede guardar sin terminal, Node ni servicios auxiliares:

1. Resuelve `sesiones.carpetaRaiz` dentro de la carpeta anfitriona. Comprueba padres y destino: carpetas reales, sin enlaces que desvíen la salida. Si no puedes comprobarlo, entrega en conversación y registra el pendiente.
2. Crea una carpeta nueva `AAAAMMDD-HHMM__tema` bajo esa raíz; si existe, elige un sufijo libre, y úsala durante toda la investigación. Escribe cada informe habilitado una única vez como archivo propio de su autor; ante cambios materiales, reescribe ese mismo archivo con la versión completa vigente, sin conservar copias de entregas anteriores. Agrupa las síntesis por pregunta en una subcarpeta nueva por pregunta.
3. Escribe únicamente los informes habilitados con los nombres anteriores. Lee cada archivo guardado y contrasta el contenido completo antes de anunciar su ruta: esta vía no tiene la verificación interna del publicador.
4. Si una escritura falla, identifica exactamente los archivos confirmados y los pendientes y aplica la presentación por informe indicada abajo. Anuncia una entrega conjunta como completa solo si todos sus archivos están confirmados.

Esta vía no ofrece los controles de identidad, bloqueo, concurrencia ni atomicidad del runtime. Si dos coordinadores comparten carpeta, cada uno debe elegir una carpeta nueva y verificar sus destinos. Un fallo opcional de guardado no invalida hallazgos comprobados ni cambia por sí mismo `SUFICIENTE`/`INSUFICIENTE`.
