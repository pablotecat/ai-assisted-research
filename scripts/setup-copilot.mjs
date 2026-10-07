import { lstat, mkdir, readFile, realpath, writeFile } from "node:fs/promises"
import { spawnSync } from "node:child_process"
import { createRequire } from "node:module"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

if (Number(process.versions.node.split(".")[0]) < 24) throw new Error("Se requiere Node.js 24 o posterior")
const source = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const host = await realpath(process.cwd())
if (host === await realpath(source)) throw new Error("El proyecto anfitrión debe ser distinto de este repositorio; no se instala en el proyecto de desarrollo")
const runtime = join(host, ".github", "research")

async function safeDirectory(path) {
  const parent = dirname(path)
  if (parent !== path) await safeDirectory(parent)
  try {
    const stat = await lstat(path)
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error(`Directorio de instalación no seguro: ${path}`)
  } catch (error) {
    if (error.code !== "ENOENT") throw error
    await mkdir(path)
  }
}

async function existing(path) {
  try {
    const stat = await lstat(path)
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`Archivo de instalación no seguro: ${path}`)
    return await readFile(path, "utf8")
  } catch (error) {
    if (error.code !== "ENOENT") throw error
    return undefined
  }
}

async function save(path, content) {
  await safeDirectory(dirname(path))
  await existing(path)
  await writeFile(path, content)
}

await safeDirectory(runtime)
for (const [origin, destination] of [["lib/research.ts", "lib/research.ts"], ["copilot/server.ts", "copilot/server.ts"]]) {
  await save(join(runtime, destination), await readFile(join(source, origin), "utf8"))
}
const dependencies = JSON.parse(await readFile(join(source, "package.json"), "utf8")).dependencies
const runtimePackage = {
  private: true, type: "module", dependencies: Object.fromEntries(
    ["@modelcontextprotocol/sdk", "zod", "jsonc-parser"].map((name) => [name, dependencies[name]])),
}
await save(join(runtime, "package.json"), JSON.stringify(runtimePackage, null, 2) + "\n")
const install = process.platform === "win32"
  ? spawnSync("cmd.exe", ["/d", "/s", "/c", "npm install --ignore-scripts --no-audit --no-fund"], { cwd: runtime, stdio: "inherit" })
  : spawnSync("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund"], { cwd: runtime, stdio: "inherit" })
if (install.error || install.status !== 0) throw install.error ?? new Error("No se pudieron instalar las dependencias Copilot")
const { parse, modify, applyEdits } = createRequire(join(runtime, "package.json"))("jsonc-parser")

async function mergeJSON(path, key, value) {
  const before = await existing(path) ?? "{}\n"
  const errors = []
  const parsed = parse(before, errors, { allowTrailingComma: true })
  if (errors.length || !parsed || Array.isArray(parsed) || typeof parsed !== "object")
    throw new Error(`Configuración JSON/JSONC inválida; no se sobrescribe: ${path}`)
  const previous = parsed[key[0]]?.[key[1]]
  if (previous && previous.args?.[0] !== value.args[0])
    throw new Error(`Existe un servidor MCP ajeno llamado ${key[1]}; no se sobrescribe: ${path}`)
  const text = applyEdits(before, modify(before, key, { ...previous, ...value }, { formattingOptions: { insertSpaces: true, tabSize: 2 } }))
  await save(path, text)
}

const settingsPath = join(host, ".github", "research-settings.json")
if (await existing(settingsPath) === undefined)
  await save(settingsPath, await readFile(join(source, "research-settings.example.json"), "utf8"))
await (await import(pathToFileURL(join(runtime, "lib", "research.ts")).href)).readSettings(settingsPath)

const vscodeConfig = join(host, ".vscode", "mcp.json")
const cliConfig = join(runtime, "mcp-config.json")
for (const [name, role] of [["research-control", "control"], ["research-code", "codigo"], ["research-docs", "documentacion"]]) {
  const common = { command: process.execPath, args: [join(runtime, "copilot", "server.ts"), "--workspace", host, "--role", role] }
  await mergeJSON(vscodeConfig, ["servers", name], { type: "stdio", ...common })
  await mergeJSON(cliConfig, ["mcpServers", name], { type: "local", ...common, tools: ["*"] })
}

console.log(`\nRuntime de las skills preparado en ${host}.\nAjustes: ${settingsPath}\nAPM instala las skills; este script no crea agentes ni copia skills.\nRecarga Copilot e invoca pregunta desde tu agente principal.\nCLI: copilot --additional-mcp-config '@.github/research/mcp-config.json'`)