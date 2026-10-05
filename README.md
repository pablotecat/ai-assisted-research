# Investigación asistida por agentes

Versión ligera del flujo de planificación: responde dudas del día a día sobre código y documentación local, sin refinar historias ni generar planes.

| Agente | Función |
|---|---|
| `agente-coordinador` | Recoge el alcance, consulta especialistas y contrasta sus evidencias. |
| `agente-codigo` | Investiga el workspace indexado con Codegraph. |
| `agente-documentacion` | Examina documentos locales y cita las fuentes. |

## Instalación

Copia `agent/`, `plugin/`, `tools/`, `package.json`, `opencode.json` y `agent-settings.example.json` a la carpeta `.opencode/` del proyecto anfitrión. Ejecuta `npm install` en `.opencode/` y reinicia OpenCode. Si ya existe `.opencode/opencode.json`, conserva sus opciones y añade `"subagent_depth": 4` para permitir la delegación. Si vas a investigar código, instala Codegraph e indexa el workspace; para convertir otros formatos documentales, prepara `markitdown`.

Copia `agent-settings.example.json` como `.opencode/agent-settings.json` y configura `proyecto.repositorio` (ruta absoluta del workspace) y/o `proyecto.carpetasDocumentales` (rutas absolutas) según las fuentes de tu consulta. Puedes dejar los valores vacíos para que el coordinador solicite solo los imprescindibles y guarde los que confirmes. `especialistasPermitidos` restringe las delegaciones; `guardarEntregablesEnSesion` permite desactivar el guardado para cada agente. La carpeta de sesiones se configura con `sesiones.carpetaRaiz`, relativa a la raíz del proyecto anfitrión (por defecto `informes-agente/sesiones/`). Ignora `agent-settings.json` y `informes-agente/` en el Git del anfitrión si no quieres versionar los datos locales.

## Uso

Invoca `agente-coordinador` con tu pregunta y las fuentes disponibles. El coordinador pide el contexto que falte, delega en código y/o documentación y devuelve una respuesta con evidencias y límites. En consultas directas publica `resumen-ejecutivo.md` e `informe-detallado.md` juntos en una carpeta de consulta; cada especialista puede guardar su investigación. También puedes invocar a los lectores por separado. Los informes se organizan por sesión con `indice.md`; si el guardado está desactivado, las respuestas siguen apareciendo en conversación.

Para ejecutar las comprobaciones del paquete: `npm test` (Node.js 24 o posterior).
