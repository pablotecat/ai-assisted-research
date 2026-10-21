# Encargo: reducir el volumen de los informes de investigación

## Objetivo

Actualiza las instrucciones de investigación para que produzcan **informes compactos desde el inicio, repreguntas puntuales y una entrega sin duplicación entre archivos y conversación**. Conserva la trazabilidad, los límites de cobertura, los conflictos y el historial material de la investigación.

El encargo prioriza los cambios 2, 3 y 4 del análisis de esta sesión. La entrevista de setup, los conectores y la fiabilidad del índice Codegraph pertenecen a otros trabajos.

## Contexto que justifica el cambio

La pregunta era quién recibe notificaciones al crear una NC Interna o Externa. Se ejecutaron dos lectores y después dos repreguntas que solicitaron otra vez informes completos. La publicación produjo seis archivos, con 1.102 líneas en total, que se releyeron íntegramente; la respuesta final reprodujo además los dos informes revisados.

Las comprobaciones de discrepancias aportaron valor. El coste evitable estuvo en pedir informes inicialmente extensos, regenerarlos completos y repetir en conversación contenido ya publicado.

## 1. Localizar la fuente editable y las instrucciones afectadas

Carpeta anfitriona: `C:\PlainConcepts\PROYECTOS\pruebas OCA`.

| Instrucción | Versión desplegada en este proyecto | Cambio principal |
|---|---|---|
| Coordinación | `.agents/skills/necesito-saber/SKILL.md` | Encargo inicial compacto, repreguntas diferenciales y presentación final |
| Lector de código | `.agents/skills/lee-codigo/SKILL.md` | Definición de informe completo compacto y respuesta a repreguntas |
| Lector documental | `.agents/skills/lee-docs/SKILL.md` | Mismo contrato, preservando citas originales y conflictos |
| Contrato compartido | `.agents/skills/necesito-saber/references/proyecto.md` | Entrega, reconstrucción de revisiones y guardado independiente |

El paquete instalado está en `apm_modules/pablotecat/ai-assisted-research`; sus fuentes de skills están bajo `.apm/skills/`. `apm.yml` y `apm.lock.yaml` identifican la instalación. Algunos enlaces de las skills desplegadas apuntan al contrato dentro del paquete: modificar únicamente la copia desplegada de ese contrato puede dejar activo el texto anterior.

Antes de editar, identifica el repositorio fuente editable y el mecanismo de distribución. Si están disponibles, aplica allí el cambio y comprueba el resultado desplegado. Si solo se puede realizar un parche local, documenta qué copias quedan activas y que una reinstalación puede sobrescribirlas. Conserva los metadatos de instalación mediante el mecanismo documentado, no mediante ediciones manuales de hashes.

**Resultado de este paso:** fuente editable, archivos consumidos y enlaces efectivos identificados.

## 2. Informes compactos desde la primera petición

### Contrato objetivo

Define una sola vez, en el contrato compartido, qué significa **informe completo compacto**: respuesta suficiente para la pregunta, con condiciones, evidencia de cada afirmación material, conflictos y límites. Su completitud se mide por cobertura y evidencia, no por longitud ni por inventario de todo lo consultado.

Haz que las tres skills remitan a esa definición desde sus instrucciones de entrega. En los lectores conserva solo las particularidades de su fuente: Git/Codegraph y recorrido ejecutable para código; originales, versiones, estados, fechas y cobertura para documentación.

Formato base recomendado:

1. **Respuesta y suficiencia:** conclusión directa, condiciones y justificación de `SUFICIENTE`/`INSUFICIENTE`.
2. **Alcance verificado:** fuentes y referencia o fecha de corte efectivas.
3. **Hallazgos con evidencia:** IDs estables, afirmación, tipo y localizador verificable.
4. **Conflictos y límites:** únicamente los que afectan a la respuesta o a su confianza.

Integra el recorrido de implementación, la cronología y las variantes donde sostengan un hallazgo. Abre secciones adicionales cuando aporten información necesaria; omite secciones vacías. Una matriz sustituye a una explicación repetida de las mismas reglas.

Usa como orientación **600–1.000 palabras por lector para una consulta concreta**, incluyendo referencias. Es una meta flexible, no un límite de investigación ni un motivo para eliminar excepciones o citas. Amplía lo necesario cuando la pregunta lo exija. La brevedad de la salida no modifica los criterios de suficiencia.

