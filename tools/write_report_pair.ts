import { tool } from "@opencode-ai/plugin"
import { isPrimaryAgent } from "./agent_settings.ts"
import { publishSession } from "./session_store.ts"

export default tool({
  description: "Publica juntos el resumen ejecutivo y el informe detallado en la carpeta de pregunta; devuelve guardado:false si está desactivado.",
  args: {
    slug: tool.schema.string().describe("Tema breve de la consulta; nunca es una ruta"),
    resumen_ejecutivo: tool.schema.string().min(1),
    informe_detallado: tool.schema.string().min(1),
    fuentes: tool.schema.array(tool.schema.string()).optional().describe("Fuentes consultadas para el índice de sesión"),
    decisiones: tool.schema.array(tool.schema.string()).optional().describe("Decisiones relevantes para el índice de sesión"),
  },
  async execute(args, context) {
    if (!isPrimaryAgent(context.agent)) throw new Error("Solo el agente principal puede publicar informes")
    return JSON.stringify(await publishSession({ sessionID: context.sessionID, messageID: context.messageID,
      agent: context.agent, topic: args.slug, group: "consulta", sources: args.fuentes, decisions: args.decisiones,
      files: { "resumen-ejecutivo.md": args.resumen_ejecutivo, "informe-detallado.md": args.informe_detallado } }))
  },
})
