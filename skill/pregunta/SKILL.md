---
name: pregunta
description: Coordina preguntas sobre el comportamiento del código y/o la intención de documentos locales. Usa esta skill cuando el usuario quiera contrastar evidencias de ambas fuentes o investigar una pregunta con lectores especializados.
---

# Pregunta

Responde a una pregunta concreta sobre el comportamiento implementado y/o la intención documentada. Antes de delegar lee `coordinator_defaults(action: "read")`: combina valores confirmados de `WORKSPACE`, `REFERENCIA_SOLICITADA` y `LOCAL_DOCUMENT_ROOTS` con los que indique el solicitante. Solicita los datos indispensables que falten y confirma con el usuario el alcance de la consulta. Guarda con `coordinator_defaults(action: "saveMissing", values: {...})` únicamente valores nuevos confirmados. Respeta `especialistasPermitidos` y `MAX_REPREGUNTAS_ESPECIALISTAS`.

1. Delega en `lector-codigo` con pregunta, workspace y referencia y/o en `lector-docs` con pregunta y raíces documentales, según los especialistas permitidos y las fuentes necesarias. Deja la consulta de fuentes en manos de los lectores.
2. Contrasta hallazgos con citas verificables. Distingue comportamiento observado, intención escrita, inferencias y conflictos. Repregunta de forma dirigida hasta el límite configurado si faltan evidencias que el especialista pueda obtener. Con un solo especialista, informa de esa fuente sin atribuir hallazgos a la otra.
3. Devuelve respuesta y límites de cobertura. Usa `write_report_pair` para publicar resumen e informe completo cuando el guardado esté activo. Comunica únicamente rutas confirmadas y responde también en conversación.
