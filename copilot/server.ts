import { execFile } from "node:child_process"
import { randomUUID } from "node:crypto"
import { lstat, mkdir, readFile, realpath, writeFile } from "node:fs/promises"
import { delimiter, dirname, isAbsolute, join, resolve } from "node:path"
import { promisify } from "node:util"
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { z } from "zod"
import { projectSchema, publishSession, readSettings, saveMissingProject, type Identity } from "../lib/research.ts"

const execute = promisify(execFile)
const parameters = process.argv.slice(2)
const workspace = parameters[parameters.indexOf("--workspace") + 1]
const role = parameters[parameters.indexOf("--role") + 1]
if (!parameters.includes("--workspace") || !isAbsolute(workspace ?? "") || !["control", "codigo", "documentacion"].includes(role))
  throw new Error("Usa --workspace <ruta absoluta> --role control|codigo|documentacion")
const host = await realpath(workspace)
const settingsPath = join(host, ".github", "research-settings.json")
const registry = join(host, ".github", "research", "sessions")
const server = new McpServer({ name: `research-${role}`, version: "0.1.0" })
const text = z.string().trim().min(1)
const sessionID = z.string().uuid()
const sources = z.array(text).optional()
const absolute = text.refine(isAbsolute, "Ruta absoluta requerida")
const argumentsSchema = z.array(z.string().max(4000).refine((value) => !/[\0\r\n]/.test(value))).max(60).default([])

function register(name: string, description: string, inputSchema: z.ZodRawShape, handler: (args: any) => Promise<unknown>) {
  server.registerTool(name, { description, inputSchema, annotations: { readOnlyHint: role !== "control", destructiveHint: false } }, async (args) => {
    try {
      return { content: [{ type: "text" as const, text: JSON.stringify(await handler(args)) }] }
    } catch (error) {
      return { isError: true, content: [{ type: "text" as const, text: error instanceof Error ? error.message : String(error) }] }
    }
  })
}

async function safeDirectories(path: string) {
  const pending: string[] = []
  for (let current = resolve(path); ; current = resolve(current, "..")) {
    pending.push(current)
    if (resolve(current, "..") === current) break
  }
  for (const current of pending.reverse()) {
    try {
      const stat = await lstat(current)
      if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error("Directorio de control no seguro")
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error
      await mkdir(current)
    }
  }
}

async function publication(id: string) {
  sessionID.parse(id)
  await safeDirectories(registry)
  const path = join(registry, `${id}.json`)
  if (!(await lstat(path)).isFile() || (await lstat(path)).isSymbolicLink()) throw new Error("Sesión de investigación no segura")
  const record = z.object({ id: sessionID, title: text, created: z.number().int().nonnegative() }).strict()
    .parse(JSON.parse(await readFile(path, "utf8")))
  if (record.id !== id) throw new Error("Sesión de investigación distinta")
  const nodes: Record<string, Identity> = {
    [id]: { ...record, agent: "copilot", primary: true, directory: host },
    [`${id}-codigo`]: { id: `${id}-codigo`, parentID: id, agent: "explore", skill: "lee-codigo", title: "Código", created: record.created, directory: host },
  }
  return { settingsPath, get: async (node: string) => {
    if (!nodes[node]) throw new Error("Publicación fuera de la investigación")
    return nodes[node]
  } }
}

if (role === "control") {
  register("research_settings", "Lee ajustes o guarda únicamente fuentes vacías confirmadas por el usuario.", {
    action: z.enum(["read", "saveMissing"]), values: projectSchema.partial().strict().optional(),
  }, async ({ action, values }) => {
    if (action === "read") return readSettings(settingsPath)
    if (!values) throw new Error("Faltan fuentes confirmadas")
    return saveMissingProject(values, settingsPath)
  })
  register("start_research", "Abre una investigación y devuelve su identificador. Reutilízalo en todas las entregas y repreguntas de esta consulta.", {
    tema: text,
  }, async ({ tema }) => {
    await readSettings(settingsPath)
    await safeDirectories(registry)
    const record = { id: randomUUID(), title: tema, created: Date.now() }
    await writeFile(join(registry, `${record.id}.json`), JSON.stringify(record), { flag: "wx" })
    return { investigacion: record.id }
  })
  register("publish_code_report", "Guarda el informe completo devuelto por el lector de código; respeta el flag de guardado y los especialistas permitidos.", {
    investigacion: sessionID, contenido: text, fuentes: sources,
  }, async ({ investigacion, contenido, fuentes }) => publishSession({
    sessionID: `${investigacion}-codigo`, agent: "explore", topic: "Código", files: { "investigacion.md": contenido }, sources: fuentes,
  }, await publication(investigacion)))
  register("write_report_pair", "Publica juntos resumen e informe completo; conserva el informe documental solo si está habilitado. Devuelve únicamente rutas realmente guardadas.", {
    investigacion: sessionID, resumen_ejecutivo: text, informe_detallado: text,
    investigacion_documentacion: text.optional(), fuentes: sources,
  }, async ({ investigacion, resumen_ejecutivo, informe_detallado, investigacion_documentacion, fuentes }) => {
    const settings = await readSettings(settingsPath)
    const files: Record<string, string> = { "resumen-ejecutivo.md": resumen_ejecutivo, "informe-detallado.md": informe_detallado }
    if (investigacion_documentacion && settings.skills["lee-docs"].guardarEntregablesEnSesion && settings.skills.pregunta.especialistasPermitidos.includes("documentacion"))
      files["investigacion-documentacion.md"] = investigacion_documentacion
    return publishSession({ sessionID: investigacion, agent: "copilot", topic: "Consulta", group: "consulta", files, sources: fuentes }, await publication(investigacion))
  })
}