Consolida cada fuente o localizador en una referencia reutilizable. Cada afirmación material debe poder resolverse hasta el original; una lista de archivos sin correspondencia con los hallazgos no basta. Elimina la repetición de una misma ruta extensa en varios apartados cuando un ID de referencia permita mantener la trazabilidad.

### Cambios concretos

- En `necesito-saber`, incorpora este contrato al primer encargo de ambos lectores, con la pregunta y las condiciones que deben demostrar.
- En `lee-codigo` y `lee-docs`, sustituye las plantillas extensas obligatorias por el formato base y sus particularidades. Revisa también las introducciones y los cierres que asocian «completo» con reproducir todos los apartados.
- Trata las preguntas de seguimiento como salida útil solo cuando falta una decisión o evidencia concreta. Un informe suficiente puede terminar sin ellas.

**Resultado de este paso:** el primer informe ya sirve para responder y publicar; el coordinador no necesita pedir otra versión solo para acortarlo.

## 3. Repreguntas puntuales con devolución diferencial

### Cuándo y con qué contexto

El coordinador repregunta cuando una duda concreta puede cambiar la conclusión, una condición, una cita o la suficiencia. El límite `maxRepreguntasEspecialistas` sigue siendo un máximo, no un objetivo de uso.

Reutiliza el contexto del lector si la herramienta lo permite. Envía los IDs afectados, la duda exacta y cualquier evidencia nueva pertinente; el informe anterior ya disponible no necesita retransmitirse completo.

Si se abre un contexto nuevo, proporciona la pregunta, las fuentes y referencia/corte, el alcance, los hallazgos afectados y los extractos necesarios para comprenderlos. Incluye dependencias y conflictos que condicionen la respuesta. Amplía ese contexto cuando sea imprescindible, en vez de exigir por defecto el informe previo entero.

### Respuesta esperada del lector

Establece un formato de **revisión puntual**, por ejemplo:

```markdown
# Revisión puntual
- Hallazgos afectados: C-10
- Operación: ampliar | corregir | retirar | confirmar sin cambios
- Resultado: ...
- Evidencia consultada: <fuente original y localizador>
- Efecto en la respuesta y sus condiciones: ...
- Suficiencia y límites actualizados: ...
```

Conserva los IDs de los hallazgos existentes y asigna IDs nuevos solo a hallazgos nuevos. Una corrección identifica la afirmación que sustituye; una retirada identifica la afirmación que deja de sostenerse. La revisión comunica expresamente si cambian la suficiencia o los límites.

El lector devuelve esta revisión, no otro informe completo ni una nueva investigación general. Si el contraste exige ampliar el alcance, explica qué parte precisa esa ampliación.

### Integración e historial en el principal

El principal integra la revisión en el informe base y mantiene coherentes respuesta, hallazgos, citas, condiciones y suficiencia. Preserva las versiones materialmente distintas sin sobrescribir entregas.

- **Confirmación sin cambios materiales:** registra la comprobación y su evidencia en el contraste; evita publicar una copia idéntica del informe solo por haber repreguntado.
- **Cambio material:** publica una nueva versión completa reconstruida a partir del informe base y la revisión. Conserva la anterior y enlázala desde la nueva entrega o su síntesis.
- **Integración incierta:** pide la precisión que falta; una revisión completa nueva se reserva para cambios que realmente requieran rehacer el informe.

Los publicadores actuales pueden exigir contenido completo. Usa sus esquemas reales: la devolución diferencial del lector no implica que exista una API de parches. Con publicación nativa o un publicador de informe completo, el principal materializa la versión completa. **Esta mejora reduce regeneración y tráfico entre agentes; no elimina necesariamente la escritura y relectura del archivo completo.**

Actualiza las frases de `necesito-saber` que obligan a incluir siempre el informe previo y a guardar cada revisión como si fuera necesariamente otro informe completo recibido.

**Resultado de este paso:** una duda puntual produce evidencia y un cambio localizable, conservando el historial material y una versión completa utilizable.

## 4. Una sola exposición del informe completo

Aplica esta política por informe, respetando los tres ajustes de guardado independientes:

