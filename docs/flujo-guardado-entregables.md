# Flujo de guardado de entregables

Borrador de trabajo sobre el reparto de escritura entre roles de la investigación: quién escribe, qué escribe y cuándo. Falta decidir su ubicación y formato definitivos.

## Recorrido de una consulta

```
Usuario ── pregunta ──► COORDINADOR (investiga)
                          │
                          │ 1. Resuelve ajustes y encarga la lectura
                          │
                          ├──► LECTOR lee-codigo (contexto aislado)
                          │      investiga en solo lectura
                          │      publica investigacion.md en cuanto termina
                          │      tras repregunta con cambio material:
                          │      reconstruye y sobrescribe su archivo
                          │
                          ├──► LECTOR lee-docs (contexto aislado)
                          │      investiga en solo lectura
                          │      publica investigacion-documentacion.md en cuanto termina
                          │      sobrescribe igual que lee-codigo
                          │
                          │ 2. Contrasta los informes devueltos
                          │    repregunta (revisión puntual) y reintegra
                          │
                          │ 3. Publica la síntesis de la pregunta:
                          │    carpeta consulta/ con resumen-ejecutivo.md
                          │    e informe-detallado.md
                          │    (una carpeta por pregunta; reescribir
                          │    sustituye atómicamente la última)
                          │
Usuario ◄── respuesta ── 4. Presentación con enlaces a rutas confirmadas;
                          contenido completo en conversación solo por lo
                          no guardado o si el usuario lo pide
```

## Quién escribe, qué y cuándo

**Lector delegado (lee-codigo / lee-docs)**

- Sin herramientas de escritura genéricas (`edit`, `write`, terminal, `task`): investigación estrictamente en lectura.
- Único canal de escritura: su publicador acotado (`publish_code_report` / `publish_documentation_report`), que solo admite el entregable de su skill y solo escribe en su carpeta de sesión.
- Cuándo: inmediatamente al terminar el informe, antes de devolverlo al coordinador. Tras una repregunta con cambio material, reconstruye la versión completa (base + revisión, ambos en su contexto) y sobrescribe el mismo archivo.

**Coordinador (investiga)**

- Publica los informes de lectura solo cuando ejerce el lector en su propio contexto (modo secuencial o una sola fuente) o cuando el lector delegado no disponía de publicador compatible.
- Publica la síntesis de cada pregunta con `write_report_pair`: `resumen-ejecutivo.md` + `informe-detallado.md` en una carpeta `consulta` por pregunta; `reescribir: true` sustituye atómicamente la última entrega.
- Sin publicador compatible pero con escritura autorizada: escritura nativa, releyendo el contenido completo de cada archivo antes de anunciar su ruta (no hay verificación interna).

**Runtime (publishSession, invisible para el modelo)**

- Escrituras atómicas: archivo temporal con verificación de contenido y renombrado en segunda fase.
- Comprueba internamente el contenido guardado antes de confirmar cada ruta; el publicador solo devuelve rutas confirmadas, por lo que no hay que releer esos archivos.
- Bloqueo por sesión, una carpeta por investigación, índice (`indice.md`) con las entregas vigentes y registro interno append-only de eventos (fecha, ruta, rol) en `state.json`.
- No hay archivos de versiones: cada entregable existe una única vez y se sobrescribe; el historial vive en los eventos internos.

**Reglas transversales**

- `guardarEntregablesEnSesion` de cada skill decide de forma independiente qué entregables se guardan; un fallo opcional de guardado no invalida los hallazgos.
- Un lector delegado sin publicador devuelve el informe completo y el guardado pasa al coordinador; la skill no depende del entorno (portabilidad).
