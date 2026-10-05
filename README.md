# Investigación asistida por agentes

Versión ligera del flujo de planificación: responde dudas del día a día sobre código y documentación local, sin refinar historias ni generar planes.

| Componente | Función |
|---|---|
| Skill `pregunta` | Recoge el alcance, consulta especialistas y contrasta sus evidencias desde el agente principal. |
| Agente `lector-codigo` | Investiga el workspace indexado con Codegraph. |
| Agente `lector-docs` | Examina documentos locales y cita las fuentes. |

## Instalación

Copia `agent/`, `skill/`, `plugin/`, `tools/`, `package.json`, `opencode.json` y `agent-settings.example.json` a la carpeta `.opencode/` del proyecto anfitrión. Si actualizas una instalación existente, elimina de `.opencode/agent/` los archivos `agente-coordinador.md`, `agente-codigo.md` y `agente-documentacion.md`. Ejecuta `npm install` en `.opencode/` y reinicia OpenCode. Si ya existe `.opencode/opencode.json`, conserva sus opciones y añade `"subagent_depth": 4` para permitir la delegación. Si vas a investigar código, instala Codegraph e indexa el workspace; para convertir otros formatos documentales, prepara `markitdown`.

Copia `agent-settings.example.json` como `.opencode/agent-settings.json` y configura `proyecto.repositorio` (ruta absoluta del workspace) y/o `proyecto.carpetasDocumentales` (rutas absolutas) según las fuentes de tu consulta. Puedes dejar los valores vacíos para que `pregunta` solicite solo los imprescindibles y guarde los que confirmes. Las claves existentes `agentes.coordinador`, `agentes.codigo` y `agentes.documentacion` siguen configurando la skill y ambos lectores, respectivamente. `especialistasPermitidos` restringe las delegaciones; `guardarEntregablesEnSesion` permite desactivar el guardado para cada componente. La carpeta de sesiones se configura con `sesiones.carpetaRaiz`, relativa a la raíz del proyecto anfitrión (por defecto `informes-agente/sesiones/`). Ignora `agent-settings.json` y `informes-agente/` en el Git del anfitrión si no quieres versionar los datos locales.

## Uso

Desde el agente principal de OpenCode, invoca la skill `pregunta` con tu pregunta y las fuentes disponibles. La skill pide el contexto que falte, delega en `lector-codigo` y/o `lector-docs` y devuelve una respuesta con evidencias y límites. Publica `resumen-ejecutivo.md` e `informe-detallado.md` juntos en una carpeta de consulta; cada lector puede guardar su investigación. También puedes invocar a los lectores por separado. Los informes se organizan por sesión con `indice.md`; si el guardado está desactivado, las respuestas siguen apareciendo en conversación.

Para ejecutar las comprobaciones del paquete: `npm test` (Node.js 24 o posterior).
