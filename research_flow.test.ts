import assert from "node:assert/strict"
import { cp, lstat, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises"
import { spawnSync } from "node:child_process"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import test from "node:test"
import plugin from "./plugin/research.ts"
import { publishSession, readSettings, saveMissingProject, type Identity } from "./lib/research.ts"

const source = dirname(fileURLToPath(import.meta.url))
async function settingsFile(dir: string) {
  const path = join(dir, ".opencode", "research-settings.json")
  await mkdir(dirname(path), { recursive: true })
  await cp(join(source, "research-settings.example.json"), path)
  return path
}

test("consulta directa y delegada: configuración, permisos y entregas de sesión", async () => {
  const dir = await mkdtemp(join(tmpdir(), "research-flow-"))
  const path = await settingsFile(dir)
  const nodes: Record<string, Identity> = {
    coord: { id: "coord", agent: "build", primary: true, title: "Duda sobre pagos", created: Date.UTC(2026, 9, 5), directory: dir },
    code: { id: "code", parentID: "coord", agent: "explore", skill: "lee-codigo", title: "Código", created: 1, directory: dir },
    docs: { id: "docs", parentID: "coord", agent: "explore", skill: "lee-docs", title: "Documentos", created: 1, directory: dir },
    direct: { id: "direct", agent: "explore", skill: "lee-codigo", title: "Código directo", created: 1, directory: dir },
    plain: { id: "plain", parentID: "coord", agent: "explore", title: "Sin skill", created: 1, directory: dir },
    custom: { id: "custom", agent: "investigador", primary: true, title: "Pregunta personalizada", created: 1, directory: dir },
    customCode: { id: "customCode", parentID: "custom", agent: "explore", skill: "lee-codigo", title: "Código", created: 1, directory: dir },
  }
  const opts = { settingsPath: path,
    get: async (id: string) => nodes[id] ?? Promise.reject(new Error("Sesión desconocida")) }
  try {
    const settings = await readSettings(path)
    assert.deepEqual(Object.keys(settings.skills), ["pregunta", "lee-codigo", "lee-docs"])
    assert.deepEqual(settings.proyecto.board, { proveedor: "", url: "" })
    await saveMissingProject({ repositorio: dir }, path)
    await saveMissingProject({ repositorio: tmpdir() }, path)
    await saveMissingProject({ board: { proveedor: "github", url: "https://github.com/owner/repo/issues" } }, path)
    await saveMissingProject({ board: { proveedor: "jira", url: "https://example.atlassian.net/jira/software/projects/ABC" } }, path)
    assert.equal((await readSettings(path)).proyecto.repositorio, dir)
    assert.equal((await readSettings(path)).proyecto.board.proveedor, "github")
    await assert.rejects(saveMissingProject({ board: { proveedor: "github", url: "http://github.com/owner/repo" } }, path))

    const first = await publishSession({ sessionID: "coord", agent: "build", topic: "pagos", group: "consulta",
      files: { "resumen-ejecutivo.md": "Resumen", "informe-detallado.md": "Informe",
        "investigacion-documentacion.md": "Evidencia documental" }, sources: ["fuente:1"] }, opts)
    assert.equal(first.guardado, true)
    if (!first.guardado) return
    assert.equal(await readFile(first.rutas["informe-detallado.md"], "utf8"), "Informe")
    assert.equal(await readFile(first.rutas["investigacion-documentacion.md"], "utf8"), "Evidencia documental")
    assert.match(first.rutas["informe-detallado.md"], /01-pregunta/)
    const next = await publishSession({ sessionID: "coord", agent: "build", topic: "pagos", group: "consulta",
      files: { "resumen-ejecutivo.md": "Resumen 2", "informe-detallado.md": "Informe 2" } }, opts)
    assert.equal(next.guardado, true)
    if (!next.guardado) return
    assert.equal(dirname(next.rutas["informe-detallado.md"]), `${dirname(first.rutas["informe-detallado.md"])}-02`)

    const report = await publishSession({ sessionID: "code", agent: "explore", topic: "pagos",
      files: { "investigacion.md": "Código" } }, opts)
    assert.equal(report.guardado, true)
    if (report.guardado) {
      assert.equal(await readFile(report.rutas["investigacion.md"], "utf8"), "Código")
      assert.match(report.rutas["investigacion.md"], /lee-codigo/)
    }
    assert.equal((await publishSession({ sessionID: "direct", agent: "explore", topic: "código",
      files: { "investigacion.md": "Directa" } }, opts)).guardado, true)
    assert.equal((await publishSession({ sessionID: "custom", agent: "investigador", topic: "pregunta", group: "consulta",
      files: { "resumen-ejecutivo.md": "Resumen", "informe-detallado.md": "Informe" } }, opts)).guardado, true)
    assert.equal((await publishSession({ sessionID: "customCode", agent: "explore", topic: "código",
      files: { "investigacion.md": "Código" } }, opts)).guardado, true)
    assert.match(await readFile(join(first.sesion, "indice.md"), "utf8"), /fuente:1/)
    await assert.rejects(publishSession({ sessionID: "docs", agent: "explore", topic: "pagos",
      files: { "investigacion.md": "no" } }, opts), /agente/)
    await assert.rejects(publishSession({ sessionID: "plain", agent: "explore", topic: "pagos",
      files: { "investigacion.md": "no" } }, opts), /skill/)
    await assert.rejects(publishSession({ sessionID: "code", agent: "build", topic: "pagos",
      files: { "investigacion.md": "no" } }, opts), /Autor de publicación diferente/)
    await assert.rejects(publishSession({ sessionID: "code", agent: "explore", topic: "pagos",
      files: { "../otro.md": "no" } }, opts), /Nombre de archivo no permitido/)

    const concurrent = await Promise.all([1, 2].map((n) => publishSession({ sessionID: "code", agent: "explore", topic: "pagos",
      files: { "investigacion.md": `Revisión ${n}` } }, opts)))
    assert.ok(concurrent.every((result) => result.guardado))
    assert.notEqual(concurrent[0].guardado && concurrent[0].rutas["investigacion.md"], concurrent[1].guardado && concurrent[1].rutas["investigacion.md"])

    const current = await readSettings(path)
    const disabled = { ...current, skills: { ...current.skills,
      pregunta: { ...current.skills.pregunta, especialistasPermitidos: ["documentacion"] } } }
    await writeFile(path, JSON.stringify(disabled))
    await assert.rejects(publishSession({ sessionID: "code", agent: "explore", topic: "pagos",
      files: { "investigacion.md": "no" } }, opts), /Especialista deshabilitado/)
    disabled.skills.pregunta.especialistasPermitidos = ["codigo"]
    disabled.skills["lee-codigo"].guardarEntregablesEnSesion = false
    await writeFile(path, JSON.stringify(disabled))
    assert.deepEqual(await publishSession({ sessionID: "code", agent: "explore", topic: "pagos",
      files: { "investigacion.md": "no" } }, opts), { guardado: false })
  } finally { await rm(dir, { recursive: true, force: true }) }
})

test("explore distingue la skill cargada y conserva los permisos de cada lector", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "research-plugin-"))
  t.after(() => rm(dir, { recursive: true, force: true }))
  const path = await settingsFile(dir)
  const skillPart = (name: string, status = "completed") => ({ type: "tool", tool: "skill", state: { status, input: { name } } })
  const client = { session: {
    get: async ({ path }: { path: { id: string } }) => ({ data: { id: path.id, parentID: path.id === "coord" ? undefined : "coord", title: "Consulta", time: { created: Date.now() }, directory: dir } }),
    messages: async ({ path }: { path: { id: string } }) => ({ data: [
      { info: { role: "assistant", agent: path.id === "coord" ? "revisor" : "explore", mode: "subagent" }, parts:
        path.id === "plain" ? [] : path.id === "failed" ? [skillPart("lee-codigo", "error")] :
        path.id === "mixed" ? [skillPart("lee-codigo"), skillPart("lee-docs")] : [skillPart(path.id === "docs" ? "lee-docs" : "lee-codigo")] },
      ...Array.from({ length: 35 }, () => ({ info: { role: "assistant", agent: path.id === "coord" ? "revisor" : "explore", mode: "subagent" }, parts: [] })),
    ] }),
    message: async ({ path }: { path: { id: string } }) => ({ data: { info: { role: "assistant", agent: path.id === "coord" ? "revisor" : "explore", mode: "subagent" }, parts: [] } }),
  } }
  const hooks = await plugin({ client, directory: dir } as never)
  await hooks.config!({ agent: { revisor: { mode: "primary" } } } as never)
  const before = hooks["tool.execute.before"]!
  await assert.rejects(before({ tool: "read", sessionID: "mixed", callID: "mixed" }, { args: {} }), /incompatibles/)
  await assert.rejects(before({ tool: "edit", sessionID: "code", callID: "a" }, { args: {} }), /restringida/)
  await assert.rejects(before({ tool: "bash", sessionID: "code", callID: "b" }, { args: { command: "git status; echo hola" } }), /no permitido/)
  await before({ tool: "bash", sessionID: "code", callID: "c" }, { args: { command: "git status --short" } })
  await before({ tool: "bash", sessionID: "code", callID: "codegraph" }, { args: { command: 'codegraph status "C:\\workspace" --json' } })
  await before({ tool: "publish_code_report", sessionID: "code", callID: "publish" }, { args: {} })
  await assert.rejects(before({ tool: "publish_code_report", sessionID: "docs", callID: "publish-docs" }, { args: {} }), /lee-codigo/)
  await assert.rejects(before({ tool: "skill", sessionID: "code", callID: "switch" }, { args: { name: "lee-docs" } }), /única skill/)
  await assert.rejects(before({ tool: "bash", sessionID: "plain", callID: "plain" }, { args: { command: "git status" } }), /no permitido/)
  await assert.rejects(before({ tool: "bash", sessionID: "failed", callID: "failed" }, { args: { command: "git status" } }), /no permitido/)
  await assert.rejects(before({ tool: "bash", sessionID: "code", callID: "checkout" }, { args: { command: "git checkout main" } }), /no permitido/)
  await assert.rejects(before({ tool: "bash", sessionID: "code", callID: "index" }, { args: { command: 'codegraph index "C:\\workspace"' } }), /no permitido/)
  await assert.rejects(before({ tool: "edit", sessionID: "docs", callID: "d" }, { args: {} }), /restringida/)
  await assert.rejects(before({ tool: "bash", sessionID: "docs", callID: "e" }, { args: { command: "git status" } }), /no permitido/)
  await assert.rejects(before({ tool: "bash", sessionID: "docs", callID: "f" }, { args: { command: "markitdown \"a.md\" -o otro.md" } }), /no permitido/)
  await before({ tool: "bash", sessionID: "docs", callID: "g" }, { args: { command: "markitdown \"a.md\"" } })
  await assert.rejects(before({ tool: "bash", sessionID: "code", callID: "code-convert" }, { args: { command: "markitdown \"a.md\"" } }), /no permitido/)
  const tools = hooks.tool!
  const context = { agent: "revisor", sessionID: "coord", messageID: "report" } as never
  assert.deepEqual(JSON.parse(await tools.research_settings.execute({ action: "read" }, context) as string).skills, (await readSettings(path)).skills)
  await assert.rejects(tools.research_settings.execute({ action: "read" }, { agent: "explore", sessionID: "docs" } as never), /Solo el agente principal/)
  await assert.rejects(tools.research_settings.execute({ action: "saveMissing", values: {} }, { agent: "explore", sessionID: "code" } as never), /Solo el agente principal/)
  await assert.rejects(tools.publish_code_report.execute({ contenido: "No" }, { agent: "explore", sessionID: "docs" } as never), /skill/)
  const report = JSON.parse(await tools.publish_code_report.execute({ contenido: "Código", fuentes: ["archivo.ts:1"] }, { agent: "explore", sessionID: "code", messageID: "report" } as never) as string)
  assert.equal(await readFile(report.rutas["investigacion.md"], "utf8"), "Código")
  const pair = { slug: "consulta", resumen_ejecutivo: "Resumen", informe_detallado: "Informe", investigacion_documentacion: "Docs" }
  const first = JSON.parse(await tools.write_report_pair.execute(pair, context) as string)
  assert.equal(await readFile(first.rutas["investigacion-documentacion.md"], "utf8"), "Docs")
  const settings = await readSettings(path)
  settings.skills["lee-docs"].guardarEntregablesEnSesion = false
  await writeFile(path, JSON.stringify(settings))
  const next = JSON.parse(await tools.write_report_pair.execute(pair, context) as string)
  assert.equal(next.rutas["investigacion-documentacion.md"], undefined)
  settings.skills.pregunta.guardarEntregablesEnSesion = false
  await writeFile(path, JSON.stringify(settings))
  assert.deepEqual(JSON.parse(await tools.write_report_pair.execute(pair, context) as string), { guardado: false })
  settings.skills.pregunta.especialistasPermitidos = ["codigo"]
  await writeFile(path, JSON.stringify(settings))
  await assert.rejects(before({ tool: "skill", sessionID: "plain", callID: "disabled" }, { args: { name: "lee-docs" } }), /deshabilitado/)
  const env = { env: {} as Record<string, string> }
  await hooks["shell.env"]!({ cwd: dir }, env)
  assert.equal(env.env.PYTHONIOENCODING, "utf-8")
})

