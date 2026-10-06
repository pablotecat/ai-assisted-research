# Skills de investigación asistida

Resuelve preguntas sobre código, documentación local e issues de Jira, Azure DevOps o GitHub, con evidencias y límites de cobertura.

| Componente | Función |
|---|---|
| Skill `pregunta` | Recoge el alcance, delega la lectura y contrasta evidencias desde el agente principal. |
| Skill `lee-codigo` | Investiga el workspace indexado con Codegraph y cita el código. |
| Skill `lee-docs` | Investiga documentos locales e issues de Jira, Azure DevOps o GitHub y cita las fuentes. |
| `explore` del harness | Ejecuta cada skill lectora en una sesión distinta, sin delegaciones anidadas. |

```text
agente principal + pregunta
  ├─ explore + lee-codigo ── Codegraph/Git ── informe de código
  └─ explore + lee-docs   ── documentos/board ── informe documental
          ↓
  contraste, respuesta y publicación de informes
```

## Instalación en OpenCode

Necesitas [OpenCode](https://opencode.ai/docs/), [APM](https://microsoft.github.io/apm/getting-started/installation/), [Node.js 24 o posterior](https://nodejs.org/en/download) y [Git](https://git-scm.com/downloads). Desde la **raíz del proyecto anfitrión**, ejecuta:

```sh
apm install pablotecat/ai-assisted-research --target opencode
node apm_modules/pablotecat/ai-assisted-research/scripts/setup-opencode.mjs
```

APM instala las tres skills. El segundo comando instala un plugin, su módulo de persistencia y la dependencia npm, configura los permisos de `explore` y crea `.opencode/research-settings.json`. Reinicia OpenCode en esa carpeta e invoca `pregunta` desde el agente principal.

**Actualizar:** desde la misma carpeta, ejecuta:

```sh
apm update --yes --target opencode
node apm_modules/pablotecat/ai-assisted-research/scripts/setup-opencode.mjs
```

El instalador migra `agent-settings.json` al formato por skills, conserva fuentes, opciones de guardado y carpeta de sesiones, y retira los agentes, plugins y tools sustituidos. En sucesivas ejecuciones conserva `research-settings.json`. Si instalaste `pregunta/` manualmente en `.opencode/skill/`, elimina esa copia después de instalar con APM para evitar duplicados.

## Ajustes y fuentes

En `.opencode/research-settings.json`, configura `proyecto.repositorio` y `carpetasDocumentales` con rutas absolutas, `referencia` si importa una versión concreta, y/o `board` con proveedor (`jira`, `azdo`, `github`) y URL HTTPS del proyecto/board o repositorio. Puedes dejar las fuentes vacías: `pregunta` pide las imprescindibles y guarda las que confirmes. Un board puede sustituir o complementar las carpetas documentales.

`skills.pregunta` controla especialistas permitidos, límite de repreguntas y guardado de la consulta. `skills.lee-codigo` y `skills.lee-docs` controlan el guardado de sus informes. `sesiones.carpetaRaiz` es relativa al proyecto anfitrión; por defecto, `informes-investigacion/sesiones/`. Ignora los ajustes locales y esa carpeta en el Git del anfitrión si no quieres versionarlos.

El plugin identifica la skill cargada: `lee-codigo` consulta Codegraph/Git y publica solo su informe; `lee-docs` lee archivos, consulta la web y convierte documentos con MarkItDown a salida estándar. Ambas mantienen intactas las fuentes. Para boards privados, habilita en los permisos de `explore` de `opencode.json` las herramientas MCP de consulta del proveedor; están denegadas por defecto. Los conectores y credenciales se configuran en el anfitrión. Para GitHub Issues públicos puede bastar la web.

Para consultas de código, instala Codegraph e indexa el proyecto. Para convertir otros formatos de documentos, instala MarkItDown.

## Uso

Invoca `pregunta` con tu consulta y fuentes. Por defecto usa ambos lectores en paralelo; puedes solicitar solo código o documentación. Recibirás la respuesta y los informes completos en conversación.

Con el guardado activo, publica `resumen-ejecutivo.md` e `informe-detallado.md` juntos y añade `investigacion-documentacion.md` si está habilitado. `lee-codigo` publica su propio `investigacion.md`. Las entregas se numeran por sesión y quedan enlazadas en `indice.md`.

Las tres skills de `.apm/skills/` también pueden utilizarse en otros harnesses con subagentes de lectura y herramientas para las fuentes correspondientes; la persistencia automática es la adaptación a OpenCode.

Para verificar el paquete: `npm install` y `npm test` (Node.js 24 o posterior).
