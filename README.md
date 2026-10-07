# Skills de investigación asistida

Responde preguntas sobre código, documentación e issues de Jira, Azure DevOps o GitHub, citando las fuentes.

- **`/pregunta`**: coordina la investigación y contrasta código y documentación.
- **`/lee-codigo`**: investiga el código con Codegraph.
- **`/lee-docs`**: consulta documentos locales o en un board.

La salida se guardan por defecto en informes-investigacion/sesiones/

## Requisitos

[APM](https://microsoft.github.io/apm/getting-started/installation/), Node.js ≥ 24, Git y OpenCode o GitHub Copilot (VS Code o CLI).

Para investigar código en local, instala [Codegraph](https://github.com/colbymchenry/codegraph#quick-start) e [indexa el proyecto](https://github.com/colbymchenry/codegraph#3-initialize-projects).

Para leer documentos, recomendado instalar [MarkItDown](https://github.com/microsoft/markitdown#installation). Los boards privados requieren un conector MCP configurado.

## Instalar y actualizar

Ejecuta los comandos desde la **raíz del proyecto que quieras investigar**.

### OpenCode

```sh
node apm_modules/pablotecat/ai-assisted-research/scripts/setup-opencode.mjs
```
```sh
node apm_modules/pablotecat/ai-assisted-research/scripts/setup-opencode.mjs
```

**Actualizar:** ejecuta `apm update --yes --target opencode` y repite el comando `node` anterior. Reinicia OpenCode e invoca la skill `pregunta`.

### VS Code / GitHub Copilot

```sh
apm install pablotecat/ai-assisted-research --target copilot
```
```sh
node apm_modules/pablotecat/ai-assisted-research/scripts/setup-copilot.mjs
```
**Actualizar:** ejecuta `apm update --yes --target copilot` y repite el comando `node` anterior.

## Ejemplo de uso

```text
/pregunta ¿Qué usuarios reciben notificaciones al crear un documento?
/lee-docs confirma que esta historia no tiene dependenacias documentales.
/lee-codigo ¿quién está habilitado para editar fichas de acceso?
```

Si faltan fuentes, el agente que usa `/pregunta` te las pedirá. Puedes solicitar solo código o solo documentación.