test("instalación real, migración y actualización conservan ajustes y archivos del anfitrión", { timeout: 120000 }, async () => {
  const dir = await mkdtemp(join(tmpdir(), "research-install-"))
  const configDir = join(dir, ".opencode")
  const install = (host: string) => {
    const result = spawnSync(process.execPath, [join(source, "scripts", "setup-opencode.mjs")], {
      cwd: host, encoding: "utf8", timeout: 60000,
      env: { ...process.env, npm_config_offline: "true", npm_config_audit: "false", npm_config_fund: "false" },
    })
    assert.equal(result.status, 0, result.stdout + result.stderr + (result.error ?? ""))
  }
  try {
    install(dir)
    const path = join(configDir, "research-settings.json")
    assert.deepEqual(await readSettings(path), JSON.parse(await readFile(join(source, "research-settings.example.json"), "utf8")))
    const fresh = JSON.parse(await readFile(join(configDir, "opencode.json"), "utf8"))
    assert.equal(fresh.subagent_depth, undefined)
    assert.equal(fresh.agent.explore.permission.publish_code_report, "allow")
    assert.equal(fresh.agent.explore.permission.task, "deny")
    assert.deepEqual(await readdir(join(configDir, "plugin")), ["research.ts"])

    const settings = await readSettings(path)
    settings.proyecto.repositorio = dir
    settings.sesiones.carpetaRaiz = "informes-personales/sesiones"
    settings.skills.pregunta.maxRepreguntasEspecialistas = 7
    const { board, ...oldProject } = settings.proyecto
    const old = { proyecto: oldProject, agentes: { coordinador: settings.skills.pregunta,
      codigo: settings.skills["lee-codigo"], documentacion: settings.skills["lee-docs"] }, sesiones: settings.sesiones }
    await rm(path)
    await writeFile(join(configDir, "agent-settings.json"), JSON.stringify(old))
    for (const file of ["plugin/agent-session.ts", "plugin/markitdown-utf8.ts", "tools/agent_settings.ts", "tools/coordinator_defaults.ts", "tools/publish_agent_deliverable.ts", "tools/write_report_pair.ts", "tools/session_store.ts", "agents/lector-codigo.md", "agent/lector-docs.md", "tools/anfitrion.ts"]) {
      await mkdir(dirname(join(configDir, file)), { recursive: true })
      await writeFile(join(configDir, file), "Archivo previo")
    }
    await writeFile(join(dir, "opencode.json"), JSON.stringify({ $schema: fresh.$schema, model: "openai/modelo-anfitrion", agent: { explore: { permission: {
      mcp_board_read: "allow", agent_settings: "allow", publish_agent_deliverable: "allow", edit: "allow",
    } } } }))
    install(dir)
    assert.deepEqual(await readSettings(path), settings)
    await assert.rejects(lstat(join(configDir, "agent-settings.json")), { code: "ENOENT" })
    assert.deepEqual(await readdir(join(configDir, "plugin")), ["research.ts"])
    assert.deepEqual(await readdir(join(configDir, "tools")), ["anfitrion.ts"])
    assert.deepEqual(await readdir(join(configDir, "agents")), [])
    assert.deepEqual(await readdir(join(configDir, "agent")), [])
    const config = JSON.parse(await readFile(join(dir, "opencode.json"), "utf8"))
    assert.equal(config.model, "openai/modelo-anfitrion")
    assert.equal(config.agent.explore.permission.mcp_board_read, "allow")
    assert.equal(config.agent.explore.permission.edit, "deny")
    assert.equal(config.agent.explore.permission.agent_settings, undefined)
    assert.equal(config.agent.explore.permission.publish_agent_deliverable, undefined)
    settings.skills["lee-codigo"].guardarEntregablesEnSesion = false
    await writeFile(path, JSON.stringify(settings))
    install(dir)
    assert.deepEqual(await readSettings(path), settings)
  } finally { await rm(dir, { recursive: true, force: true }) }
})

test("las skills solo enlazan recursos existentes y explican las tools instaladas", async () => {
  for (const name of ["pregunta", "lee-codigo", "lee-docs"]) {
    const dir = join(source, ".apm", "skills", name)
    const markdown = await readFile(join(dir, "SKILL.md"), "utf8")
    assert.match(markdown, new RegExp(`^---\\r?\\nname: ${name}\\r?\\ndescription: .+`, "m"))
    for (const [, target] of markdown.matchAll(/\]\(([^)]+)\)/g)) {
      assert.ok((await lstat(resolve(dir, target))).isFile(), `${name}: ${target}`)
    }
    assert.doesNotMatch(markdown, /agent_settings|coordinator_defaults|publish_agent_deliverable|agentes\./)
  }
})