function checkArguments(args: string[], options: Set<string>) {
  let literal = false
  for (const argument of args) {
    if (argument === "--") { literal = true; continue }
    if (!literal && argument.startsWith("-") && !options.has(argument.split("=", 1)[0]))
      throw new Error(`Opción de consulta no permitida: ${argument}`)
  }
}

async function command(program: string, args: string[], cwd: string) {
  if (program === "codegraph" && process.platform === "win32") {
    let found = false
    for (const folder of (process.env.PATH ?? "").split(delimiter).filter(Boolean)) {
      const executable = join(folder, "codegraph.exe")
      if (await lstat(executable).then((stat) => stat.isFile(), () => false)) {
        program = executable
        found = true
        break
      }
      const node = join(dirname(folder), "node.exe")
      const entry = join(dirname(folder), "lib", "dist", "bin", "codegraph.js")
      if (await lstat(join(folder, "codegraph.cmd")).then((stat) => stat.isFile(), () => false) &&
          await lstat(node).then((stat) => stat.isFile(), () => false) &&
          await lstat(entry).then((stat) => stat.isFile(), () => false)) {
        program = node
        args = ["--liftoff-only", "--disable-warning=ExperimentalWarning", entry, ...args]
        found = true
        break
      }
    }
    if (!found) throw new Error("Codegraph no disponible como ejecutable o distribución Node compatible; instala Codegraph y reinicia Copilot para actualizar PATH")
  }
  const result = await execute(program, args, {
    cwd: await realpath(cwd), encoding: "utf8", timeout: 60000, maxBuffer: 16 * 1024 * 1024,
    windowsHide: true, env: { ...process.env, PYTHONIOENCODING: "utf-8", GIT_TERMINAL_PROMPT: "0", GIT_OPTIONAL_LOCKS: "0" },
  })
  return { stdout: result.stdout, stderr: result.stderr }
}

if (role === "codigo") {
  const codegraphOptions = new Set(["--json", "-l", "-k", "--max-files", "-n", "-f", "--no-code", "--offset", "--limit", "--symbols-only", "--filter", "--pattern", "--format"])
  register("codegraph_query", "Consulta un índice Codegraph existente sin indexarlo ni modificarlo. workspace absoluto; comando y argumentos separados, sin shell.", {
    workspace: absolute, comando: z.enum(["status", "query", "explore", "context", "node", "callers", "callees", "files"]), argumentos: argumentsSchema,
  }, async ({ workspace, comando, argumentos }) => {
    checkArguments(argumentos, codegraphOptions)
    if (comando === "status" && argumentos.some((argument: string) => argument !== "--json")) throw new Error("status solo admite --json")
    return command("codegraph", comando === "status" ? [comando, workspace, "--json"] : [comando, "-p", workspace, ...argumentos], workspace)
  })
  const gitOptions = new Set(["--short", "--branch", "--porcelain", "--show-current", "--abbrev-ref", "--verify", "--show-toplevel", "--is-inside-work-tree", "--oneline", "--stat", "--name-only", "--name-status", "--no-patch", "--format", "--pretty", "--max-count", "--since", "--until", "--date", "--all", "--branches", "--tags", "--remotes", "--reverse", "--first-parent", "--follow", "--no-decorate", "--no-color", "--no-ext-diff", "--no-textconv", "--cached", "--staged", "--word-diff", "--find-renames", "--full-tree", "--long", "-r", "-t", "-p", "-s", "-e", "-n", "-L", "-l", "-i", "-F", "-E", "-w", "--line-number", "--ignore-case", "--fixed-strings", "--extended-regexp", "--files-with-matches", "--heading", "--break"])
  register("git_query", "Consulta Git sin shell, hooks, pager, textconv, diff externo ni comandos mutadores. comando y argumentos separados.", {
    workspace: absolute, comando: z.enum(["status", "rev-parse", "branch", "log", "show", "diff", "ls-tree", "cat-file", "blame", "grep"]), argumentos: argumentsSchema,
  }, async ({ workspace, comando, argumentos }) => {
    checkArguments(argumentos, gitOptions)
    if (comando === "branch" && (argumentos.length !== 1 || argumentos[0] !== "--show-current")) throw new Error("branch solo admite --show-current")
    if (["log", "show", "diff"].includes(comando)) argumentos = ["--no-ext-diff", "--no-textconv", ...argumentos]
    return command("git", ["--no-pager", "--no-replace-objects", "-c", "core.fsmonitor=false", "-c", "core.hooksPath=", comando, ...argumentos], workspace)
  })
}

if (role === "documentacion") {
  register("convert_document", "Convierte un documento local con MarkItDown exclusivamente a stdout; no instala dependencias ni escribe archivos. Sin ruta comprueba la versión.", {
    ruta: absolute.optional(),
  }, async ({ ruta }) => command("markitdown", ruta ? [ruta] : ["--version"], host))
}

await server.connect(new StdioServerTransport())