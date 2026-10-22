# Flujo de guardado de entregables

El [contrato de publicación](../.apm/skills/contrato/references/publicacion.md) define los destinos y responsabilidades; el [contrato de informe](../.apm/skills/contrato/references/informe.md), la consolidación. Este recorrido muestra su aplicación conjunta.

## Organización de los documentos

```text
sesiones-investigacion/
  indice-sesiones.md
  <sesion>/
    indice.md
    investigacion-codebase.md
    investigacion-documentacion.md
    resumen-ejecutivo.md
    informe-detallado.md
```

Solo se crean los informes cuyo guardado está habilitado. Los publicadores conservan su estado interno bajo `.control/`, en la raíz de salida, separado de los documentos de sesión.

## Recorrido de una consulta y sus ampliaciones

1. El coordinador resuelve las fuentes y la investigación activa. En la misma conversación conserva carpeta e identificador; abre otra por petición explícita del usuario. Una conversación nueva comienza otra investigación por defecto.
2. Cada lector investiga en solo lectura y publica su informe completo mediante su publicador acotado, si dispone de él. En contexto compartido o sin ese publicador, el coordinador realiza el guardado.
3. El coordinador contrasta las evidencias e integra revisiones puntuales. Los cambios materiales se incorporan al documento consolidado de cada rol, con hallazgos, citas y límites coherentes.
4. El coordinador publica la síntesis consolidada exclusivamente con `write_report_pair` en `resumen-ejecutivo.md` e `informe-detallado.md`, enlazando los informes existentes. Si falta el publicador o falla, deja ese guardado pendiente, sin sustituirlo por escritura genérica. Las preguntas posteriores amplían los mismos documentos: se conserva lo válido y se sustituye lo corregido.
5. El publicador mantiene el `indice.md` local con tema, fuentes y entregables vigentes; en escritura nativa lo mantiene el coordinador.
6. Al cerrar la respuesta, el coordinador actualiza y verifica el [índice global](../.apm/skills/contrato/references/indice-sesiones.md) mediante herramientas nativas. Cada pregunta de investigación tiene fecha y enlace a una carpeta con algún entregable confirmado; las ampliaciones apuntan a la misma carpeta. Una pregunta ya cubierta se registra sin republicar documentos idénticos.
7. La respuesta del coordinador contesta únicamente a la pregunta; el guardado de sus dos informes es interno y sus rutas se reservan para petición expresa. Un fallo de guardado solicitado o del índice global se comunica en una nota breve, conservando los documentos confirmados. Sin guardado se responde igualmente, sin volcar informes ni crear carpetas o entradas vacías.

## Garantías de escritura

El runtime prepara y verifica el contenido, sustituye atómicamente cada archivo bajo bloqueo de sesión y restaura los anteriores si falla la publicación. Conserva un registro interno de eventos; cada entregable público tiene una única versión vigente. El par de síntesis se anuncia como completo solo tras confirmar ambos archivos.

La escritura nativa relee los archivos completos antes de confirmar sus rutas. No ofrece los controles de identidad, bloqueo ni atomicidad del runtime. La actualización del índice global pertenece siempre al coordinador y permanece utilizable sin runtime.

## Pendiente de revisión: continuidad de lectores

Revisar la reutilización del contexto de los lectores entre preguntas del usuario y puntualizaciones del coordinador: capacidades reales del anfitrión, identificadores de continuación y contexto disponible. Este punto requiere análisis independiente; no se presupone que una ampliación deba crear un lector nuevo. El contrato de documentos consolidados se aplica con cualquiera de las vías de lectura disponibles.
