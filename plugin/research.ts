import { tool, type Plugin } from "@opencode-ai/plugin"
import { join } from "node:path"
import { projectSchema, publishSession, readSettings, saveMissingProject, type Identity, type ReaderSkill } from "../lib/research.ts"

export default (async ({ client, directory }) => {
  const settingsPath = join(directory, ".opencode", "research-settings.json")
  const primaryAgents = new Set(["build", "plan"])
  const isPrimaryAgent = (name: string) => primaryAgents.has(name)
  async function identity(id: string, messageID?: string): Promise<Identity> {
    const session = await client.session.get({ path: { id }, query: { directory } })
    if (!session.data || session.error) throw new Error("Sesión OpenCode no verificable")
    const response = await client.session.messages({ path: { id }, query: { directory } })
    if (!response.data || response.error) throw new Error("Agente OpenCode no verificable")
    const messages = response.data
    const current = messageID ? await client.session.message({ path: { id, messageID }, query: { directory } }) : undefined
    if (current && (!current.data || current.error)) throw new Error("Agente OpenCode no verificable")
    const candidates = current?.data ? [current.data] : messages
    const assistant = candidates.map((m) => m.info).filter((m) => m.role === "assistant" && !m.summary).at(-1)
    if (!assistant) throw new Error("No hay mensaje de agente atribuible")
    const agent = (assistant as typeof assistant & { agent?: string }).agent ?? assistant.mode
    let skill: ReaderSkill | undefined
    if (agent === "explore") {
      for (const message of messages) {
        if (message.info.role !== "assistant") continue
        for (const part of message.parts ?? []) {
          if (part.type !== "tool" || part.tool !== "skill" || part.state.status !== "completed") continue
          const name = part.state.input.name
          if (name !== "lee-codigo" && name !== "lee-docs") continue
          if (skill && skill !== name) throw new Error("Skills lectoras incompatibles en la misma sesión explore")
          skill = name
        }
      }
    }
    return { id: session.data.id, parentID: session.data.parentID, agent, primary: isPrimaryAgent(agent), skill,
      title: session.data.title, created: session.data.time.created, directory: session.data.directory }
  }
  const publication = { get: identity, settingsPath }
  return {
    config: async (config) => {
      for (const [name, agent] of Object.entries(config.agent ?? {})) {
        if (agent.mode === "primary" || agent.mode === "all") primaryAgents.add(name)
      }
    },
    tool: {
      research_settings: tool({
        description: "Lee los ajustes de las skills de investigación; guarda solo datos de proyecto vacíos confirmados por el usuario.",
        args: { action: tool.schema.enum(["read", "saveMissing"]), values: projectSchema.partial().strict().optional() },
        async execute(args, context) {
          if (!isPrimaryAgent(context.agent)) throw new Error("Solo el agente principal puede gestionar los ajustes")
          if (args.action === "saveMissing" && !args.values) throw new Error("Faltan valores confirmados")
          return JSON.stringify(args.action === "read" ? await readSettings(settingsPath) : await saveMissingProject(args.values!, settingsPath))
        },
      }),
      publish_code_report: tool({
        description: "Publica investigacion.md de lee-codigo en su sesión verificada; devuelve guardado:false si su guardado está desactivado.",
        args: {
          contenido: tool.schema.string().min(1),
          fuentes: tool.schema.array(tool.schema.string()).optional(),
        },
        async execute(args, context) {
          if (context.agent !== "explore") throw new Error("Agente no autorizado")
          return JSON.stringify(await publishSession({ sessionID: context.sessionID, messageID: context.messageID,
            agent: context.agent, topic: "investigacion", files: { "investigacion.md": args.contenido }, sources: args.fuentes }, publication))
        },
      }),
      write_report_pair: tool({
        description: "Publica juntos resumen, informe detallado y, si procede, informe documental de pregunta; devuelve guardado:false si está desactivado.",
        args: {
          slug: tool.schema.string().describe("Tema breve de la consulta"),
          resumen_ejecutivo: tool.schema.string().min(1),
          informe_detallado: tool.schema.string().min(1),
          investigacion_documentacion: tool.schema.string().min(1).optional(),
          fuentes: tool.schema.array(tool.schema.string()).optional(),
        },
        async execute(args, context) {
          if (!isPrimaryAgent(context.agent)) throw new Error("Solo el agente principal puede publicar informes")
          const settings = await readSettings(settingsPath)
          const files: Record<string, string> = { "resumen-ejecutivo.md": args.resumen_ejecutivo, "informe-detallado.md": args.informe_detallado }
          if (args.investigacion_documentacion && settings.skills["lee-docs"].guardarEntregablesEnSesion && settings.skills.pregunta.especialistasPermitidos.includes("documentacion"))
            files["investigacion-documentacion.md"] = args.investigacion_documentacion
          return JSON.stringify(await publishSession({ sessionID: context.sessionID, messageID: context.messageID,
            agent: context.agent, topic: args.slug, group: "consulta", sources: args.fuentes, files }, publication))
        },
      }),
    },
    "shell.env": async (_input, output) => { output.env.PYTHONIOENCODING = "utf-8" },
    "tool.execute.before": async (input, output) => {
      const node = await identity(input.sessionID)
      if (node.agent !== "explore") return
      if (input.tool === "skill") {
        const name = output.args?.name
        if (name !== "lee-codigo" && name !== "lee-docs") throw new Error("Skill no permitida para este lector")
        if (node.skill && node.skill !== name) throw new Error("Cada sesión explore carga una única skill lectora")
        if (node.parentID && !(await readSettings(settingsPath)).skills.pregunta.especialistasPermitidos.includes(name === "lee-codigo" ? "codigo" : "documentacion"))
          throw new Error("Especialista deshabilitado en research-settings.json")
      }
      if (["edit", "write", "apply_patch"].includes(input.tool)) throw new Error("Escritura local restringida a los publicadores de sesión")
      if (["publish_code_report", "lsp"].includes(input.tool) && node.skill !== "lee-codigo")
        throw new Error("Herramienta reservada al lector que cargó lee-codigo")
      if (["webfetch", "websearch"].includes(input.tool) && node.skill === "lee-codigo")
        throw new Error("Herramienta documental no permitida para lee-codigo")
      if (input.tool === "bash") {
        const command = output.args?.command
        const code = node.skill === "lee-codigo" && /^(?:codegraph (?:status|query|explore|context|node|callers|callees|files)\b|git (?:status|rev-parse|branch --show-current|log|show|diff|ls-tree|cat-file|blame|grep)\b)/.test(command)
        const docs = node.skill === "lee-docs" && /^markitdown (?:--version|"[^"\r\n]+")$/.test(command)
        if (typeof command !== "string" || !(code || docs) || /[;|&><`$\r\n]|\s(?:--output(?:=|\s)|--exec(?:=|\s)|--git-dir(?:=|\s)|-o(?:\s|$)|-c\s)/i.test(command))
          throw new Error("Comando de shell no permitido para estas skills")
      }
    },
  }
}) satisfies Plugin
