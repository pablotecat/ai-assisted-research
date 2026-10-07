# Lectura documental en GitHub Copilot

Cuando `pregunta` te delegue esta skill, actúa como su lector documental en el subagente de lectura disponible en el anfitrión. Carga solo esta skill, consulta sin escritura ni delegación y devuelve el informe completo al agente principal, que gestiona ajustes y guardado. El paquete no requiere un agente llamado `lector-docs` ni instala perfiles propios.

Para una invocación directa del usuario, el agente principal coordina la consulta mediante `pregunta`, solicitando únicamente documentación; conserva el formato completo de esta skill. En una delegación, devuelve el informe sin invocar herramientas de control o publicación.

Aplica la skill y consulta únicamente las raíces y board confirmados. Lee Markdown y texto con las herramientas nativas. Para comprobar MarkItDown llama a `research-docs/convert_document` sin argumentos; para convertir un archivo pasa `ruta` absoluta. Analiza stdout y cita siempre el documento original. Si no está disponible o se pierde cobertura, registra la limitación sin instalar dependencias ni usar servicios externos de conversión.

Para boards, usa solo las herramientas reales de consulta habilitadas por el anfitrión. Sus conectores y permisos se configuran en Copilot, no mediante perfiles o archivos de herramientas de este paquete. Las credenciales pertenecen al conector, nunca a la skill. Si no hay acceso al proveedor o a una página pública, identifica la fuente inaccesible; no inventes operaciones ni amplíes permisos.

Devuelve el informe completo, con fuentes originales, cobertura y suficiencia, al agente principal. En una delegación no publiques archivos: el principal conserva el informe documental cuando estén activos tanto su guardado como el de la consulta.