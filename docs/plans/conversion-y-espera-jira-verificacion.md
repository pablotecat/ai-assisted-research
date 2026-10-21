# Conversión UTF-8 y espera del board: implementación y verificación

Fecha: 21/10/2026. Alcance: cambios A y B de `PLAN-CONVERSION-Y-ESPERA-JIRA.md`.

## Cambios aplicados

| Archivo | Resultado |
|---|---|
| `.apm/skills/lee-docs/references/documentos-locales.md` | CLI Windows `python -X utf8 -m markitdown`, mismo intérprete para versión/conversión, registro de fallos y cobertura perdida. Se conservan lector local, lectura nativa y CLI de otras plataformas. |
| `plugin/research.ts` | La validación admite el prefijo literal nuevo sólo para `lee-docs`; conserva los filtros de argumentos y metacaracteres y `PYTHONIOENCODING=utf-8`. |
| `opencode.json` del paquete | Dos permisos específicos nuevos; sin permiso genérico para Python. |
| `research_flow.test.ts` | Permisos positivos/negativos, Unicode en rutas y distribución del perfil sólo mediante elección explícita. |
| `.apm/skills/lee-docs/references/boards.md` | Peticiones individuales, integración inmediata de evidencia, un reintento decisivo y cierre parcial tras dos timeouts sin respuesta correcta intermedia. La referencia sigue siendo independiente del proveedor. |
| `scripts/check-distribution.mjs` | Verifica también el perfil y plugin empaquetados y las dos referencias desplegadas en ambos destinos. |
| `C:\PlainConcepts\PROYECTOS\pruebas OCA\opencode.json` | Añadido únicamente `mcp.servers["jira-oca"].timeout.execution: 120000`; preservados esquema, tipo, URL y OAuth implícito. |

No se añadieron dependencias, conversores, colas, ajustes de reintentos ni migraciones de runtime. El perfil restrictivo no se aplicó al anfitrión. No se modificaron ESPIDi, Codegraph, la sesión bloqueada ni el informe de código existente.

## Verificaciones ejecutadas

- `npm test`: diez pruebas correctas, incluidas la política del lector y la instalación explícita del perfil restrictivo. Estas pruebas ejercitan las APIs heredadas del plugin, no acreditan su compatibilidad completa con OpenCode V2.
- `node scripts/check-distribution.mjs`: correcto en OpenCode y Copilot mediante instalaciones APM locales aisladas.
- `git diff --check`: correcto; sólo avisos de normalización LF/CRLF de Git.
- OpenCode instalado: `v2.1.2`; APM: `0.32.0`; `python -X utf8 -m markitdown --version`: `0.0.2`.
- Conversión **directa mediante la herramienta de shell**, con salida correcta y código cero, de:
  - `00_Documentation/20260630 evidencias/4.docx`: contiene `Nuevo → Asignando agentes internos`.
  - `00_Documentation/[WIP] Visión funcional de ESPIDi_v0.1.docx`.
  - `00_Documentation/[WIP] Especificación funcional detallada de Deducciones_v0.1.docx`.
  - `00_Documentation/[WIP] Catálogo de Tests de Regresión de Deducciones_v0.2.docx`.
- Las salidas completas de los tres documentos principales preservan tildes, `ñ` y flechas; no contienen `�` ni los patrones de mojibake comprobados (`Ã.`, `Â.`, `â€`, `â†`). Las rutas con espacios, acentos y corchetes funcionan. No se solicitaron archivos de conversión en disco: las salidas grandes fueron retenidas automáticamente por la herramienta.
- API `/api/location` con contexto explícito: directorio confirmado `C:\PlainConcepts\PROYECTOS\pruebas OCA`. `/api/config` muestra el límite de 120.000 ms y ninguna sobrescritura de ese servidor ni timeout global en los documentos devueltos. `/api/mcp` muestra `jira-oca` conectado. Esto acredita configuración descubierta y conexión, no el límite de una llamada que ya estaba en curso.

Para reproducir la inspección de este proyecto, usa la consulta codificada; en esta versión `--param 'location[directory]=…'` no seleccionó el contexto y devolvió el directorio del usuario:

```powershell
opencode api get '/api/location?location%5Bdirectory%5D=C%3A%5CPlainConcepts%5CPROYECTOS%5Cpruebas%20OCA'
opencode api get '/api/config?location%5Bdirectory%5D=C%3A%5CPlainConcepts%5CPROYECTOS%5Cpruebas%20OCA'
```

## Decisiones y pendientes

- **Despliegue productivo pendiente por elección del usuario:** conservar la dependencia remota. `apm.yml`, `apm.lock.yaml`, el snapshot remoto y las skills instaladas del anfitrión permanecen sin editar. Las instalaciones aisladas acreditan la distribución de estos cambios, no su carga en el anfitrión. Para desplegarlos hará falta seleccionar expresamente una revisión remota con estos cambios; el commit y push solicitados posteriormente no actualizan las skills ya instaladas.
- **Recarga descartada por indicación del usuario.** La operación V2 `/api/location/reload` reconstruye todas las ubicaciones y cancela permisos/formularios pendientes. No se invocó ni se reinició el servicio. El nuevo límite no se atribuye retroactivamente a la llamada bloqueada.
- **Timeout MCP nativo pendiente de validación.** Se intentó una prueba aislada con OpenCode `--standalone`, proveedor HTTP local determinista y servidor MCP stdio que deja una petición sin respuesta. El catálogo de esa prueba no expuso la herramienta (`Unknown tool 'fixture.lookup'`); no llegó a enviarse ninguna petición al servidor de prueba y no se validó el timeout ni la liberación de `execute`. No se cuentan como éxito las respuestas finales prefijadas del proveedor de prueba. Reproducción y registros fuera del paquete: `C:\Users\potero\AppData\Local\Temp\opencode\verify-plan-mcp.mjs` y `mcp-timeout-fzRMk1/`. Diagnosticar ese entorno requiere un trabajo posterior; no se amplió esta tarea a reparar OpenCode.
- La consulta productiva correcta y el comportamiento autónomo del lector ante fallos requieren comprobación posterior; no se ha reanudado la investigación original ni provocado un bloqueo en Jira productivo.
- La ausencia de intérprete/módulo y un documento ilegible tienen tratamiento explícito en las instrucciones, pero no se ha ejecutado una investigación autónoma con esas averías inyectadas.

Referencias oficiales: [timeouts MCP V2](https://opencode.ai/v2/docs/mcp-servers#timeouts), [API V2](https://opencode.ai/v2/docs/api), [configuración V2](https://opencode.ai/v2/docs/config).
