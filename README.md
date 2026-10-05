# Investigación asistida por agentes

Versión ligera del flujo de planificación: responde dudas del día a día sobre código y documentación local, sin refinar historias ni generar planes.

| Componente | Función |
|---|---|
| Skill `pregunta` | Recoge el alcance, consulta especialistas y contrasta sus evidencias desde el agente principal. |
| Agente `lector-codigo` | Investiga el workspace indexado con Codegraph. |
| Agente `lector-docs` | Examina documentos locales y cita las fuentes. |

## Instalación en OpenCode

Necesitas [OpenCode](https://opencode.ai/docs/), [APM](https://microsoft.github.io/apm/getting-started/installation/), [Node.js 24 o posterior](https://nodejs.org/en/download) y [Git](https://git-scm.com/downloads) (APM lo utiliza para descargar paquetes). Abre una terminal en la **carpeta raíz del proyecto** donde usarás los agentes, no en `.opencode/`, y ejecuta:

```sh
apm install pablotecat/ai-assisted-research --target opencode
node apm_modules/pablotecat/ai-assisted-research/scripts/setup-opencode.mjs
```

APM instala los agentes y la skill. El segundo comando configura los plugins, herramientas y dependencias npm para OpenCode; no necesitas descargar este repositorio. Después abre o reinicia OpenCode en esa misma carpeta e invoca la skill `pregunta` desde el agente principal.

**Actualizar:** desde la misma carpeta, ejecuta:

```sh
apm update --yes --target opencode
node apm_modules/pablotecat/ai-assisted-research/scripts/setup-opencode.mjs
```

Si antes instalaste copiando archivos manualmente, elimina `lector-codigo.md`, `lector-docs.md`, `agente-coordinador.md`, `agente-codigo.md` y `agente-documentacion.md` de `.opencode/agent/` y `pregunta/` de `.opencode/skill/` tras instalar con APM, para evitar duplicados. Conserva `.opencode/agent-settings.json`: el instalador no sobrescribe tus ajustes.

Configura allí `proyecto.repositorio` (ruta absoluta del workspace) y/o `proyecto.carpetasDocumentales` (rutas absolutas) según las fuentes de tu consulta. Puedes dejar los valores vacíos para que `pregunta` solicite solo los imprescindibles y guarde los que confirmes. Las claves existentes `agentes.coordinador`, `agentes.codigo` y `agentes.documentacion` siguen configurando la skill y ambos lectores, respectivamente. `especialistasPermitidos` restringe las delegaciones; `guardarEntregablesEnSesion` permite desactivar el guardado para cada componente. La carpeta de sesiones se configura con `sesiones.carpetaRaiz`, relativa a la raíz del proyecto anfitrión (por defecto `informes-agente/sesiones/`). Ignora `agent-settings.json` y `informes-agente/` en el Git del anfitrión si no quieres versionar los datos locales.

Para consultas de código, instala Codegraph e indexa el proyecto. Para convertir otros formatos de documentos, instala MarkItDown.

## Uso

Desde el agente principal de OpenCode, invoca la skill `pregunta` con tu pregunta y las fuentes disponibles. La skill pide el contexto que falte, delega en `lector-codigo` y/o `lector-docs` y devuelve una respuesta con evidencias y límites. Publica `resumen-ejecutivo.md` e `informe-detallado.md` juntos en una carpeta de consulta; cada lector puede guardar su investigación. También puedes invocar a los lectores por separado. Los informes se organizan por sesión con `indice.md`; si el guardado está desactivado, las respuestas siguen apareciendo en conversación.

Para ejecutar las comprobaciones del paquete: `npm test` (Node.js 24 o posterior).
