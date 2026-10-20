import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { context, editJSONC, existing, install, parseJSONC, preflight, source, stringify } from "./setup-shared.mjs"

const { host, settingsPath, settingsText } = await context(".opencode")
const runtime = join(host, ".opencode")
const candidates = [join(host, "opencode.json"), join(host, "opencode.jsonc"), join(runtime, "opencode.json"), join(runtime, "opencode.jsonc")]
const found = []
for (const path of candidates) if (await existing(path) !== undefined) found.push(path)
if (found.length > 1) throw new Error(`Hay varias configuraciones nativas; elige/resuelve la activa antes de instalar: ${found.join(", ")}`)
const configPath = found[0] ?? join(runtime, "opencode.json")
const before = await existing(configPath)
const config = parseJSONC(before ?? "{}", configPath)
if (config.agent !== undefined && (!config.agent || typeof config.agent !== "object" || Array.isArray(config.agent))) throw new Error("agent debe ser un objeto")
if (config.agent?.explore !== undefined && (!config.agent.explore || typeof config.agent.explore !== "object" || Array.isArray(config.agent.explore))) throw new Error("explore debe ser un objeto")
const permissions = JSON.parse(await readFile(join(source, "opencode.json"), "utf8")).agent.explore.permission
const changes = []
if (!config.$schema) changes.push([["$schema"], "https://opencode.ai/config.json"])
if (process.env.RESEARCH_READER_PERMISSIONS === "1") changes.push([["agent", "explore", "permission"], permissions])

const packagePath = join(runtime, "package.json")
const pkg = JSON.parse(await existing(packagePath) ?? "{}")
if (!pkg || Array.isArray(pkg) || typeof pkg !== "object") throw new Error("package.json debe ser un objeto")
if (pkg.type && pkg.type !== "module") throw new Error("El runtime requiere type: module; conserva y adapta el package.json existente antes de instalar")
if (pkg.dependencies !== undefined && (!pkg.dependencies || typeof pkg.dependencies !== "object" || Array.isArray(pkg.dependencies))) throw new Error("dependencies debe ser un objeto")
const available = JSON.parse(await readFile(join(source, "package.json"), "utf8")).dependencies
pkg.type = "module"
pkg.dependencies = { ...Object.fromEntries(["@opencode-ai/plugin", "zod", "jsonc-parser"].map((name) => [name, available[name]])), ...pkg.dependencies }
const files = new Map([[packagePath, stringify(pkg)]])
for (const path of ["plugin/research.ts", "lib/research.ts", "lib/settings-path.mjs"]) files.set(join(runtime, path), await readFile(join(source, path), "utf8"))
await preflight(new Map([...files, [settingsPath, settingsText], [configPath, before]]))
const legacy = []
for (const path of ["plugin/agent-session.ts", "plugin/markitdown-utf8.ts"])
  if (await existing(join(runtime, path)) !== undefined) legacy.push(join(runtime, path))
await install(runtime, files, async ({ save, parser, library }) => {
  const edited = editJSONC(before, changes, parser)
  await save(settingsPath, settingsText)
  await library.readSettings(settingsPath)
  await save(configPath, edited)
})
console.log(`\nRuntime preparado. Ajustes: ${settingsPath}.\nSe conservan los archivos heredados y los permisos compartidos existentes. Reinicia OpenCode para comprobar las herramientas.\nPendiente de comprobación independiente: Codegraph/índice, documentos, acceso al board, subagentes y guardado.`)
if (legacy.length) console.log(`PENDIENTE: revisa los plugins heredados antes de cargar el runtime; su desactivación debe elegirse expresamente:\n${legacy.join("\n")}`)
