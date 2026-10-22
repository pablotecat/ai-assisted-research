import type { Plugin } from "@opencode-ai/plugin"
import type { Plugin as OpenCodeV2 } from "@opencode/plugin"
import { z } from "zod"

// La entrada V2 reutiliza los publicadores y controles del runtime existente.
export async function setupV2(context: OpenCodeV2.Context, create: Plugin) {
  function message(value: Awaited<ReturnType<typeof context.session.message.get>>) {
    return {
      info: { ...value, role: value.type },
      parts: value.type === "assistant" ? value.content.filter((part) => part.type === "tool").map((part) => {
        const input = "input" in part.state ? part.state.input as Record<string, unknown> : {}
        return { type: "tool", tool: part.name, state: { ...part.state,
          input: part.name === "skill" ? { ...input, name: input.id ?? input.name } : input } }
      }) : [],
    }
  }
  const hooks = await create({ directory: context.location.directory, client: { session: {
    get: async ({ path }: { path: { id: string } }) => {
      const session = await context.session.get({ sessionID: path.id as never })
      if (session.location.directory !== context.location.directory) throw new Error("Proyecto de sesión distinto")
      return { data: { ...session, directory: session.location.directory } }
    },
    messages: async ({ path }: { path: { id: string } }) => ({
      data: (await context.session.context({ sessionID: path.id as never })).map(message),
    }),
    message: async ({ path }: { path: { id: string; messageID: string } }) => ({
      data: message(await context.session.message.get({ sessionID: path.id as never, messageID: path.messageID as never })),
    }),
  } } } as never)
  async function configureAgents() {
    const { data: agents } = await context.agent.list()
    await hooks.config?.({ agent: Object.fromEntries(agents.map((agent) => [agent.id, { mode: agent.mode }])) })
  }
  await configureAgents()
  await context.tool.transform((editor) => {
    for (const [name, definition] of Object.entries(hooks.tool ?? {})) {
      const schema = z.object(definition.args).strict()
      editor.add({
        name, description: definition.description, input: z.toJSONSchema(schema, { target: "draft-7", io: "input" }),
        options: { codemode: false },
        async execute(input, invocation) {
          await configureAgents()
          await context.permission.assert({ sessionID: invocation.sessionID, agent: invocation.agent,
            source: { type: "tool", messageID: invocation.messageID, id: invocation.id },
            action: name, resources: ["*"], save: ["*"] })
          const result = await definition.execute(schema.parse(input), {
            ...invocation, directory: context.location.directory, abort: invocation.signal,
          } as never)
          return { content: typeof result === "string" ? result : result.output }
        },
      })
    }
  })
  const aliases: Record<string, string> = { shell: "bash", subagent: "task", patch: "apply_patch" }
  await context.tool.hook("execute.before", async (event) => {
    await configureAgents()
    const args = event.input as Record<string, unknown>
    await hooks["tool.execute.before"]?.({ tool: aliases[event.tool] ?? event.tool,
      sessionID: event.sessionID, callID: event.id }, {
      args: event.tool === "skill" ? { ...args, name: args.id ?? args.name } : args,
    })
  })
  await context.shell.hook("create.before", async (event) => {
    await hooks["shell.env"]?.({ cwd: context.location.directory }, event)
  })
}
