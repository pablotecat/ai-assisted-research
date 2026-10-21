import { createHash, randomUUID } from "node:crypto"
import { lstat, mkdir, readFile, realpath, rename, rm, writeFile } from "node:fs/promises"
import { basename, isAbsolute, join, relative, resolve, sep } from "node:path"
import { z } from "zod"
export { resolveSettingsPath } from "./settings-path.mjs"

const nonEmpty = z.string().trim().min(1)
const board = z.object({
  proveedor: z.string().trim().optional(),
  url: z.string().refine((s) => !s || (() => { try { return new URL(s).protocol === "https:" } catch { return false } })(), "URL HTTPS requerida"),
}).strict().refine((b) => !b.proveedor || Boolean(b.url), "Indica la URL del board")
export const projectSchema = z.object({
  repositorio: z.string().refine((s) => !s || isAbsolute(s)),
  referencia: z.string(),
  carpetasDocumentales: z.array(nonEmpty.refine(isAbsolute)),
  board,
}).strict()
const permitted = z.array(z.enum(["codigo", "documentacion"]))
  .min(1).max(2).refine((v) => new Set(v).size === v.length, "Especialistas repetidos")
const saved = z.object({ guardarEntregablesEnSesion: z.boolean() }).strict()
export const settingsSchema = z.object({
  proyecto: projectSchema,
  skills: z.object({
    "investiga": saved.extend({ maxRepreguntasEspecialistas: z.number().int().min(0), especialistasPermitidos: permitted, modoLectura: z.enum(["auto", "paralelo", "secuencial"]).optional() }),
    "lee-codigo": saved,
    "lee-docs": saved,
  }).strict(),
  sesiones: z.object({ carpetaRaiz: nonEmpty.refine((s) => !isAbsolute(s) && !s.includes(":") && s.split(/[\\/]/).every((part) => part && part !== ".." && part !== "."), "Ruta relativa dentro del proyecto") }).strict(),
}).strict()
export type ResearchSettings = ReturnType<typeof settingsSchema.parse>

export const settingsPatchSchema = z.object({
  proyecto: projectSchema.partial().extend({ board: z.object(board.shape).partial().strict().optional() }).strict().optional(),
  skills: z.object({
    "investiga": settingsSchema.shape.skills.shape["investiga"].partial().optional(),
    "lee-codigo": saved.partial().optional(),
    "lee-docs": saved.partial().optional(),
  }).strict().optional(),
  sesiones: settingsSchema.shape.sesiones.partial().optional(),
}).strict()

export async function readSettings(path: string): Promise<ResearchSettings> {
  return settingsSchema.parse(JSON.parse(await readFile(path, "utf8")))
}

export async function configureSettings(values: z.infer<typeof settingsPatchSchema>, path: string) {
  const patch = settingsPatchSchema.parse(values)
  return locked(`${path}.lock`, async () => {
    const current = await readSettings(path)
    const skills = { ...current.skills }
    for (const name of Object.keys(skills) as (keyof typeof skills)[])
      Object.assign(skills, { [name]: { ...skills[name], ...patch.skills?.[name] } })
    const next = settingsSchema.parse({ ...current,
      proyecto: { ...current.proyecto, ...patch.proyecto, board: { ...current.proyecto.board, ...patch.proyecto?.board } },
      skills, sesiones: { ...current.sesiones, ...patch.sesiones },
    })
    if (JSON.stringify(current) !== JSON.stringify(await readSettings(path))) throw new Error("La configuración cambió durante el guardado")
    await saveJson(path, next)
    return readSettings(path)
  })
}

export async function saveMissingProject(values: Partial<ResearchSettings["proyecto"]>, path: string) {
  const proposed = projectSchema.partial().strict().parse(values)
  return locked(`${path}.lock`, async () => {
    const current = await readSettings(path)
    const missing = Object.fromEntries(Object.entries(proposed).filter(([key]) => {
      const value = current.proyecto[key as keyof typeof current.proyecto]
      return !value || (Array.isArray(value) && !value.length) || (key === "board" && !current.proyecto.board.url)
    }))
    if (!Object.keys(missing).length) return current
    const next = settingsSchema.parse({ ...current, proyecto: { ...current.proyecto, ...missing } })
    const temp = `${path}.${randomUUID()}.tmp`
    try {
      await writeFile(temp, JSON.stringify(next, null, 2) + "\n", { flag: "wx" })
      if (JSON.stringify(current) !== JSON.stringify(await readSettings(path))) throw new Error("La configuración cambió durante el guardado")
      await replaceFile(temp, path)
    } finally { await rm(temp, { force: true }) }
    return next
  })
}

