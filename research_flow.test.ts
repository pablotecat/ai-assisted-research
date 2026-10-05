import assert from "node:assert/strict"
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import test from "node:test"
import plugin from "./plugin/agent-session.ts"
import { isPrimaryAgent, readAgentSettings, registerPrimaryAgent, saveMissingProject } from "./tools/agent_settings.ts"
import { publishSession, type Identity } from "./tools/session_store.ts"

test("consulta directa y delegada: configuración, permisos y entregas de sesión", async () => {
  const dir = await mkdtemp(join(tmpdir(), "research-flow-"))
  const path = join(dir, "agent-settings.json")
  const nodes: Record<string, Identity> = {
    coord: { id: "coord", agent: "build", title: "Duda sobre pagos", created: Date.UTC(2026, 9, 5), directory: dir },
    code: { id: "code", parentID: "coord", agent: "lector-codigo", title: "Código", created: 1, directory: dir },
    docs: { id: "docs", parentID: "coord", agent: "lector-docs", title: "Documentos", created: 1, directory: dir },
    nested: { id: "nested", parentID: "docs", agent: "lector-docs", title: "Más documentos", created: 1, directory: dir },
    invalid: { id: "invalid", parentID: "code", agent: "lector-docs", title: "Otra", created: 1, directory: dir },
    direct: { id: "direct", agent: "lector-docs", title: "Consulta directa", created: 1, directory: dir },
    custom: { id: "custom", agent: "investigador", title: "Pregunta personalizada", created: 1, directory: dir },
    customCode: { id: "customCode", parentID: "custom", agent: "lector-codigo", title: "Código", created: 1, directory: dir },
  }
  const opts = { root: join(dir, "sesiones"), settingsPath: path,
    get: async (id: string) => nodes[id] ?? Promise.reject(new Error("Sesión desconocida")) }
  try {
    const settings = await readAgentSettings(path)
    assert.deepEqual(Object.keys(settings.agentes), ["coordinador", "codigo", "documentacion"])
    await saveMissingProject({ repositorio: dir }, path)
    await saveMissingProject({ repositorio: tmpdir() }, path)
    assert.equal((await readAgentSettings(path)).proyecto.repositorio, dir)

    const first = await publishSession({ sessionID: "coord", agent: "build", topic: "pagos", group: "consulta",
      files: { "resumen-ejecutivo.md": "Resumen", "informe-detallado.md": "Informe" }, sources: ["fuente:1"] }, opts)
    assert.equal(first.guardado, true)
    if (!first.guardado) return
    assert.equal(await readFile(first.rutas["informe-detallado.md"], "utf8"), "Informe")
    assert.match(first.rutas["informe-detallado.md"], /01-pregunta/)
    const next = await publishSession({ sessionID: "coord", agent: "build", topic: "pagos", group: "consulta",
      files: { "resumen-ejecutivo.md": "Resumen 2", "informe-detallado.md": "Informe 2" } }, opts)
    assert.equal(next.guardado, true)
    if (!next.guardado) return
    assert.equal(dirname(next.rutas["informe-detallado.md"]), `${dirname(first.rutas["informe-detallado.md"])}-02`)

    for (const id of ["code", "docs", "nested"]) {
      const report = await publishSession({ sessionID: id, agent: nodes[id].agent, topic: "pagos",
        files: { "investigacion.md": id } }, opts)
      assert.equal(report.guardado, true)
      if (report.guardado) assert.equal(await readFile(report.rutas["investigacion.md"], "utf8"), id)
    }
    assert.equal((await publishSession({ sessionID: "direct", agent: "lector-docs", topic: "documentos",
      files: { "investigacion.md": "Directa" } }, opts)).guardado, true)
    registerPrimaryAgent("investigador")
    assert.equal((await publishSession({ sessionID: "custom", agent: "investigador", topic: "pregunta", group: "consulta",
      files: { "resumen-ejecutivo.md": "Resumen", "informe-detallado.md": "Informe" } }, opts)).guardado, true)
    assert.equal((await publishSession({ sessionID: "customCode", agent: "lector-codigo", topic: "código",
      files: { "investigacion.md": "Código" } }, opts)).guardado, true)
    assert.match(await readFile(join(first.sesion, "indice.md"), "utf8"), /fuente:1/)
    await assert.rejects(publishSession({ sessionID: "invalid", agent: "lector-docs", topic: "pagos",
      files: { "investigacion.md": "no" } }, opts), /Delegación no autorizada/)
    await assert.rejects(publishSession({ sessionID: "code", agent: "build", topic: "pagos",
      files: { "investigacion.md": "no" } }, opts), /Autor de publicación diferente/)
    await assert.rejects(publishSession({ sessionID: "code", agent: "lector-codigo", topic: "pagos",
      files: { "../otro.md": "no" } }, opts), /Nombre de archivo no permitido/)

    const current = await readAgentSettings(path)
    const disabled = { ...current, agentes: { ...current.agentes,
      coordinador: { ...current.agentes.coordinador, especialistasPermitidos: ["documentacion"] } } }
    await writeFile(path, JSON.stringify(disabled))
    await assert.rejects(publishSession({ sessionID: "code", agent: "lector-codigo", topic: "pagos",
      files: { "investigacion.md": "no" } }, opts), /Especialista deshabilitado/)
    disabled.agentes.coordinador.especialistasPermitidos = ["codigo"]
    await writeFile(path, JSON.stringify(disabled))
    await assert.rejects(publishSession({ sessionID: "nested", agent: "lector-docs", topic: "pagos",
      files: { "investigacion.md": "no" } }, opts), /Especialista deshabilitado/)
  } finally { await rm(dir, { recursive: true, force: true }) }
})

test("adaptador verifica identidad y restringe escrituras y comandos", async () => {
  const client = { session: {
    get: async ({ path }: { path: { id: string } }) => ({ data: { id: path.id, title: "Consulta", time: { created: Date.now() }, directory: "proyecto" } }),
    messages: async () => ({ data: [{ info: { role: "assistant", mode: "lector-codigo" } }] }),
    message: async () => ({ data: { info: { role: "assistant", mode: "lector-codigo" } } }),
  } }
  const hooks = await plugin({ client, directory: "proyecto" } as never)
  await hooks.config!({ agent: { revisor: { mode: "primary" } } } as never)
  assert.equal(isPrimaryAgent("revisor"), true)
  const before = hooks["tool.execute.before"]!
  await assert.rejects(before({ tool: "edit", sessionID: "code", callID: "a" }, { args: {} }), /restringida/)
  await assert.rejects(before({ tool: "bash", sessionID: "code", callID: "b" }, { args: { command: "git status; echo hola" } }), /no permitido/)
  await before({ tool: "bash", sessionID: "code", callID: "c" }, { args: { command: "git status --short" } })
})
