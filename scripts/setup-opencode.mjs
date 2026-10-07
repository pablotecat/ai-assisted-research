import { cp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises"
import { spawnSync } from "node:child_process"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const source = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const host = process.cwd()
if (host === source) throw new Error("El proyecto anfitrión debe ser distinto de este repositorio")

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, stdio: "inherit" })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`${command} terminó con código ${result.status}`)
}

async function json(path) {
  try { return JSON.parse(await readFile(path, "utf8")) }
  catch (error) { if (error.code === "ENOENT") return {}; throw error }
}

const configDir = join(host, ".opencode")
await mkdir(configDir, { recursive: true })
for (const dir of ["plugin", "lib"]) {
  await mkdir(join(configDir, dir), { recursive: true })
  await cp(join(source, dir, "research.ts"), join(configDir, dir, "research.ts"))
}
const settingsPath = join(configDir, "research-settings.json")
const defaults = await json(join(source, "research-settings.example.json"))
if (!(await stat(settingsPath).then(() => true, (e) => { if (e.code === "ENOENT") return false; throw e }))) {
  const old = await json(join(configDir, "agent-settings.json"))
  const settings = old.agentes ? {
    proyecto: { ...defaults.proyecto, ...old.proyecto },
    skills: { pregunta: old.agentes.coordinador, "lee-codigo": old.agentes.codigo, "lee-docs": old.agentes.documentacion },
    sesiones: old.sesiones,
  } : defaults
  await writeFile(settingsPath, JSON.stringify(settings, null, 2) + "\n", { flag: "wx" })
}

const packagePath = join(configDir, "package.json")
const packageConfig = await json(packagePath)
const available = (await json(join(source, "package.json"))).dependencies
const dependency = Object.fromEntries(["@opencode-ai/plugin", "zod"].map((name) => [name, available[name]]))
packageConfig.type ??= "module"
packageConfig.dependencies = { ...dependency, ...packageConfig.dependencies }
await writeFile(packagePath, JSON.stringify(packageConfig, null, 2) + "\n")

const rootConfig = join(host, "opencode.json")
const localConfig = join(configDir, "opencode.json")
const configPath = await stat(rootConfig).then(() => rootConfig, (e) => { if (e.code === "ENOENT") return localConfig; throw e })
const config = await json(configPath)
config.$schema ??= "https://opencode.ai/config.json"
const reader = (await json(join(source, "opencode.json"))).agent.explore.permission
config.agent ??= {}
config.agent.explore ??= {}
const existing = config.agent.explore.permission
const overrides = existing && typeof existing === "object" ? existing : {}
config.agent.explore.permission = {
  ...reader,
  ...Object.fromEntries(Object.entries(overrides).filter(([name]) => !["agent_settings", "publish_agent_deliverable"].includes(name) && (!(name in reader) || ["read", "glob", "grep", "list", "webfetch", "websearch", "external_directory"].includes(name)))),
  skill: { ...reader.skill, ...(typeof overrides.skill === "object" ? overrides.skill : {}), "lee-codigo": "allow", "lee-docs": "allow" },
}
await writeFile(configPath, JSON.stringify(config, null, 2) + "\n")

if (process.platform === "win32") run("cmd.exe", ["/d", "/s", "/c", "npm install"], configDir)
else run("npm", ["install"], configDir)
await (await import(pathToFileURL(join(configDir, "lib", "research.ts")).href)).readSettings(settingsPath)

// Solo se retiran nombres que este paquete desplegaba; los demás archivos del anfitrión se conservan.
for (const file of ["plugin/agent-session.ts", "plugin/markitdown-utf8.ts", "tools/agent_settings.ts", "tools/coordinator_defaults.ts", "tools/publish_agent_deliverable.ts", "tools/write_report_pair.ts", "tools/session_store.ts", "agent-settings.example.json", "agent-settings.json"]) {
  await rm(join(configDir, file), { force: true })
}
for (const dir of ["agent", "agents"]) {
  for (const name of ["lector-codigo", "lector-docs", "agente-coordinador", "agente-codigo", "agente-documentacion"]) {
    await rm(join(configDir, dir, `${name}.md`), { force: true })
  }
}

console.log(`\nInstalación terminada. Reinicia OpenCode en ${host}. Ajustes: ${settingsPath}.`)
