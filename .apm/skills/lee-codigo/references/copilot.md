# Lectura de código en GitHub Copilot

Cuando `pregunta` te delegue esta skill, actúa como su lector de código en el subagente de lectura disponible en el anfitrión. Carga solo esta skill, consulta sin escritura ni delegación y devuelve el informe completo al agente principal, que gestiona ajustes y guardado. El paquete no requiere un agente llamado `lector-codigo` ni instala perfiles propios.

En una invocación directa del usuario, el agente principal lee `research-control/research_settings`, confirma las fuentes que falten y abre una investigación con `research-control/start_research`. Ejecuta la investigación en modo lectura y conserva el informe mediante `research-control/publish_code_report`, pasando el identificador devuelto, el contenido completo y las fuentes. Respeta el resultado `guardado:false` y comunica solo rutas confirmadas. En una delegación, devuelve el informe sin llamar a estas herramientas de control.

Las consultas de [Codegraph y Git](codegraph.md) se ejecutan mediante herramientas, sin terminal:

- `research-code/codegraph_query`: `workspace` absoluto, `comando` y `argumentos` como array. Para validar el índice: `{"workspace":"<WORKSPACE>","comando":"status","argumentos":[]}`. Para descubrir símbolos: `{"workspace":"<WORKSPACE>","comando":"query","argumentos":["<busqueda>","--json"]}`. El servidor incorpora la ruta del workspace: omite `-p` y el argumento de ruta de los ejemplos CLI.
- `research-code/git_query`: mismo esquema. Para estado: `comando: "status"`, `argumentos: ["--short", "--branch"]`; para commit: `"rev-parse"`, `["HEAD"]`; para rama: `"branch"`, `["--show-current"]`; para historial acotado: `"log"`, `["--max-count=10", "--oneline"]`.
- Lee los archivos decisivos con herramientas nativas para confirmar líneas y contexto.

El servidor rechaza comandos y opciones fuera de su lista de consulta. Si falta Codegraph o falla una consulta, registra el error y aplica la suficiencia de la skill; no instales herramientas, cambies el índice ni sustituyas Codegraph silenciosamente. Devuelve siempre el informe completo. El guardado de código es independiente del guardado de la consulta. Si al subagente le faltan herramientas, informa al principal sin delegar de nuevo ni eludir los permisos del anfitrión.