| Situación | Entrega en conversación |
|---|---|
| Informe completo guardado y verificado | Respuesta directa, citas decisivas, conflictos/límites esenciales y enlace al informe. El archivo contiene el informe completo. |
| Guardado desactivado, no disponible o sin confirmación | Informe completo compacto en conversación para esa parte. |
| Guardado parcial | Enlaces de los archivos confirmados e informes completos en conversación de las partes que faltan. Estado preciso de cada entrega. |
| Usuario pide expresamente el informe completo en conversación | Informe completo en conversación, aunque también se haya guardado. |

La respuesta breve conserva por sí misma la conclusión, sus condiciones decisivas, las discrepancias relevantes y el modo/fuentes efectivos. Los enlaces amplían el detalle, no sustituyen la respuesta.

Con ambos lectores y todos los guardados confirmados, una respuesta orientativa de **250–500 palabras** suele bastar. Ajusta la extensión a la pregunta, sus tablas necesarias y las preferencias del usuario. Evita reproducir los informes completos como anexos o desplegables por defecto.

### Cambios coordinados necesarios

- Sustituye en los dos lectores «Devuelve siempre el informe completo en conversación» por una distinción explícita: **el lector delegado devuelve al coordinador el informe o revisión solicitado; el principal decide la presentación al usuario según este contrato**.
- Modifica el paso final de `necesito-saber` que actualmente obliga a devolver informes completos en conversación aunque ya estén publicados.
- Alinea el contrato de publicación y cualquier documentación activa que conserve la obligación anterior. Una instrucción nueva no debe convivir con otra que exija la duplicación.
- Mantén los nombres y los guardados independientes de `investigacion-codebase.md`, `investigacion-documentacion.md`, `resumen-ejecutivo.md` e `informe-detallado.md`. La síntesis enlaza los informes existentes.
- Mantén la comprobación de rutas, la relectura del contenido publicado y el anuncio exclusivo de rutas confirmadas. La optimización de presentación no reduce las garantías de guardado.

La política se aplica también con una fuente, en modo secuencial y en invocaciones directas de los lectores. No exige un runtime, un nuevo ajuste de usuario ni nuevos subagentes.

**Resultado de este paso:** cada informe completo se expone en su archivo verificado o en conversación cuando haga falta; la presentación por defecto evita duplicar ambos soportes.

## 5. Verificación y criterios de aceptación

Revisa las instrucciones en su conjunto, incluidos enlaces y copias efectivamente consumidas. Comprueba estos recorridos mediante la vía de validación disponible; si alguno solo se revisa estáticamente, decláralo como tal.

| Caso | Resultado esperado |
|---|---|
| Consulta concreta, dos lectores | Primeros informes compactos, completos en evidencia y sin petición posterior de acortarlos |
| Repregunta en el mismo contexto | Duda e IDs pertinentes; respuesta diferencial con evidencia y efecto |
| Repregunta en contexto nuevo | Contexto suficiente y acotado; sin dependencia de información inaccesible |
| Confirmación sin cambio material | Constancia de comprobación; sin copia idéntica del informe |
| Corrección material | Nueva versión completa coherente, con IDs/citas actualizados e historial anterior conservado |
| Todos los guardados confirmados | Respuesta breve con enlaces; sin reproducción completa automática en conversación |
| Guardados independientes o fallo parcial | Cada parte sigue su política; se entregan íntegramente las partes no guardadas |
| Sin guardado o petición explícita de informe en chat | Informes completos compactos accesibles en conversación |
| Una fuente o lectura secuencial | Mismo contrato de salida; modo efectivo declarado correctamente |

Conserva citas verificables, distinción `HECHO`/`INFERENCIA`/`NO DETERMINADO`, suficiencia justificada, conflictos y trabajo de lectores en solo lectura. Comprueba la distribución y enlaces con los mecanismos documentados del repositorio fuente, especialmente si cambian los destinos de las referencias compartidas.

## Entrega del agente que implemente las mejoras

Devuelve un resumen breve con los archivos modificados, las obligaciones antiguas sustituidas, las comprobaciones realmente ejecutadas y cualquier pendiente de distribución o recarga. No es necesario repetir en la entrega este encargo ni todos los textos finales de las skills.
