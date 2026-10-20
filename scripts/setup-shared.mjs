import { lstat, mkdir, readFile, realpath, writeFile } from "node:fs/promises"
import { spawnSync } from "node:child_process"
import { createRequire } from "node:module"
import { dirname, isAbsolute, join, resolve } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { resolveSettingsPath } from "../lib/settings-path.mjs"

export const source = resolve(dirname(fileURLToPath(import.meta.url)), "..")
export const stringify = (value) => JSON.stringify(value, null, 2) + "\n"

export async function existing(path) {
  for (let parent = dirname(path); ; parent = dirname(parent)) {
    const stat = await lstat(parent).catch((error) => { if (error.code !== "ENOENT") throw error })
    if (stat && (!stat.isDirectory() || stat.isSymbolicLink())) throw new Error(`Directorio de instalación no seguro: ${parent}`)
    if (dirname(parent) === parent) break
  }
  const stat = await lstat(path).catch((error) => { if (error.code !== "ENOENT") throw error })
  if (!stat) return undefined
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`Archivo de instalación no seguro: ${path}`)
  return readFile(path, "utf8")
}

// Preflight sin dependencias: preserva cadenas al retirar comentarios y comas finales.
export function parseJSONC(text, path) {
  const stripped = text.replace(/"(?:\\.|[^"\\])*"|\/\*[\s\S]*?\*\/|\/\/[^\r\n]*/g, (token) => token.startsWith('"') ? token : " ")
    .replace(/"(?:\\.|[^"\\])*"|,\s*[}\]]/g, (token) => token.startsWith('"') ? token : token.slice(1))
  const value = JSON.parse(stripped)
  if (!value || Array.isArray(value) || typeof value !== "object") throw new Error(`Configuración JSON/JSONC inválida: ${path}`)
  return value
}

// Validación previa a instalar dependencias. El runtime repite la validación con su esquema.
function validateSettings(value, defaults) {
  function shape(actual, model, path = "ajustes") {
    if (!actual || typeof actual !== "object" || Array.isArray(actual)) throw new Error(`Objeto requerido: ${path}`)
    for (const key of Object.keys(actual)) if (!Object.hasOwn(model, key)) throw new Error(`Campo desconocido: ${path}.${key}`)
    for (const [key, sample] of Object.entries(model)) {
      const field = actual[key]
      if (field === undefined && (key === "modoLectura" || key === "proveedor")) continue
      if (Array.isArray(sample)) { if (!Array.isArray(field)) throw new Error(`Lista requerida: ${path}.${key}`) }
      else if (sample && typeof sample === "object") shape(field, sample, `${path}.${key}`)
      else if (typeof field !== typeof sample) throw new Error(`Tipo inválido: ${path}.${key}`)
    }
  }
  shape(value, defaults)
  const { repositorio, carpetasDocumentales, board } = value.proyecto
  if ((repositorio && !isAbsolute(repositorio)) || carpetasDocumentales.some((p) => typeof p !== "string" || !p.trim() || !isAbsolute(p))) throw new Error("Rutas locales absolutas requeridas")
  if ((board.proveedor && !board.url) || (board.url && new URL(board.url).protocol !== "https:")) throw new Error("URL HTTPS del board requerida")
  const coordinator = value.skills["necesito-saber"]
  const readers = coordinator.especialistasPermitidos
  if (!readers.length || readers.length > 2 || new Set(readers).size !== readers.length || readers.some((v) => !["codigo", "documentacion"].includes(v))) throw new Error("Especialistas inválidos")
  if (!Number.isInteger(coordinator.maxRepreguntasEspecialistas) || coordinator.maxRepreguntasEspecialistas < 0 || (coordinator.modoLectura !== undefined && !["auto", "paralelo", "secuencial"].includes(coordinator.modoLectura))) throw new Error("Preferencias inválidas")
  const output = value.sesiones.carpetaRaiz.trim()
  if (!output || isAbsolute(output) || output.includes(":") || output.split(/[\\/]/).some((v) => !v || v === "." || v === "..")) throw new Error("Carpeta de salida relativa dentro del proyecto requerida")
  return value
}

