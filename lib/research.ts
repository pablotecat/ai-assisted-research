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
type Entry = { parent?: string; agent: Role; folder: string }
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

function folderFor(state: State, nodes: Identity[], index: number) {
  const node = nodes[index]
  const existing = state.entries[node.id]
  if (existing) {
    if (existing.parent !== node.parentID || existing.agent !== roleOf(node)) throw new Error("Propietario de carpeta diferente")
    return existing.folder
  }
  const parent = index ? state.entries[nodes[index - 1].id].folder : ""
  const count = Object.values(state.entries).filter((entry) => entry.parent === node.parentID).length + 1
  const label = `${String(count).padStart(2, "0")}-${labels[roleOf(node)!]}${index ? `__${slug(node.title)}` : ""}`
  const folder = parent ? join(parent, label) : label
  state.entries[node.id] = { parent: node.parentID, agent: roleOf(node)!, folder }
  return folder
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

// El adaptador verificado de OpenCode asigna las carpetas; el modelo aporta solo contenido.
export async function publishSession(input: {
  sessionID: string; messageID?: string; agent: string; topic: string;
  files: Record<string, string>; group?: "consulta"; reescribir?: boolean; sources?: string[]
}, options: { get: Resolver; settingsPath: string }): Promise<Publication> {
  let names = Object.keys(input.files)
  if (!names.length || names.some((name) => !input.files[name]?.trim())) throw new Error("Entregables vacíos")
  names.forEach(safeName)
  if (input.group && input.group !== "consulta") throw new Error("Grupo no permitido")
  if (input.reescribir && !input.group) throw new Error("reescribir solo aplica a una entrega de consulta")
  const nodes = await chain(input.sessionID, input.messageID, options.get)
  if (nodes.at(-1)!.agent !== input.agent) throw new Error("Autor de publicación diferente")
  const settings = await readSettings(options.settingsPath)
  const role = roleOf(nodes.at(-1)!)!
  const kinds: Record<string, Role> = { "investigacion.md": "codigo", "investigacion-documentacion.md": "documentacion", "resumen-ejecutivo.md": "pregunta", "informe-detallado.md": "pregunta" }
  for (const name of names) {
    const kind = kinds[name]
    if (!kind || (role !== "pregunta" && role !== kind)) throw new Error("Entregable no autorizado para el agente lector")
    if (kind !== "pregunta" && !settings.skills["investiga"].especialistasPermitidos.includes(kind)) throw new Error("Especialista deshabilitado")
  }
  names = names.filter((name) => settings.skills[labels[kinds[name]] as keyof ResearchSettings["skills"]].guardarEntregablesEnSesion)
  if (!names.length) return { guardado: false }

  const root = resolve(nodes[0].directory, settings.sesiones.carpetaRaiz)
  await checkExistingAncestors(root)
  await mkdir(root, { recursive: true })
  await directory(root)
  if ((await realpath(root)).toLowerCase() !== resolve(root).toLowerCase()) throw new Error("Ruta de sesiones enlazada fuera de la ubicación prevista")
  const control = join(root, ".control")
  await mkdir(control, { recursive: true })
  await directory(control)
  const id = createHash("sha256").update(nodes[0].directory + "\0" + nodes[0].id).digest("hex")
  const stateDir = join(control, id)
  await mkdir(stateDir, { recursive: true })
  await directory(stateDir)
  return locked(join(stateDir, ".lock"), async () => {
    const stateFile = join(stateDir, "state.json")
    let state: State
    try {
      if ((await lstat(stateFile)).isSymbolicLink()) throw new Error("Estado de sesión enlazado")
      state = JSON.parse(await readFile(stateFile, "utf8")) as State
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error
      let rootFolder = rootName(nodes[0].created, nodes[0].title || input.topic)
      for (let n = 1; ; n++) {
        try { await mkdir(join(root, rootFolder)); break }
        catch (error) {
          if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error
          rootFolder = `${rootName(nodes[0].created, nodes[0].title || input.topic)}-${String(n + 1).padStart(2, "0")}`
        }
      }
      state = { root: rootFolder, entries: {}, deliveries: [], sources: [], eventos: [] }
      await saveJson(stateFile, state)
    }
    if (basename(state.root) !== state.root || state.root === "." || state.root === "..") throw new Error("Raíz de sesión inválida")
    const sessionDir = join(root, state.root)
    within(root, sessionDir)
    await checkExistingAncestors(sessionDir)
    await directory(sessionDir)
    const previous = structuredClone(state)
    for (let i = 0; i < nodes.length; i++) {
      const folder = folderFor(state, nodes, i)
      within(sessionDir, join(sessionDir, folder))
      await checkExistingAncestors(join(sessionDir, folder))
      await mkdir(join(sessionDir, folder), { recursive: true })
      await directory(join(sessionDir, folder))
    }
    const owner = join(sessionDir, state.entries[input.sessionID].folder)
    const relativeOwner = state.entries[input.sessionID].folder.replace(/\\/g, "/")
    const count = input.group ? state.deliveries.filter((d) => d.startsWith(`${relativeOwner}/${input.group}`)).length : 0
    if (input.reescribir && !count) throw new Error("No hay una entrega previa que reescribir")
    const suffix = (n: number) => (n <= 1 ? "" : `-${String(n).padStart(2, "0")}`)
    const target = input.group ? join(owner, input.group + suffix(input.reescribir ? count : count + 1)) : owner
    const paths: Record<string, string> = {}
    const created: string[] = []
    let staging: string | undefined
    let committed = false
    try {
      if (input.group && !input.reescribir) {
        staging = join(owner, `.pendiente-${randomUUID()}`)
        await mkdir(staging)
        for (const name of names) {
          await writeFile(join(staging, name), input.files[name], { flag: "wx" })
          if (await readFile(join(staging, name), "utf8") !== input.files[name]) throw new Error("El contenido guardado no coincide con el enviado")
          paths[name] = join(target, name)
        }
        try {
          await lstat(target)
          throw new Error("La entrega ya existe")
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error
        }
        await rename(staging, target)
        committed = true
        staging = undefined
      } else {
        if (input.group) await directory(target)
        for (const name of names) {
          const path = input.group ? join(target, name) : join(owner, name)
          const existed = await lstat(path).then(() => true, (error: NodeJS.ErrnoException) => {
            if (error.code !== "ENOENT") throw error
            return false
          })
          const temp = join(stateDir, `entrega-${randomUUID()}.tmp`)
          try {
            await writeFile(temp, input.files[name], { flag: "wx" })
            if (await readFile(temp, "utf8") !== input.files[name]) throw new Error("El contenido guardado no coincide con el enviado")
            await replaceFile(temp, path)
          } finally { await rm(temp, { force: true }) }
          if (!existed) created.push(path)
          paths[name] = path
        }
      }
      for (const name of names) {
        const entrega = input.group ? `${relativeOwner}/${basename(target)}` : `${relativeOwner}/${name}`
        if (!state.deliveries.includes(entrega)) state.deliveries.push(entrega)
        state.eventos.push({ fecha: new Date().toISOString(), ruta: entrega, rol: role })
      }
      for (const item of input.sources ?? []) {
        const text = item.replace(/[\r\n]+/g, " ").trim().slice(0, 300)
        if (text && !state.sources.includes(text)) state.sources.push(text)
      }
      const index = ["# Encargo", "", `**Tema:** ${(nodes[0].title || input.topic).replace(/[\r\n]+/g, " ")}`,
        "**Estado:** entregables publicados", "", "## Fuentes consultadas", ...state.sources.map((s) => `- ${s}`),
        "", "## Entregas", ...state.deliveries.map((d) => `- [${d}](./${d})`), ""].join("\n")
      await saveJson(stateFile, state)
      const indexPath = join(sessionDir, "indice.md")
      try {
        if ((await lstat(indexPath)).isSymbolicLink()) throw new Error("Índice enlazado fuera de la sesión")
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error
      }
      const tempIndex = join(stateDir, `indice-${randomUUID()}.tmp`)
      try {
        await writeFile(tempIndex, index, { flag: "wx" })
        await replaceFile(tempIndex, indexPath)
      } finally { await rm(tempIndex, { force: true }) }
    } catch (error) {
      if (staging) await rm(staging, { recursive: true, force: true })
      if (input.group && committed) await rm(target, { recursive: true, force: true })
      for (const path of created) await rm(path, { force: true })
      await saveJson(stateFile, previous)
      throw error
    }
    return { guardado: true, rutas: paths, sesion: sessionDir }
  })
}