export type ReaderSkill = "lee-codigo" | "lee-docs"
export type Identity = { id: string; parentID?: string; agent: string; primary?: boolean; skill?: ReaderSkill; title: string; created: number; directory: string }
export type Resolver = (id: string, messageID?: string) => Promise<Identity>

type Role = "pregunta" | "codigo" | "documentacion"
function roleOf(node: Identity): Role | undefined {
  if (node.primary) return "pregunta"
  return node.skill === "lee-codigo" ? "codigo" : node.skill === "lee-docs" ? "documentacion" : undefined
}
const labels: Record<Role, string> = { pregunta: "investiga", codigo: "lee-codigo", documentacion: "lee-docs" }
type Entry = { parent?: string; agent: Role }
type Evento = { fecha: string; ruta: string; rol: Role }
type State = { root: string; entries: Record<string, Entry>; deliveries: string[]; sources: string[]; eventos: Evento[] }

function slug(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48).replace(/-$/g, "") || "consulta"
}
function safeName(name: string) {
  if (!/^[\p{L}\p{N}][\p{L}\p{N}_.-]*\.md$/u.test(name) || name.includes("..") || basename(name) !== name)
    throw new Error("Nombre de archivo no permitido")
  return name
}
async function directory(path: string) {
  const stat = await lstat(path)
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error("Carpeta de sesión no segura")
}
async function checkExistingAncestors(path: string) {
  let current = resolve(path)
  while (true) {
    try {
      if ((await lstat(current)).isSymbolicLink()) throw new Error("Ruta de sesiones enlazada fuera de la ubicación prevista")
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error
    }
    const parent = resolve(current, "..")
    if (parent === current) break
    current = parent
  }
}
function within(root: string, path: string) {
  const rel = relative(root, path)
  if (!rel || rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel)) throw new Error("Carpeta asignada fuera de la sesión")
}
function rootName(created: number, title: string) {
  const date = new Date(created)
  if (!Number.isFinite(date.getTime())) throw new Error("Fecha de sesión inválida")
  const stamp = date.toISOString().slice(0, 16).replace("T", "_").replace(":", "")
  return `${stamp}__consulta__${slug(title)}`
}
async function chain(id: string, messageID: string | undefined, get: Resolver) {
  const nodes: Identity[] = []
  const visited = new Set<string>()
  for (let current: string | undefined = id; current; ) {
    if (visited.has(current) || nodes.length > 2) throw new Error("Delegación cíclica o demasiado profunda")
    visited.add(current)
    const node = await get(current, current === id ? messageID : undefined)
    if (node.id !== current) throw new Error("No se pudo verificar la sesión")
    if (!roleOf(node) && nodes.length) break
    if (!roleOf(node)) throw new Error("No se pudo verificar el agente y su skill")
    if (nodes.length && nodes[0].directory !== node.directory) throw new Error("Proyecto de sesión distinto")
    nodes.push(node)
    current = node.parentID
  }
  nodes.reverse()
  for (let i = 1; i < nodes.length; i++) {
    if (roleOf(nodes[i]) === "pregunta" || roleOf(nodes[i - 1]) !== "pregunta")
      throw new Error("Delegación no autorizada")
  }
  return nodes
}

async function locked<T>(path: string, fn: () => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 100; attempt++) {
    try { await mkdir(path); break }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST" || attempt === 99) throw error
      await new Promise((done) => setTimeout(done, 50))
    }
  }
  try { return await fn() } finally { await rm(path, { recursive: true, force: true }) }
}

