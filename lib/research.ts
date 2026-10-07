import { createHash, randomUUID } from "node:crypto"
import { link, lstat, mkdir, readFile, realpath, rename, rm, writeFile } from "node:fs/promises"
import { basename, isAbsolute, join, relative, resolve, sep } from "node:path"
import { z } from "zod"

const nonEmpty = z.string().trim().min(1)
const board = z.object({
  proveedor: z.enum(["", "jira", "azdo", "github"]),
  url: z.string().refine((s) => !s || (() => { try { return new URL(s).protocol === "https:" } catch { return false } })(), "URL HTTPS requerida"),
}).strict().refine((b) => Boolean(b.proveedor) === Boolean(b.url), "Indica proveedor y URL juntos")
export const projectSchema = z.object({
  repositorio: z.string().refine((s) => !s || isAbsolute(s)),
  referencia: z.string(),
  carpetasDocumentales: z.array(nonEmpty.refine(isAbsolute)),
  board,
}).strict()
const permitted = z.array(z.enum(["codigo", "documentacion"]))
  .min(1).max(2).refine((v) => new Set(v).size === v.length, "Especialistas repetidos")
const saved = z.object({ guardarEntregablesEnSesion: z.boolean() }).strict()
const settingsSchema = z.object({
  proyecto: projectSchema,
  skills: z.object({
    pregunta: saved.extend({ maxRepreguntasEspecialistas: z.number().int().min(0), especialistasPermitidos: permitted }),
    "lee-codigo": saved,
    "lee-docs": saved,
  }).strict(),
  sesiones: z.object({ carpetaRaiz: nonEmpty.refine((s) => !isAbsolute(s) && !s.includes(":") && s.split(/[\\/]/).every((part) => part && part !== ".." && part !== "."), "Ruta relativa dentro del proyecto") }).strict(),
}).strict()
export type ResearchSettings = ReturnType<typeof settingsSchema.parse>

export async function readSettings(path: string): Promise<ResearchSettings> {
  return settingsSchema.parse(JSON.parse(await readFile(path, "utf8")))
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

type Role = "pregunta" | "codigo"
function roleOf(node: Identity): Role | undefined {
  if (node.primary) return "pregunta"
  return node.agent === "explore" && node.skill === "lee-codigo" ? "codigo" : undefined
}
const labels: Record<Role, string> = { pregunta: "pregunta", codigo: "lee-codigo" }
type Entry = { parent?: string; agent: Role; folder: string }
type State = { root: string; entries: Record<string, Entry>; deliveries: string[]; sources: string[] }

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
    if (roleOf(nodes[i]) !== "codigo" || roleOf(nodes[i - 1]) !== "pregunta")
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
  files: Record<string, string>; group?: "consulta"; sources?: string[]
}, options: { get: Resolver; settingsPath: string }): Promise<Publication> {
  const names = Object.keys(input.files)
  if (!names.length || names.some((name) => !input.files[name]?.trim())) throw new Error("Entregables vacíos")
  names.forEach(safeName)
  if (input.group && input.group !== "consulta") throw new Error("Grupo no permitido")
  const nodes = await chain(input.sessionID, input.messageID, options.get)
  if (nodes.at(-1)!.agent !== input.agent) throw new Error("Autor de publicación diferente")
  const settings = await readSettings(options.settingsPath)
  const role = roleOf(nodes.at(-1)!)!
  if (!settings.skills[role === "pregunta" ? "pregunta" : "lee-codigo"].guardarEntregablesEnSesion) return { guardado: false }
  if (role === "codigo" && !settings.skills.pregunta.especialistasPermitidos.includes("codigo") && nodes.length > 1)
    throw new Error("Especialista deshabilitado")

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
      state = { root: rootFolder, entries: {}, deliveries: [], sources: [] }
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
    const groupNumber = state.deliveries.filter((d) => d.startsWith(`${relativeOwner}/${input.group}`)).length + 1
    const target = input.group ? join(owner, `consulta${groupNumber === 1 ? "" : `-${String(groupNumber).padStart(2, "0")}`}`) : owner
    const paths: Record<string, string> = {}
    let staging: string | undefined
    let committed = false
    try {
      if (input.group) {
        staging = join(owner, `.pendiente-${randomUUID()}`)
        await mkdir(staging)
        for (const name of names) {
          await writeFile(join(staging, name), input.files[name], { flag: "wx" })
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
        for (const name of names) {
          const version = String(state.deliveries.filter((d) => d.startsWith(`${relativeOwner}/`)).length + 1).padStart(2, "0")
          const path = join(owner, `${version}-${name}`)
          const temp = join(stateDir, `entrega-${randomUUID()}.tmp`)
          try {
            await writeFile(temp, input.files[name], { flag: "wx" })
            await link(temp, path)
          } finally { await rm(temp, { force: true }) }
          paths[name] = path
          state.deliveries.push(`${relativeOwner}/${version}-${name}`)
        }
      }
      if (input.group) state.deliveries.push(`${relativeOwner}/${basename(target)}`)
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
      if (!input.group) for (const path of Object.values(paths)) await rm(path, { force: true })
      await saveJson(stateFile, previous)
      throw error
    }
    return { guardado: true, rutas: paths, sesion: sessionDir }
  })
}
