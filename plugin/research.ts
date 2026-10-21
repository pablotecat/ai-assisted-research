import { tool, type Plugin } from "@opencode-ai/plugin"
import { join } from "node:path"
import { configureSettings, projectSchema, publishSession, readSettings, resolveSettingsPath, saveMissingProject, settingsPatchSchema, type Identity, type ReaderSkill } from "../lib/research.ts"

export default (async ({ client, directory }) => {
  const settingsPath = await resolveSettingsPath(directory, join(directory, ".opencode", "research-settings.json"), process.env.RESEARCH_SETTINGS_PATH)
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
        description: "Solo principal: read devuelve ajustes y archivo consumido; saveMissing completa fuentes vacías; configure modifica únicamente opciones seleccionadas y validadas, conservando el resto.",
        args: { action: tool.schema.enum(["read", "saveMissing", "configure"]), values: projectSchema.partial().strict().optional(), changes: settingsPatchSchema.optional() },
        async execute(args, context) {
          if (!isPrimaryAgent(context.agent)) throw new Error("Solo el agente principal puede gestionar los ajustes")
          if (args.action === "saveMissing" && !args.values) throw new Error("Faltan valores confirmados")
          if (args.action === "configure" && !args.changes) throw new Error("Faltan cambios seleccionados")
          const settings = args.action === "read" ? await readSettings(settingsPath) : args.action === "configure"
            ? await configureSettings(args.changes!, settingsPath) : await saveMissingProject(args.values!, settingsPath)
          return JSON.stringify({ ...settings, archivo: settingsPath })
        },
      }),
      publish_code_report: tool({
        description: "Publica investigacion.md completo, inicial o reconstruido tras cambios materiales: el lector de código que lo produce o el principal. Sobrescribe atómicamente el vigente; respeta especialistas y el guardado de lee-codigo. Solo devuelve rutas confirmadas.",
        args: {
          contenido: tool.schema.string().min(1),
          fuentes: tool.schema.array(tool.schema.string()).optional(),
        },
        async execute(args, context) {
          if (!isPrimaryAgent(context.agent) && context.agent !== "explore") throw new Error("Publicación reservada al agente principal o al lector delegado")
          return JSON.stringify(await publishSession({ sessionID: context.sessionID, messageID: context.messageID,
            agent: context.agent, topic: "investigacion", files: { "investigacion.md": args.contenido }, sources: args.fuentes }, publication))
        },
      }),
      publish_documentation_report: tool({
        description: "Publica investigacion-documentacion.md completo, inicial o reconstruido tras cambios materiales: el lector de documentación que lo produce o el principal. Sobrescribe atómicamente el vigente; respeta especialistas y el guardado de lee-docs.",
        args: { contenido: tool.schema.string().min(1), fuentes: tool.schema.array(tool.schema.string()).optional() },
        async execute(args, context) {
          if (!isPrimaryAgent(context.agent) && context.agent !== "explore") throw new Error("Publicación reservada al agente principal o al lector delegado")
          return JSON.stringify(await publishSession({ sessionID: context.sessionID, messageID: context.messageID,
            agent: context.agent, topic: "documentacion", files: { "investigacion-documentacion.md": args.contenido }, sources: args.fuentes }, publication))
        },
      }),
      write_report_pair: tool({
        description: "El principal publica resumen e informe según el guardado de investiga. Una entrega por pregunta; reescribir sustituye atómicamente la última.",
        args: {
          slug: tool.schema.string().describe("Tema breve de la consulta"),
          resumen_ejecutivo: tool.schema.string().min(1),
          informe_detallado: tool.schema.string().min(1),
          reescribir: tool.schema.boolean().optional().describe("Sustituye la última entrega de esta consulta en lugar de crear una nueva"),
          fuentes: tool.schema.array(tool.schema.string()).optional(),
        },
        async execute(args, context) {
          if (!isPrimaryAgent(context.agent)) throw new Error("Solo el agente principal puede publicar informes")
          const files: Record<string, string> = { "resumen-ejecutivo.md": args.resumen_ejecutivo, "informe-detallado.md": args.informe_detallado }
          return JSON.stringify(await publishSession({ sessionID: context.sessionID, messageID: context.messageID,
            agent: context.agent, topic: args.slug, group: "consulta", reescribir: args.reescribir, sources: args.fuentes, files }, publication))
        },
      }),
    },
    "shell.env": async (_input, output) => { output.env.PYTHONIOENCODING = "utf-8" },
    "tool.execute.before": async (input, output) => {
      const node = await identity(input.sessionID)
      if (node.agent !== "explore") return
      if (input.tool === "task") throw new Error("Los lectores no pueden realizar delegaciones anidadas")
      if (input.tool === "skill") {
        const name = output.args?.name
        if (name !== "lee-codigo" && name !== "lee-docs") throw new Error("Skill no permitida para este lector")
        if (node.skill && node.skill !== name) throw new Error("Cada sesión explore carga una única skill lectora")
      if (node.parentID && !(await readSettings(settingsPath)).skills["investiga"].especialistasPermitidos.includes(name === "lee-codigo" ? "codigo" : "documentacion"))
        throw new Error("Especialista deshabilitado en research-settings.json")
      }
      if (["edit", "write", "apply_patch", "write_report_pair"].includes(input.tool)) throw new Error("Escritura local restringida al agente principal")
      if (input.tool === "publish_code_report" || input.tool === "publish_documentation_report") {
        const expected = input.tool === "publish_code_report" ? "lee-codigo" : "lee-docs"
        if (node.skill !== expected) throw new Error("Publicador reservado al lector que cargó su skill")
      }
      if (input.tool === "lsp" && node.skill !== "lee-codigo")
        throw new Error("Herramienta reservada al lector que cargó lee-codigo")
      if (["webfetch", "websearch"].includes(input.tool) && node.skill === "lee-codigo")
        throw new Error("Herramienta documental no permitida para lee-codigo")
      if (input.tool === "bash") {
        const command = output.args?.command
        const code = node.skill === "lee-codigo" && /^(?:codegraph (?:status|query|explore|context|node|callers|callees|files)\b|git (?:status|rev-parse|branch --show-current|log|show|diff|ls-tree|cat-file|blame|grep)\b)/.test(command)
        const docs = node.skill === "lee-docs" && /^(?:python -X utf8 -m )?markitdown (?:--version|"[^"\r\n]+")$/.test(command)
        if (typeof command !== "string" || !(code || docs) || /[;|&><`$\r\n]|\s(?:--output(?:=|\s)|--exec(?:=|\s)|--git-dir(?:=|\s)|-o(?:\s|$)|-c\s)/i.test(command))
          throw new Error("Comando de shell no permitido para estas skills")
      }
    },
  }
}) satisfies Plugin