async function saveJson(path: string, value: unknown) {
  const temp = `${path}.${randomUUID()}.tmp`
  try {
    await writeFile(temp, JSON.stringify(value, null, 2) + "\n", { flag: "wx" })
    await replaceFile(temp, path)
  } finally { await rm(temp, { force: true }) }
}
async function replaceFile(source: string, destination: string) {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const existing = await lstat(destination).catch((error: NodeJS.ErrnoException) => {
        if (error.code !== "ENOENT") throw error
        return undefined
      })
      if (existing && !existing.isFile()) throw new Error("Destino no es un archivo regular")
      await rename(source, destination)
      return
    } catch (error) {
      if (!("EPERM EACCES EBUSY".split(" ").includes((error as NodeJS.ErrnoException).code ?? "")) || attempt === 4) throw error
      await new Promise((done) => setTimeout(done, 20 * (attempt + 1)))
    }
  }
}

export type Publication = { guardado: false } | { guardado: true; rutas: Record<string, string>; sesion: string }

const researchSchema = z.object({ id: z.string().uuid(), title: nonEmpty, created: z.number().int().nonnegative() }).strict()
type PublicationOptions = { get: Resolver; settingsPath: string }

async function readControl(path: string) {
  try {
    const stat = await lstat(path)
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error("Archivo de control no seguro")
    return JSON.parse(await readFile(path, "utf8"))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error
  }
}

async function sessionControl(node: Identity, settings: ResearchSettings) {
  const root = resolve(node.directory, settings.sesiones.carpetaRaiz)
  await checkExistingAncestors(root)
  await mkdir(root, { recursive: true })
  await directory(root)
  if ((await realpath(root)).toLowerCase() !== root.toLowerCase()) throw new Error("Ruta de sesiones enlazada fuera de la ubicación prevista")
  const control = join(root, ".control")
  await mkdir(control, { recursive: true })
  await directory(control)
  const id = createHash("sha256").update(node.directory + "\0" + node.id).digest("hex")
  const stateDir = join(control, id)
  await mkdir(stateDir, { recursive: true })
  await directory(stateDir)
  return { root, stateDir }
}

export async function startResearch(input: {
  sessionID: string; messageID?: string; agent: string; topic: string
}, options: PublicationOptions) {
  const nodes = await chain(input.sessionID, input.messageID, options.get)
  if (nodes.length !== 1 || !nodes[0].primary || nodes[0].agent !== input.agent) throw new Error("Solo el agente principal puede iniciar otra investigación")
  const settings = await readSettings(options.settingsPath)
  if (!Object.values(settings.skills).some((skill) => skill.guardarEntregablesEnSesion)) return { guardado: false as const }
  const record = researchSchema.parse({ id: randomUUID(), title: input.topic, created: Date.now() })
  const { stateDir } = await sessionControl(nodes[0], settings)
  return locked(join(stateDir, ".lock"), async () => {
    await readControl(join(stateDir, "active.json"))
    await saveJson(join(stateDir, "active.json"), record)
    return { investigacion: record.id }
  })
}

