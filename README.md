# Skills de investigación asistida

Responde preguntas sobre código, documentación e issues de Jira, Azure DevOps o GitHub, citando las fuentes.

- **`pregunta`**: coordina la investigación y contrasta código y documentación.
- **`lee-codigo`**: investiga el código con Codegraph.
- **`lee-docs`**: consulta documentos locales e issues.

## Requisitos

[APM](https://microsoft.github.io/apm/getting-started/installation/), Node.js ≥ 24, Git y OpenCode o GitHub Copilot (VS Code o CLI).
Para investigar código, instala Codegraph e indexa el proyecto; para convertir documentos, instala MarkItDown. Los boards privados requieren un conector MCP configurado.

## Instalar y actualizar

Ejecuta los comandos desde la **raíz del proyecto que quieras investigar**, distinto del repositorio de este paquete.

### OpenCode

```sh
apm install pablotecat/ai-assisted-research --target opencode
node apm_modules/pablotecat/ai-assisted-research/scripts/setup-opencode.mjs
```

**Actualizar:** ejecuta `apm update --yes --target opencode` y repite el comando `node` anterior. Reinicia OpenCode e invoca la skill `pregunta`.

### GitHub Copilot

```sh
apm install pablotecat/ai-assisted-research --target copilot
node apm_modules/pablotecat/ai-assisted-research/scripts/setup-copilot.mjs
```

**Actualizar:** ejecuta `apm update --yes --target copilot` y repite el comando `node` anterior.

- **VS Code:** recarga la ventana, inicia los servidores de `.vscode/mcp.json`, acepta su confianza e invoca `/pregunta`.
- **CLI:** inicia con `copilot --additional-mcp-config '@.github/research/mcp-config.json'`.

## Ejemplo de uso

```text
Usa la skill pregunta para explicar cómo funciona la autenticación.
Consulta el código del proyecto y la documentación de C:/docs/producto.
Cita las fuentes y señala discrepancias entre código y documentación.
```

Si faltan fuentes, `pregunta` te las pedirá. Puedes solicitar solo código o solo documentación.
