# Informe completo compacto y revisiones

Un informe completo compacto responde a la pregunta hasta donde permita la evidencia, con condiciones, citas para cada afirmación material, conflictos y límites. Su completitud se mide por cobertura y evidencia, no por longitud ni inventario de lo consultado. Este contrato rige a cualquier lector, delegado en contexto propio o compartido con quien lo coordina, desde el primer encargo:

1. **Respuesta y suficiencia:** conclusión directa, condiciones y `SUFICIENTE`/`INSUFICIENTE` justificado según el lector.
2. **Alcance verificado:** fuentes, referencia o fecha de corte efectivas y cobertura real.
3. **Hallazgos con evidencia:** ID estable (`C-01` para código, `D-01` para documentación), tipo (`HECHO`, `INFERENCIA`, `NO DETERMINADO`), afirmación y localizador original verificable.
4. **Conflictos y límites:** los que afecten a la respuesta o su confianza, con su efecto explícito.

Integra recorrido, variantes y cronología donde sostengan hallazgos. Usa matrices en lugar de repetir reglas; abre secciones adicionales solo cuando aporten información necesaria y omite las vacías. Formula preguntas de seguimiento solo para una decisión o evidencia concreta que falte; un informe suficiente puede terminar sin ellas.

Consolida fuentes y localizadores en referencias reutilizables: cada afirmación material debe resolverse hasta el original con las precisiones exigidas por su lector. Para una consulta concreta, **600–1.000 palabras por lector**, incluidas referencias, son una orientación, no un mínimo ni un límite: usa menos si basta y amplía para conservar excepciones, citas y cobertura. La brevedad no modifica los criterios de suficiencia.

## Documento consolidado de sesión

Cada archivo refleja las conclusiones vigentes de toda la investigación. Integra las ampliaciones y puntualizaciones en sus apartados, conserva hallazgos anteriores válidos con sus citas y sustituye las afirmaciones corregidas. La estructura sigue el conocimiento investigado, en lugar de reproducir una transcripción o una sucesión de respuestas independientes.

Antes de sustituir un archivo, recupera su versión vigente del contexto disponible o del archivo confirmado y reconstruye el contenido completo. Si falta una parte necesaria, identifica el pendiente de consolidación y conserva el archivo existente hasta poder integrarla. Una revisión diferencial es una devolución entre roles, no el contenido completo que se publica.

## Revisiones puntuales

Repregunta solo si una duda puede cambiar la conclusión, una condición, una cita o la suficiencia; `maxRepreguntasEspecialistas` es un máximo. Reutiliza el contexto del lector cuando sea posible y envía IDs afectados, duda exacta y evidencia nueva pertinente. En contexto nuevo añade pregunta, fuentes y referencia/corte, alcance, hallazgos afectados y extractos necesarios, incluidas dependencias y conflictos; amplía solo lo imprescindible para que pueda resolver la duda.

El lector investiga esa duda y devuelve una **revisión puntual**, no otro informe completo:

```markdown
# Revisión puntual
- Hallazgos afectados: <IDs existentes; IDs nuevos solo para hallazgos nuevos>
- Operación: ampliar | corregir | retirar | confirmar sin cambios
- Resultado: <afirmación resultante e identificación de la sustituida o retirada>
- Evidencia consultada: <fuente original y localizador>
- Efecto en la respuesta y sus condiciones: ...
- Suficiencia y límites actualizados: <estado justificado; indicar también si no cambian>
```

Si el cambio afecta a un informe ya publicado, el lector dueño reconstruye la versión completa y sobrescribe su entregable antes de devolver la revisión.

Si hace falta ampliar el alcance, identifica qué parte y por qué. Quien coordina integra la revisión en la base y comprueba coherencia de respuesta, hallazgos, citas, condiciones y suficiencia. Conserva IDs existentes y el historial de retiradas, sin reutilizarlos:

- **Sin cambio material:** registra la comprobación y su evidencia en el contraste; conserva el informe vigente sin publicar una copia idéntica.
- **Cambio material:** la versión completa reconstruida se publica sobre el entregable vigente, sobrescribiéndolo; quien coordina comprueba la coherencia de lo publicado.
- **Integración incierta:** pide la precisión que falta; solicita un informe completo nuevo solo si el cambio exige rehacerlo.