// El adaptador verificado de OpenCode asigna las carpetas; el modelo aporta solo contenido.
export async function publishSession(input: {
  sessionID: string; messageID?: string; agent: string; topic: string;
  files: Record<string, string>; sources?: string[]
}, options: PublicationOptions): Promise<Publication> {
  let names = Object.keys(input.files)
  if (!names.length || names.some((name) => !input.files[name]?.trim())) throw new Error("Entregables vacíos")
  names.forEach(safeName)
  const nodes = await chain(input.sessionID, input.messageID, options.get)
  if (nodes.at(-1)!.agent !== input.agent) throw new Error("Autor de publicación diferente")
  const settings = await readSettings(options.settingsPath)
  const role = roleOf(nodes.at(-1)!)!
  const kinds: Record<string, Role> = { "investigacion-codebase.md": "codigo", "investigacion-documentacion.md": "documentacion", "resumen-ejecutivo.md": "pregunta", "informe-detallado.md": "pregunta" }
  for (const name of names) {
    const kind = kinds[name]
    if (!kind || (role !== "pregunta" && role !== kind)) throw new Error("Entregable no autorizado para el agente lector")
    if (kind !== "pregunta" && !settings.skills["investiga"].especialistasPermitidos.includes(kind)) throw new Error("Especialista deshabilitado")
  }
  names = names.filter((name) => settings.skills[labels[kinds[name]] as keyof ResearchSettings["skills"]].guardarEntregablesEnSesion)
  if (!names.length) return { guardado: false }

  const { root, stateDir } = await sessionControl(nodes[0], settings)
  return locked(join(stateDir, ".lock"), async () => {
    const active = await readControl(join(stateDir, "active.json"))
    const research = active === undefined ? nodes[0] : researchSchema.parse(active)
    const runDir = active === undefined ? stateDir : join(stateDir, research.id)
    await mkdir(runDir, { recursive: true })
    await directory(runDir)
    const stateFile = join(runDir, "state.json")
    let state = await readControl(stateFile) as State | undefined
    if (!state) {
      let rootFolder = rootName(research.created, research.title || input.topic)
      for (let n = 1; ; n++) {
        try { await mkdir(join(root, rootFolder)); break }
        catch (error) {
          if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error
          rootFolder = `${rootName(research.created, research.title || input.topic)}-${String(n + 1).padStart(2, "0")}`
        }
      }
      state = { root: rootFolder, entries: {}, deliveries: [], sources: [], eventos: [] }
    }
    if (basename(state.root) !== state.root || state.root === "." || state.root === "..") throw new Error("Raíz de sesión inválida")
    const sessionDir = join(root, state.root)
    within(root, sessionDir)
    await checkExistingAncestors(sessionDir)
    await directory(sessionDir)
    for (const node of nodes) {
      const existing = state.entries[node.id]
      if (existing && (existing.parent !== node.parentID || existing.agent !== roleOf(node))) throw new Error("Autor de sesión diferente")
      state.entries[node.id] = { parent: node.parentID, agent: roleOf(node)! }
    }
    for (const name of names) {
      if (!state.deliveries.includes(name)) state.deliveries.push(name)
      state.eventos.push({ fecha: new Date().toISOString(), ruta: name, rol: role })
    }
    for (const item of input.sources ?? []) {
      const text = item.replace(/[\r\n]+/g, " ").trim().slice(0, 300)
      if (text && !state.sources.includes(text)) state.sources.push(text)
    }
    const index = ["# Encargo", "", `**Tema:** ${(research.title || input.topic).replace(/[\r\n]+/g, " ")}`,
      "**Estado:** entregables publicados", "", "## Fuentes consultadas", ...state.sources.map((s) => `- ${s}`),
      "", "## Entregas", ...state.deliveries.map((d) => `- [${d}](./${d})`), ""].join("\n")
    const files = { ...Object.fromEntries(names.map((name) => [name, input.files[name]])), "indice.md": index }
    const staged: { path: string; temp: string; backup?: string; committed: boolean }[] = []
    let recoveryFailed = false
    try {
      for (const [name, content] of Object.entries(files)) {
        const path = join(sessionDir, name)
        const existing = await lstat(path).catch((error: NodeJS.ErrnoException) => {
          if (error.code !== "ENOENT") throw error
        })
        if (existing && (!existing.isFile() || existing.isSymbolicLink())) throw new Error("Destino no es un archivo regular")
        const entry = { path, temp: join(runDir, `entrega-${randomUUID()}.tmp`), backup: existing ? join(runDir, `respaldo-${randomUUID()}.tmp`) : undefined, committed: false }
        staged.push(entry)
        if (entry.backup) await writeFile(entry.backup, await readFile(path), { flag: "wx" })
        await writeFile(entry.temp, content, { flag: "wx" })
        if (await readFile(entry.temp, "utf8") !== content) throw new Error("El contenido guardado no coincide con el enviado")
      }
      for (const entry of staged) {
        await replaceFile(entry.temp, entry.path)
        entry.committed = true
      }
      await saveJson(stateFile, state)
      return { guardado: true, rutas: Object.fromEntries(names.map((name) => [name, join(sessionDir, name)])), sesion: sessionDir }
    } catch (error) {
      const failures: unknown[] = []
      for (const entry of staged.filter((entry) => entry.committed).reverse()) {
        try {
          if (entry.backup) await replaceFile(entry.backup, entry.path)
          else await rm(entry.path)
        } catch (failure) { failures.push(failure) }
      }
      recoveryFailed = failures.length > 0
      if (recoveryFailed) throw new AggregateError([error, ...failures], `Restauración pendiente; respaldos conservados en ${runDir}`)
      throw error
    } finally {
      for (const entry of staged) {
        await rm(entry.temp, { force: true })
        if (entry.backup && !recoveryFailed) await rm(entry.backup, { force: true })
      }
    }
  })
}
