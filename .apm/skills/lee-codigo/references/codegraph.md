# Interfaz de Codegraph y validación Git

Usa las herramientas de lectura disponibles para consultar Codegraph y Git. Si hay un conector, sigue su esquema para indicar workspace, comando y argumentos; comprueba si incorpora la ruta del workspace antes de repetirla como argumento. Los ejemplos siguientes describen la CLI, no el contrato de un conector. Si una consulta falla o se rechaza, registra el error y respeta los permisos del entorno.

Cuando el entorno permita la CLI, se llama `codegraph`. Usa exclusivamente estos comandos de consulta, con el workspace recibido como ruta absoluta entre comillas:

```text
codegraph status "<WORKSPACE>" --json
codegraph query -p "<WORKSPACE>" "<busqueda>" [-l <limite>] [-k <tipo>] [--json]
codegraph explore -p "<WORKSPACE>" "<consulta>" [--max-files <numero>]
codegraph context -p "<WORKSPACE>" "<tarea>" [-n <numero>] [-f markdown|json] [--no-code]
codegraph node -p "<WORKSPACE>" "<simbolo>" [-f <archivo>]
codegraph node -p "<WORKSPACE>" -f "<archivo>" [--offset <linea>] [--limit <numero>] [--symbols-only]
codegraph callers -p "<WORKSPACE>" "<simbolo>" [-l <limite>] [--json]
codegraph callees -p "<WORKSPACE>" "<simbolo>" [-l <limite>] [--json]
codegraph files -p "<WORKSPACE>" [--filter <directorio>] [--pattern <glob>] [--format tree|flat|grouped]
```

Los corchetes indican opciones, no caracteres que debas escribir. `status` informa de `projectPath`, `indexPath`, `lastIndexed`, `pendingChanges`, `worktreeMismatch` y `index.state`: comprueba que el proyecto corresponde a `WORKSPACE` y que el índice refleja el contenido antes de atribuirle resultados.

Un índice completo y sin cambios pendientes no acredita por sí solo un commit solicitado: contrasta también la referencia y el estado del workspace con metadatos Git de solo lectura. Ejecuta Git con `WORKSPACE` como directorio de trabajo; puedes usar `git status --short --branch`, `git rev-parse HEAD` y otras consultas Git de solo lectura: `branch --show-current`, `log`, `show`, `diff`, `ls-tree`, `cat-file`, `blame` y `grep`. Ejecuta cada consulta sin redirecciones ni opciones que escriban archivos.

Consulta commits anteriores con Git en modo lectura cuando ayuden a la investigación; separa esa evidencia histórica de la implementación del workspace actual. Para citar líneas definitivas del workspace, lee directamente sus archivos.

Si no hay una interfaz de consulta disponible o no puedes asociar el índice al workspace recibido, declara la investigación `INSUFICIENTE` y solicita el dato exacto que falta. No instales herramientas, inventes comandos ni sustituyas silenciosamente Codegraph por otra herramienta.
