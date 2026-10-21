# Publicar desde el coordinador

Los lectores delegados devuelven el informe o revisión solicitado y sus fuentes, sin publicar. Quien coordina la consulta aplica de forma independiente:

| Informe | Condición |
|---|---|
| `investigacion.md` | Código solicitado/permitido y guardado de `lee-codigo` activo. |
| `investigacion-documentacion.md` | Documentación solicitada/permitida y guardado de `lee-docs` activo, aunque la consulta no se guarde. |
| `resumen-ejecutivo.md`, `informe-detallado.md` | Guardado de `investiga` activo. |

Prefiere un publicador compatible con el archivo elegido y el tipo de informe. Abre una investigación si su interfaz lo requiere y conserva su identificador para lectores, revisiones y síntesis; usa únicamente identificadores devueltos. Publica informes iniciales y versiones materialmente distintas sin sobrescribir entregas previas. Usa los esquemas reales: si el publicador exige contenido completo, el coordinador lo reconstruye desde la base y las revisiones; una revisión diferencial no supone una API de parches. Si ya guardaste el documental por separado, omítelo al publicar la consulta. La síntesis conserva el contraste y enlaza los informes existentes en lugar de reproducirlos.

Verifica rutas y relee el contenido completo publicado antes de anunciarlo, también con publicador. Reducir el intercambio entre agentes no elimina esta comprobación. Anuncia exclusivamente archivos confirmados y registra individualmente los pendientes.

## Escritura nativa

Si falta publicador compatible y hay escritura autorizada, el coordinador puede guardar sin terminal, Node ni servicios auxiliares:

1. Resuelve `sesiones.carpetaRaiz` dentro de la carpeta anfitriona. Comprueba padres y destino: carpetas reales, sin enlaces que desvíen la salida. Si no puedes comprobarlo, entrega en conversación y registra el pendiente.
2. Crea una carpeta nueva `AAAAMMDD-HHMM__tema` bajo esa raíz; si existe, elige un sufijo libre. Usa esa carpeta durante toda la investigación. Crea una subcarpeta nueva `entrega-01`, `entrega-02`, etc. por publicación, comprobando que no exista antes de escribir. No sobrescribas entregas previas.
3. Escribe únicamente los informes habilitados con los nombres anteriores. Lee cada archivo guardado y contrasta el contenido completo antes de anunciar su ruta. Conserva contenido, fuentes, modo efectivo y enlaces a las entregas anteriores en el informe o índice de la investigación.
4. Si una escritura falla, identifica exactamente los archivos confirmados y los pendientes y aplica la presentación por informe indicada abajo. Anuncia una entrega conjunta como completa solo si todos sus archivos están confirmados.

Esta vía no ofrece los controles de identidad, bloqueo, concurrencia ni atomicidad del runtime. Si dos coordinadores comparten carpeta, cada uno debe elegir una carpeta nueva y verificar sus destinos. Un fallo opcional de guardado no invalida hallazgos comprobados ni cambia por sí mismo `SUFICIENTE`/`INSUFICIENTE`.
