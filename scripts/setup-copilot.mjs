import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { context, editJSONC, existing, install, parseJSONC, preflight, source, stringify } from "./setup-shared.mjs"

const { host, settingsPath, settingsText } = await context(".github")
const runtime = join(host, ".github", "research")
const entry = join(runtime, "copilot", "server.ts")
const configs = []
for (const [path, key, type] of [[join(host, ".vscode", "mcp.json"), "servers", "stdio"], [join(runtime, "mcp-config.json"), "mcpServers", "local"]]) {
  const before = await existing(path)
  const config = parseJSONC(before ?? "{}", path)
  if (config[key] !== undefined && (!config[key] || typeof config[key] !== "object" || Array.isArray(config[key]))) throw new Error(`${key} debe ser un objeto: ${path}`)
  const changes = []
  for (const [name, role] of [["research-control", "control"], ["research-code", "codigo"], ["research-docs", "documentacion"]]) {
    const previous = config[key]?.[name]
    if (previous && previous.args?.[0] !== entry) throw new Error(`Existe un servidor MCP ajeno llamado ${name}; no se sobrescribe: ${path}`)
    const value = { ...previous, type, command: process.execPath, args: [entry, "--workspace", host, "--role", role],
      env: { ...previous?.env, RESEARCH_SETTINGS_PATH: settingsPath }, ...(type === "local" ? { tools: previous?.tools ?? ["*"] } : {}) }
    changes.push([[key, name], value])
  }
  configs.push({ path, before, changes })
}
const packagePath = join(runtime, "package.json")
const pkg = JSON.parse(await existing(packagePath) ?? "{}")
if (!pkg || Array.isArray(pkg) || typeof pkg !== "object") throw new Error("package.json debe ser un objeto")
if (pkg.type && pkg.type !== "module") throw new Error("El runtime requiere type: module")
if (pkg.dependencies !== undefined && (!pkg.dependencies || typeof pkg.dependencies !== "object" || Array.isArray(pkg.dependencies))) throw new Error("dependencies debe ser un objeto")
const available = JSON.parse(await readFile(join(source, "package.json"), "utf8")).dependencies
pkg.private = true
pkg.type = "module"
pkg.dependencies = { ...Object.fromEntries(["@modelcontextprotocol/sdk", "zod", "jsonc-parser"].map((name) => [name, available[name]])), ...pkg.dependencies }
const files = new Map([[packagePath, stringify(pkg)]])
for (const path of ["lib/research.ts", "lib/settings-path.mjs", "copilot/server.ts"]) files.set(join(runtime, path), await readFile(join(source, path), "utf8"))
await preflight(new Map([...files, [settingsPath, settingsText], ...configs.map(({ path, before }) => [path, before])]))
await install(runtime, files, async ({ save, parser, library }) => {
  const edited = configs.map((config) => ({ path: config.path, text: editJSONC(config.before, config.changes, parser) }))
  await save(settingsPath, settingsText)
  await library.readSettings(settingsPath)
  for (const { path, text } of edited) await save(path, text)
})
console.log(`\nRuntime preparado en ${host}. Ajustes: ${settingsPath}.\nRecarga Copilot para comprobar las herramientas. APM distribuye las skills; este script no crea agentes.\nCLI: copilot --additional-mcp-config '@.github/research/mcp-config.json'\nPendiente de comprobación independiente: Codegraph/índice, documentos, acceso al board, subagentes y guardado.`)