export async function context(native) {
  if (Number(process.versions.node.split(".")[0]) < 24) throw new Error("Se requiere Node.js 24 o posterior")
  if (process.argv.length > 2) throw new Error("Este instalador no recibe argumentos; elige ajustes con RESEARCH_SETTINGS_PATH y permisos mediante RESEARCH_READER_PERMISSIONS=1")
  const host = await realpath(process.cwd())
  if (host === await realpath(source)) throw new Error("El proyecto anfitrión debe ser distinto del repositorio de desarrollo")
  const nativePath = join(host, native, "research-settings.json")
  const selected = await resolveSettingsPath(host, nativePath, process.env.RESEARCH_SETTINGS_PATH)
  const settingsPath = process.env.RESEARCH_SETTINGS_PATH || await existing(selected) !== undefined ? selected : nativePath
  const defaults = JSON.parse(await readFile(join(source, "research-settings.example.json"), "utf8"))
  let before = await existing(settingsPath)
  let settings = before === undefined ? defaults : JSON.parse(before)
  if (before === undefined && native === ".opencode") {
    const old = JSON.parse(await existing(join(host, native, "agent-settings.json")) ?? "{}")
    if (old.agentes) settings = { proyecto: { ...defaults.proyecto, ...old.proyecto }, skills: {
      "necesito-saber": old.agentes.coordinador, "lee-codigo": old.agentes.codigo, "lee-docs": old.agentes.documentacion,
    }, sesiones: old.sesiones }
  }
  if (settings.skills?.pregunta && !settings.skills["necesito-saber"]) {
    settings.skills["necesito-saber"] = settings.skills.pregunta
    delete settings.skills.pregunta
    before = undefined
  }
  validateSettings(settings, defaults)
  return { host, settingsPath, settingsText: before ?? stringify(settings) }
}

export async function preflight(files) {
  for (const path of files.keys()) await existing(path)
}

export async function install(runtime, files, finish) {
  const applied = []
  let dependencies = "No iniciadas"
  async function save(path, text) {
    if (await existing(path) === text) return
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, text)
    applied.push(path)
  }
  try {
    for (const [path, text] of files) await save(path, text)
    const args = ["install", "--ignore-scripts", "--no-audit", "--no-fund"]
    dependencies = "Instalación de npm iniciada; puede haber cambios parciales en dependencias o lockfile"
    const result = process.platform === "win32"
      ? spawnSync("cmd.exe", ["/d", "/s", "/c", `npm ${args.join(" ")}`], { cwd: runtime, stdio: "inherit" })
      : spawnSync("npm", args, { cwd: runtime, stdio: "inherit" })
    if (result.error || result.status !== 0) throw result.error ?? new Error("No se pudieron instalar dependencias; vuelve a ejecutar el instalador")
    dependencies = "Instalación de npm completada"
    const parser = createRequire(join(runtime, "package.json"))("jsonc-parser")
    const library = await import(pathToFileURL(join(runtime, "lib", "research.ts")).href)
    await finish({ save, parser, library })
  } catch (error) {
    throw new Error(`${error.message}\nAplicado antes del fallo:\n${applied.join("\n") || "Ningún archivo"}\nDependencias: ${dependencies}.\nPreparación pendiente: corrige el error y vuelve a ejecutar; se conservan ajustes y archivos ajenos.`, { cause: error })
  }
}

export function editJSONC(before, changes, parser) {
  let text = before ?? "{}\n"
  for (const [path, value] of changes) text = parser.applyEdits(text, parser.modify(text, path, value, { formattingOptions: { insertSpaces: true, tabSize: 2 } }))
  const errors = []
  parser.parse(text, errors, { allowTrailingComma: true })
  if (errors.length) throw new Error("Configuración JSONC inválida")
  return text
}
