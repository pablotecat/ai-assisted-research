import assert from "node:assert/strict"
import fs, { cp, lstat, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises"
import { spawnSync } from "node:child_process"
import { syncBuiltinESMExports } from "node:module"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import test from "node:test"
import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js"
import plugin from "./plugin/research.ts"
import { configureSettings, publishSession, readSettings, resolveSettingsPath, saveMissingProject, startResearch, type Identity } from "./lib/research.ts"

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
    another: { id: "another", agent: "build", primary: true, title: "Duda sobre pagos", created: Date.UTC(2026, 9, 5), directory: dir },
    code: { id: "code", parentID: "coord", agent: "explore", skill: "lee-codigo", title: "Código", created: 1, directory: dir },
    docs: { id: "docs", parentID: "coord", agent: "explore", skill: "lee-docs", title: "Documentos", created: 1, directory: dir },
    direct: { id: "direct", agent: "explore", skill: "lee-codigo", title: "Código directo", created: 1, directory: dir },
    plain: { id: "plain", parentID: "coord", agent: "explore", title: "Sin skill", created: 1, directory: dir },
    custom: { id: "custom", agent: "investigador", primary: true, title: "Pregunta personalizada", created: 1, directory: dir },
    customCode: { id: "customCode", parentID: "custom", agent: "explore", skill: "lee-codigo", title: "Código", created: 1, directory: dir },
    genericReader: { id: "genericReader", parentID: "custom", agent: "lector-local", skill: "lee-codigo", title: "Código genérico", created: 1, directory: dir },
  }
  const opts = { settingsPath: path,
    get: async (id: string) => nodes[id] ?? Promise.reject(new Error("Sesión desconocida")) }
  try {
    const settings = await readSettings(path)
    assert.deepEqual(Object.keys(settings.skills), ["investiga", "lee-codigo", "lee-docs"])
    assert.equal(settings.sesiones.carpetaRaiz, "sesiones-investigacion")
    assert.deepEqual(settings.proyecto.board, { proveedor: "", url: "" })
    await saveMissingProject({ repositorio: dir }, path)
    await saveMissingProject({ repositorio: tmpdir() }, path)
    await saveMissingProject({ board: { proveedor: "github", url: "https://github.com/owner/repo/issues" } }, path)
    await saveMissingProject({ board: { proveedor: "jira", url: "https://example.atlassian.net/jira/software/projects/ABC" } }, path)
    assert.equal((await readSettings(path)).proyecto.repositorio, dir)
    assert.equal((await readSettings(path)).proyecto.board.proveedor, "github")
    await assert.rejects(saveMissingProject({ board: { proveedor: "github", url: "http://github.com/owner/repo" } }, path))

    const first = await publishSession({ sessionID: "coord", agent: "build", topic: "pagos",
      files: { "resumen-ejecutivo.md": "Resumen", "informe-detallado.md": "Informe",
        "investigacion-documentacion.md": "Evidencia documental" }, sources: ["fuente:1"] }, opts)
    assert.equal(first.guardado, true)
    if (!first.guardado) return
    assert.equal(await readFile(first.rutas["informe-detallado.md"], "utf8"), "Informe")
    assert.equal(await readFile(first.rutas["investigacion-documentacion.md"], "utf8"), "Evidencia documental")
    assert.equal(dirname(first.sesion), join(dir, "sesiones-investigacion"))
    for (const file of Object.values(first.rutas)) assert.equal(dirname(file), first.sesion)
    const next = await publishSession({ sessionID: "coord", agent: "build", topic: "fallos de pagos",
      files: { "resumen-ejecutivo.md": "Resumen y fallos", "informe-detallado.md": "Informe\n\n## Fallos\nDetalle adicional" } }, opts)
    assert.equal(next.guardado, true)
    if (!next.guardado) return
    assert.equal(next.rutas["informe-detallado.md"], first.rutas["informe-detallado.md"])
    const rewritten = await publishSession({ sessionID: "coord", agent: "build", topic: "pagos",
      files: { "resumen-ejecutivo.md": "Resumen y fallos corregidos", "informe-detallado.md": "Informe\n\n## Fallos\nDetalle corregido" } }, opts)
    assert.equal(rewritten.guardado, true)
    if (!rewritten.guardado) return
    assert.equal(dirname(rewritten.rutas["informe-detallado.md"]), dirname(next.rutas["informe-detallado.md"]))
    assert.equal(await readFile(first.rutas["informe-detallado.md"], "utf8"), "Informe\n\n## Fallos\nDetalle corregido")
    assert.equal(await readFile(next.rutas["resumen-ejecutivo.md"], "utf8"), "Resumen y fallos corregidos")

    const report = await publishSession({ sessionID: "code", agent: "explore", topic: "pagos",
      files: { "investigacion-codebase.md": "Código" } }, opts)
    assert.equal(report.guardado, true)
    if (report.guardado) {
      assert.equal(await readFile(report.rutas["investigacion-codebase.md"], "utf8"), "Código")
      assert.equal(report.sesion, first.sesion)
      assert.equal(dirname(report.rutas["investigacion-codebase.md"]), first.sesion)
    }
    const documented = await publishSession({ sessionID: "docs", agent: "explore", topic: "pagos",
      files: { "investigacion-documentacion.md": "Evidencia documental ampliada" } }, opts)
    assert.ok(documented.guardado)
    assert.equal(documented.rutas["investigacion-documentacion.md"], first.rutas["investigacion-documentacion.md"])
    const another = await publishSession({ sessionID: "another", agent: "build", topic: "pagos",
      files: { "resumen-ejecutivo.md": "Otra conversación", "informe-detallado.md": "Investigación separada" } }, opts)
    assert.ok(another.guardado)
    assert.equal(another.sesion, `${first.sesion}-02`)
    const revised = await publishSession({ sessionID: "code", agent: "explore", topic: "pagos",
      files: { "investigacion-codebase.md": "Código revisado" } }, opts)
    assert.equal(revised.guardado, true)
    if (revised.guardado && report.guardado) {
      assert.equal(revised.rutas["investigacion-codebase.md"], report.rutas["investigacion-codebase.md"])
      assert.equal(await readFile(revised.rutas["investigacion-codebase.md"], "utf8"), "Código revisado")
      assert.equal((await readFile(join(revised.sesion, "indice.md"), "utf8").then((index) =>
        index.match(/investigacion-codebase\.md\]\(\.\//g) ?? [])).length, 1)
    }
    assert.equal((await publishSession({ sessionID: "direct", agent: "explore", topic: "código",
      files: { "investigacion-codebase.md": "Directa" } }, opts)).guardado, true)
    assert.equal((await publishSession({ sessionID: "custom", agent: "investigador", topic: "pregunta",
      files: { "resumen-ejecutivo.md": "Resumen", "informe-detallado.md": "Informe" } }, opts)).guardado, true)
    assert.equal((await publishSession({ sessionID: "customCode", agent: "explore", topic: "código",
      files: { "investigacion-codebase.md": "Código" } }, opts)).guardado, true)
    assert.equal((await publishSession({ sessionID: "genericReader", agent: "lector-local", topic: "código",
      files: { "investigacion-codebase.md": "Código sin nombre de agente específico" } }, opts)).guardado, true)
    assert.match(await readFile(join(first.sesion, "indice.md"), "utf8"), /fuente:1/)
    await assert.rejects(publishSession({ sessionID: "docs", agent: "explore", topic: "pagos",
      files: { "investigacion-codebase.md": "no" } }, opts), /agente/)
    await assert.rejects(publishSession({ sessionID: "plain", agent: "explore", topic: "pagos",
      files: { "investigacion-codebase.md": "no" } }, opts), /skill/)
    await assert.rejects(publishSession({ sessionID: "code", agent: "build", topic: "pagos",
      files: { "investigacion-codebase.md": "no" } }, opts), /Autor de publicación diferente/)
    await assert.rejects(publishSession({ sessionID: "code", agent: "explore", topic: "pagos",
      files: { "../otro.md": "no" } }, opts), /Nombre de archivo no permitido/)

    const concurrent = await Promise.all([1, 2].map((n) => publishSession({ sessionID: "code", agent: "explore", topic: "pagos",
      files: { "investigacion-codebase.md": `Revisión ${n}` } }, opts)))
    assert.ok(concurrent.every((result) => result.guardado))
    const ruta = concurrent[0].guardado ? concurrent[0].rutas["investigacion-codebase.md"] : ""
    assert.equal(concurrent[1].guardado ? concurrent[1].rutas["investigacion-codebase.md"] : undefined, ruta)
    assert.match(await readFile(ruta, "utf8"), /Revisión [12]/)

    const current = await readSettings(path)
    const disabled = { ...current, skills: { ...current.skills,
      "investiga": { ...current.skills["investiga"], especialistasPermitidos: ["documentacion"] } } }
    await writeFile(path, JSON.stringify(disabled))
    await assert.rejects(publishSession({ sessionID: "code", agent: "explore", topic: "pagos",
      files: { "investigacion-codebase.md": "no" } }, opts), /Especialista deshabilitado/)
    disabled.skills["investiga"].especialistasPermitidos = ["codigo"]
    disabled.skills["lee-codigo"].guardarEntregablesEnSesion = false
    await writeFile(path, JSON.stringify(disabled))
    assert.deepEqual(await publishSession({ sessionID: "code", agent: "explore", topic: "pagos",
      files: { "investigacion-codebase.md": "no" } }, opts), { guardado: false })
    assert.ok((await readdir(first.sesion, { withFileTypes: true })).every((entry) => entry.isFile()))
    const globalIndex = join(dir, "sesiones-investigacion", "indice-sesiones.md")
    await assert.rejects(lstat(globalIndex), { code: "ENOENT" })
    const coordinatorIndex = `# Índice de sesiones\n\n| Fecha | Pregunta | Sesión |\n|---|---|---|\n| 2026-10-05 | ¿Cómo se paga? | [Sesión](./${first.sesion.split(/[\\/]/).at(-1)}/) |\n`
    await writeFile(globalIndex, coordinatorIndex)
    await publishSession({ sessionID: "coord", agent: "build", topic: "pagos",
      files: { "resumen-ejecutivo.md": "Resumen y fallos corregidos", "informe-detallado.md": "Informe consolidado" } }, opts)
    assert.equal(await readFile(globalIndex, "utf8"), coordinatorIndex)
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
  await assert.rejects(before({ tool: "task", sessionID: "code", callID: "nested" }, { args: {} }), /anidadas/)
  await assert.rejects(before({ tool: "bash", sessionID: "code", callID: "b" }, { args: { command: "git status; echo hola" } }), /no permitido/)
  await before({ tool: "bash", sessionID: "code", callID: "c" }, { args: { command: "git status --short" } })
  await before({ tool: "bash", sessionID: "code", callID: "codegraph" }, { args: { command: 'codegraph status "C:\\workspace" --json' } })
  await before({ tool: "publish_code_report", sessionID: "code", callID: "publish" }, { args: {} })
  await before({ tool: "publish_documentation_report", sessionID: "docs", callID: "publish-docs" }, { args: {} })
  await assert.rejects(before({ tool: "publish_documentation_report", sessionID: "code", callID: "cross" }, { args: {} }), /lector que cargó/)
  await assert.rejects(before({ tool: "publish_code_report", sessionID: "plain", callID: "plain" }, { args: {} }), /lector que cargó/)
  await assert.rejects(before({ tool: "write_report_pair", sessionID: "code", callID: "pair" }, { args: {} }), /restringida/)
  await assert.rejects(before({ tool: "start_research", sessionID: "code", callID: "new" }, { args: {} }), /restringida/)
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
  for (const command of ["markitdown --version", "python -X utf8 -m markitdown --version",
    'python -X utf8 -m markitdown "C:\\documentación con espacios\\[WIP] año → revisión.docx"']) {
    await before({ tool: "bash", sessionID: "docs", callID: "utf8" }, { args: { command } })
    for (const sessionID of ["code", "plain", "failed"])
      await assert.rejects(before({ tool: "bash", sessionID, callID: "utf8-denied" }, { args: { command } }), /no permitido/)
  }
  for (const command of [
    'python -c "print(1)"', 'python -X utf8 -c "print(1)"', 'python -X utf8 -m otro "a.docx"',
    'python script.py', 'python -m markitdown "a.docx"', 'python -X utf8 -m markitdown a.docx',
    'python -X utf8 -m markitdown "a.docx" -o otro.md', 'python -X utf8 -m markitdown -o "otro.md"',
    'python -X utf8 -m markitdown "a.docx" --output=otro.md',
    'python -X utf8 -m markitdown "a.docx" > otro.md', 'python -X utf8 -m markitdown "a.docx" | more',
    'python -X utf8 -m markitdown "a.docx"; echo hola', 'python -X utf8 -m markitdown "a.docx" && echo hola',
    'python -X utf8 -m markitdown "$(echo hola).docx"', 'python -X utf8 -m markitdown "`echo hola`.docx"',
    'python -X utf8 -m markitdown "a.docx"\necho hola',
  ]) await assert.rejects(before({ tool: "bash", sessionID: "docs", callID: "conversion-denied" }, { args: { command } }), /no permitido/)
  const tools = hooks.tool!
  const context = { agent: "revisor", sessionID: "coord", messageID: "report" } as never
  assert.deepEqual(JSON.parse(await tools.research_settings.execute({ action: "read" }, context) as string).skills, (await readSettings(path)).skills)
  await assert.rejects(tools.research_settings.execute({ action: "read" }, { agent: "explore", sessionID: "docs" } as never), /Solo el agente principal/)
  await assert.rejects(tools.research_settings.execute({ action: "saveMissing", values: {} }, { agent: "explore", sessionID: "code" } as never), /Solo el agente principal/)
  await assert.rejects(tools.publish_code_report.execute({ contenido: "No" }, { agent: "explore", sessionID: "docs" } as never), /autorizado/)
  await assert.rejects(tools.write_report_pair.execute({ slug: "consulta", resumen_ejecutivo: "No", informe_detallado: "No" }, { agent: "explore", sessionID: "code" } as never), /Solo el agente principal/)
  const delegado = JSON.parse(await tools.publish_code_report.execute({ contenido: "Del lector" }, { agent: "explore", sessionID: "code", messageID: "code" } as never) as string)
  assert.equal(await readFile(delegado.rutas["investigacion-codebase.md"], "utf8"), "Del lector")
  const report = JSON.parse(await tools.publish_code_report.execute({ contenido: "Código", fuentes: ["archivo.ts:1"] }, context) as string)
  assert.equal(await readFile(report.rutas["investigacion-codebase.md"], "utf8"), "Código")
  assert.equal(report.rutas["investigacion-codebase.md"], delegado.rutas["investigacion-codebase.md"])
  const republished = JSON.parse(await tools.publish_code_report.execute({ contenido: "Código actualizado" }, context) as string)
  assert.equal(republished.rutas["investigacion-codebase.md"], report.rutas["investigacion-codebase.md"])
  assert.equal(await readFile(republished.rutas["investigacion-codebase.md"], "utf8"), "Código actualizado")
  const pair = { slug: "consulta", resumen_ejecutivo: "Resumen", informe_detallado: "Informe" }
  const first = JSON.parse(await tools.write_report_pair.execute(pair, context) as string)
  assert.deepEqual(Object.keys(first.rutas).sort(), ["informe-detallado.md", "resumen-ejecutivo.md"])
  const pregunta = JSON.parse(await tools.write_report_pair.execute({ ...pair, resumen_ejecutivo: "Resumen 2" }, context) as string)
  assert.equal(pregunta.rutas["informe-detallado.md"], first.rutas["informe-detallado.md"])
  assert.equal(await readFile(first.rutas["resumen-ejecutivo.md"], "utf8"), "Resumen 2")
  assert.equal(dirname(first.rutas["resumen-ejecutivo.md"]), report.sesion)
  await assert.rejects(tools.start_research.execute({ tema: "Otra" }, { agent: "explore", sessionID: "code" } as never), /Solo el agente principal/)
  const opened = JSON.parse(await tools.start_research.execute({ tema: "Otra investigación" }, context) as string)
  assert.ok(opened.investigacion)
  const other = JSON.parse(await tools.write_report_pair.execute(pair, context) as string)
  assert.notEqual(other.sesion, first.sesion)
  const reloaded = await plugin({ client, directory: dir } as never)
  await reloaded.config!({ agent: { revisor: { mode: "primary" } } } as never)
  const continued = JSON.parse(await reloaded.tool!.write_report_pair.execute({ ...pair, resumen_ejecutivo: "Ampliación" }, context) as string)
  assert.equal(continued.sesion, other.sesion)
  assert.equal(await readFile(first.rutas["resumen-ejecutivo.md"], "utf8"), "Resumen 2")
  const otherCode = JSON.parse(await tools.publish_code_report.execute({ contenido: "Código de otra investigación" }, { agent: "explore", sessionID: "code", messageID: "code" } as never) as string)
  assert.equal(otherCode.sesion, other.sesion)
  const settings = await readSettings(path)
  settings.skills.investiga.guardarEntregablesEnSesion = false
  await writeFile(path, JSON.stringify(settings))
  assert.deepEqual(JSON.parse(await tools.write_report_pair.execute(pair, context) as string), { guardado: false })
  settings.skills.investiga.guardarEntregablesEnSesion = true
  await writeFile(path, JSON.stringify(settings))
  const docsOnly = JSON.parse(await tools.publish_documentation_report.execute({ contenido: "Documentación independiente" }, context) as string)
  assert.equal(await readFile(docsOnly.rutas["investigacion-documentacion.md"], "utf8"), "Documentación independiente")
  const configured = JSON.parse(await tools.research_settings.execute({ action: "configure", changes: { skills: { investiga: { modoLectura: "secuencial" } } } }, context) as string)
  assert.equal(configured.archivo, path)
  assert.equal(configured.skills.investiga.modoLectura, "secuencial")
  settings.skills.investiga.especialistasPermitidos = ["codigo"]
  await writeFile(path, JSON.stringify(settings))
  await assert.rejects(before({ tool: "skill", sessionID: "plain", callID: "disabled" }, { args: { name: "lee-docs" } }), /deshabilitado/)
  const env = { env: {} as Record<string, string> }
  await hooks["shell.env"]!({ cwd: dir }, env)
  assert.equal(env.env.PYTHONIOENCODING, "utf-8")
})

test("instalación real, migración y actualización conservan ajustes y archivos del anfitrión", { timeout: 120000 }, async () => {
  const dir = await mkdtemp(join(tmpdir(), "research-install-"))
  const configDir = join(dir, ".opencode")
  const install = (host: string, readerPermissions = false) => {
    const result = spawnSync(process.execPath, [join(source, "scripts", "setup-opencode.mjs")], {
      cwd: host, encoding: "utf8", timeout: 60000,
      env: { ...process.env, RESEARCH_READER_PERMISSIONS: readerPermissions ? "1" : "", npm_config_offline: "true", npm_config_audit: "false", npm_config_fund: "false" },
    })
    assert.equal(result.status, 0, result.stdout + result.stderr + (result.error ?? ""))
  }
  try {
    install(dir)
    const path = join(configDir, "research-settings.json")
    assert.deepEqual(await readSettings(path), JSON.parse(await readFile(join(source, "research-settings.example.json"), "utf8")))
    const fresh = JSON.parse(await readFile(join(configDir, "opencode.json"), "utf8"))
    assert.equal(fresh.subagent_depth, undefined)
    assert.equal(fresh.agent, undefined)
    assert.deepEqual(await readdir(join(configDir, "plugin")), ["research.ts"])

    const settings = await readSettings(path)
    settings.proyecto.repositorio = dir
    settings.sesiones.carpetaRaiz = "informes-personales/sesiones"
    settings.skills.investiga.maxRepreguntasEspecialistas = 7
    const { board, ...oldProject } = settings.proyecto
    const old = { proyecto: oldProject, agentes: { coordinador: settings.skills.investiga,
      codigo: settings.skills["lee-codigo"], documentacion: settings.skills["lee-docs"] }, sesiones: settings.sesiones }
    await rm(path)
    await writeFile(join(configDir, "agent-settings.json"), JSON.stringify(old))
    for (const file of ["plugin/agent-session.ts", "plugin/markitdown-utf8.ts", "tools/agent_settings.ts", "tools/coordinator_defaults.ts", "tools/publish_agent_deliverable.ts", "tools/write_report_pair.ts", "tools/session_store.ts", "agents/lector-codigo.md", "agent/lector-docs.md", "tools/anfitrion.ts"]) {
      await mkdir(dirname(join(configDir, file)), { recursive: true })
      await writeFile(join(configDir, file), "Archivo previo")
    }
    await writeFile(join(configDir, "opencode.json"), JSON.stringify({ $schema: fresh.$schema, model: "openai/modelo-anfitrion", agent: { explore: { permission: {
      mcp_board_read: "allow", agent_settings: "allow", publish_agent_deliverable: "allow", edit: "allow",
    } } } }))
    install(dir)
    assert.deepEqual(await readSettings(path), settings)
    assert.ok((await lstat(join(configDir, "agent-settings.json"))).isFile())
    assert.deepEqual((await readdir(join(configDir, "plugin"))).sort(), ["agent-session.ts", "markitdown-utf8.ts", "research.ts"])
    assert.ok((await readdir(join(configDir, "tools"))).includes("anfitrion.ts"))
    assert.deepEqual(await readdir(join(configDir, "agents")), ["lector-codigo.md"])
    assert.deepEqual(await readdir(join(configDir, "agent")), ["lector-docs.md"])
    const config = JSON.parse(await readFile(join(configDir, "opencode.json"), "utf8"))
    assert.equal(config.model, "openai/modelo-anfitrion")
    assert.equal(config.agent.explore.permission.mcp_board_read, "allow")
    assert.equal(config.agent.explore.permission.edit, "allow")
    assert.equal(config.agent.explore.permission.agent_settings, "allow")
    assert.equal(config.agent.explore.permission.publish_agent_deliverable, "allow")
    settings.skills["lee-codigo"].guardarEntregablesEnSesion = false
    await writeFile(path, JSON.stringify(settings))
    install(dir)
    assert.deepEqual(await readSettings(path), settings)
    const { "investiga": coordinator, ...readers } = settings.skills
    await writeFile(path, JSON.stringify({ ...settings, skills: { "necesito-saber": coordinator, ...readers } }))
    install(dir)
    assert.deepEqual(await readSettings(path), settings)
    await writeFile(path, JSON.stringify({ ...settings, skills: { pregunta: coordinator, ...readers } }))
    install(dir)
    assert.deepEqual(await readSettings(path), settings)
    const common = join(dir, "research-settings.json")
    await cp(path, common)
    await rm(path)
    install(dir)
    assert.deepEqual(await readSettings(common), settings)
    await assert.rejects(lstat(path), { code: "ENOENT" })
    install(dir, true)
    const restricted = JSON.parse(await readFile(join(configDir, "opencode.json"), "utf8"))
    const permissions = JSON.parse(await readFile(join(source, "opencode.json"), "utf8")).agent.explore.permission
    assert.deepEqual(restricted.agent.explore.permission, permissions)
    assert.equal(restricted.model, "openai/modelo-anfitrion")
    assert.equal(permissions.bash["python -X utf8 -m markitdown --version"], "allow")
    assert.equal(permissions.bash['python -X utf8 -m markitdown "*"'], "allow")
    assert.deepEqual(Object.keys(permissions.bash).filter((key) => key.startsWith("python")),
      ["python -X utf8 -m markitdown --version", 'python -X utf8 -m markitdown "*"'])
    assert.equal(permissions.bash["*"], "deny")
    assert.equal(await readFile(join(configDir, "plugin", "research.ts"), "utf8"), await readFile(join(source, "plugin", "research.ts"), "utf8"))
  } finally { await rm(dir, { recursive: true, force: true }) }
})

test("Copilot migra el nombre conservando ajustes y publicación de informes", { timeout: 120000 }, async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "research-copilot-"))
  t.after(() => rm(dir, { recursive: true, force: true }))
  const settings = JSON.parse(await readFile(join(source, "research-settings.example.json"), "utf8"))
  settings.proyecto.repositorio = dir
  settings.sesiones.carpetaRaiz = "informes-personales/sesiones"
  settings.skills.investiga.maxRepreguntasEspecialistas = 7
  const { "investiga": coordinator, ...readers } = settings.skills
  const path = join(dir, ".github", "research-settings.json")
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, JSON.stringify({ ...settings, skills: { pregunta: coordinator, ...readers } }))
  const vscode = join(dir, ".vscode", "mcp.json")
  await mkdir(dirname(vscode), { recursive: true })
  await writeFile(vscode, '// Conector ajeno del anfitrión\n{"servers":{"externo":{"type":"stdio","command":"otro","args":[]}},}\n')
  const install = () => spawnSync(process.execPath, [join(source, "scripts", "setup-copilot.mjs")], {
    cwd: dir, encoding: "utf8", timeout: 60000,
    env: { ...process.env, npm_config_offline: "true", npm_config_audit: "false", npm_config_fund: "false" },
  })
  const installed = install()
  assert.equal(installed.status, 0, installed.stdout + installed.stderr + (installed.error ?? ""))
  assert.deepEqual(await readSettings(path), settings)
  const configured = await readFile(vscode, "utf8")
  assert.match(configured, /Conector ajeno del anfitrión/)
  assert.match(configured, /"externo"/)
  const repeated = install()
  assert.equal(repeated.status, 0, repeated.stdout + repeated.stderr + (repeated.error ?? ""))
  assert.equal(await readFile(vscode, "utf8"), configured)
  assert.deepEqual(await readSettings(path), settings)
  const client = new Client({ name: "research-test", version: "1.0.0" })
  t.after(() => client.close())
  await client.connect(new StdioClientTransport({ command: process.execPath,
    args: [join(dir, ".github", "research", "copilot", "server.ts"), "--workspace", dir, "--role", "control"] }))
  const invoke = async (name: string, args: Record<string, unknown>) => {
    const response = await client.callTool({ name, arguments: args })
    assert.notEqual(response.isError, true, JSON.stringify(response))
    return JSON.parse((response.content as { text: string }[])[0].text)
  }
  const { investigacion } = await invoke("start_research", { tema: "Consulta" })
  const report = await invoke("write_report_pair", { investigacion, resumen_ejecutivo: "Resumen",
    informe_detallado: "Informe" })
  assert.equal(report.guardado, true)
  assert.equal(dirname(report.rutas["informe-detallado.md"]), report.sesion)
  assert.equal(dirname(report.sesion), join(dir, "informes-personales", "sesiones"))
  const rewritten = await invoke("write_report_pair", { investigacion, resumen_ejecutivo: "Resumen revisado",
    informe_detallado: "Informe revisado" })
  assert.equal(rewritten.guardado, true)
  assert.equal(dirname(rewritten.rutas["informe-detallado.md"]), dirname(report.rutas["informe-detallado.md"]))
  assert.equal(await readFile(rewritten.rutas["informe-detallado.md"], "utf8"), "Informe revisado")
  const changed = await invoke("research_settings", { action: "configure", changes: {
    skills: { investiga: { guardarEntregablesEnSesion: false, modoLectura: "secuencial" } },
    proyecto: { board: { url: "https://board.example/project", proveedor: "otro-sistema" } },
  } })
  assert.equal(changed.archivo, path)
  assert.equal(changed.proyecto.repositorio, dir)
  const docs = await invoke("publish_documentation_report", { investigacion, contenido: "Documentación independiente" })
  assert.equal(await readFile(docs.rutas["investigacion-documentacion.md"], "utf8"), "Documentación independiente")
  const code = await invoke("publish_code_report", { investigacion, contenido: "Código desde el principal" })
  assert.equal(await readFile(code.rutas["investigacion-codebase.md"], "utf8"), "Código desde el principal")
  const republished = await invoke("publish_code_report", { investigacion, contenido: "Código actualizado" })
  assert.equal(republished.rutas["investigacion-codebase.md"], code.rutas["investigacion-codebase.md"])
  assert.equal(await readFile(republished.rutas["investigacion-codebase.md"], "utf8"), "Código actualizado")
  assert.equal(code.sesion, docs.sesion)
  assert.equal(dirname(code.rutas["investigacion-codebase.md"]), report.sesion)
  const second = await invoke("start_research", { tema: "Consulta separada" })
  const separate = await invoke("publish_documentation_report", { investigacion: second.investigacion, contenido: "Otra documentación" })
  assert.notEqual(separate.sesion, docs.sesion)
  assert.equal(await readFile(docs.rutas["investigacion-documentacion.md"], "utf8"), "Documentación independiente")
  assert.deepEqual(await invoke("write_report_pair", { investigacion, resumen_ejecutivo: "Resumen", informe_detallado: "Informe" }), { guardado: false })
})

test("las skills solo enlazan recursos existentes y explican las tools instaladas", async () => {
  for (const name of ["setup", "investiga", "lee-codigo", "lee-docs"]) {
    const dir = join(source, ".apm", "skills", name)
    const markdown = await readFile(join(dir, "SKILL.md"), "utf8")
    assert.match(markdown, new RegExp(`^---\\r?\\nname: ${name}\\r?\\ndescription: .+`, "m"))
    for (const [, target] of markdown.matchAll(/\]\(([^)]+)\)/g)) {
      assert.ok((await lstat(resolve(dir, target))).isFile(), `${name}: ${target}`)
    }
    assert.doesNotMatch(markdown, /agent_settings|coordinator_defaults|publish_agent_deliverable|\bagentes\./)
    assert.doesNotMatch(markdown, /OpenCode|Copilot|Jira|Azure DevOps|GitHub|\.opencode|\.github|setup-opencode|setup-copilot/i)
  }
  async function checkReferences(dir: string) {
    for (const item of await readdir(dir, { withFileTypes: true })) {
      const path = join(dir, item.name)
      if (item.isDirectory()) await checkReferences(path)
      else if (item.name.endsWith(".md")) {
        const text = await readFile(path, "utf8")
        assert.doesNotMatch(text, /OpenCode|Copilot|Jira|Azure DevOps|GitHub|\.opencode|\.github|setup-opencode|setup-copilot/i)
        for (const [, target] of text.matchAll(/\]\(([^)]+)\)/g)) assert.ok((await lstat(resolve(dir, target))).isFile(), `${path}: ${target}`)
      }
    }
  }
  await checkReferences(join(source, ".apm", "skills"))
})

test("la presentación responde a la pregunta sin volcar informes por el estado del guardado", async () => {
  const skills = join(source, ".apm", "skills")
  const presentation = await readFile(join(skills, "contrato", "references", "presentacion.md"), "utf8")
  assert.match(presentation, /En el chat responde únicamente a la pregunta actual/)
  assert.match(presentation, /independientemente del estado del guardado/)
  assert.match(presentation, /solo por petición expresa del usuario/)
  assert.match(presentation, /devoluciones entre agentes/)
  assert.doesNotMatch(presentation, /250.?500|Informe completo compacto de esa parte|contenido completo de las partes pendientes/)
  const coordinator = await readFile(join(skills, "investiga", "SKILL.md"), "utf8")
  assert.doesNotMatch(coordinator, /contenido completo solo de las partes sin guardado confirmado/)
  for (const name of ["lee-codigo", "lee-docs"]) {
    const reader = await readFile(join(skills, name, "SKILL.md"), "utf8")
    assert.match(reader, /\[presentación al usuario\]\(\.\.\/contrato\/references\/presentacion\.md\)/)
  }
})

test("el contrato asigna al coordinador el índice portable y exige documentos consolidados", async () => {
  const references = join(source, ".apm", "skills", "contrato", "references")
  const publication = await readFile(join(references, "publicacion.md"), "utf8")
  const index = await readFile(join(references, "indice-sesiones.md"), "utf8")
  const report = await readFile(join(references, "informe.md"), "utf8")
  const coordinator = await readFile(join(source, ".apm", "skills", "investiga", "SKILL.md"), "utf8")
  assert.match(publication, /investigacion-codebase\.md/)
  assert.match(publication, /preguntas posteriores amplían la investigación activa/)
  assert.match(publication, /\[índice global de sesiones\]\(indice-sesiones\.md\)/)
  assert.match(index, /coordinador mantiene/)
  assert.match(index, /herramientas nativas de lectura y escritura/)
  assert.match(index, /`Fecha`, `Pregunta` y `Sesión`/)
  assert.match(index, /ya cubiertas/)
  assert.match(index, /al menos un entregable confirmado/)
  assert.match(index, /omite la creación de carpetas o entradas vacías/)
  assert.match(index, /conserva los informes confirmados/)
  assert.match(index, /índice pendiente/)
  assert.match(report, /conserva hallazgos anteriores válidos con sus citas/)
  assert.match(report, /recupera su versión vigente/)
  assert.match(coordinator, /cada informe habilitado y el índice que corresponda estén confirmados/)
  assert.doesNotMatch(publication, /subcarpeta|una entrega nueva por pregunta/)
})

test("la publicación prepara todos los destinos y restaura informes e índice si falla el commit", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "research-transaction-"))
  t.after(() => rm(dir, { recursive: true, force: true }))
  const settingsPath = await settingsFile(dir)
  const node: Identity = { id: "main", agent: "principal", primary: true, title: "Publicación", created: Date.now(), directory: dir }
  const options = { settingsPath, get: async () => node }
  const input = { sessionID: node.id, agent: node.agent, topic: "Publicación", files: {
    "resumen-ejecutivo.md": "Conclusión válida", "informe-detallado.md": "Hallazgos válidos con sus citas",
  } }
  const first = await publishSession(input, options)
  assert.ok(first.guardado)
  const indexPath = join(first.sesion, "indice.md")
  const indexBefore = await readFile(indexPath, "utf8")
  const control = join(dir, "sesiones-investigacion", ".control")
  const stateDir = join(control, (await readdir(control))[0])
  const statePath = join(stateDir, "state.json")
  const stateBefore = await readFile(statePath, "utf8")

  await mkdir(join(first.sesion, "investigacion-documentacion.md"))
  await assert.rejects(publishSession({ ...input, files: {
    "resumen-ejecutivo.md": "No debe sustituir lo válido", "investigacion-documentacion.md": "Destino ocupado",
  } }, options), /archivo regular/)
  assert.equal(await readFile(first.rutas["resumen-ejecutivo.md"], "utf8"), input.files["resumen-ejecutivo.md"])

  const rename = fs.rename
  const mocked = t.mock.method(fs, "rename", async (from, to) => {
    if (to === statePath) throw new Error("Fallo simulado al confirmar el estado")
    return rename(from, to)
  })
  syncBuiltinESMExports()
  try {
    await assert.rejects(publishSession({ ...input, files: {
      "resumen-ejecutivo.md": "Ampliación fallida", "informe-detallado.md": "Detalle fallido",
    }, sources: ["fuente-fallida"] }, options), /Fallo simulado/)
  } finally {
    mocked.mock.restore()
    syncBuiltinESMExports()
  }
  for (const [name, content] of Object.entries(input.files)) assert.equal(await readFile(first.rutas[name], "utf8"), content)
  assert.equal(await readFile(indexPath, "utf8"), indexBefore)
  assert.equal(await readFile(statePath, "utf8"), stateBefore)
  assert.deepEqual(await readdir(stateDir), ["state.json"])
  const expanded = await publishSession({ ...input, files: {
    "resumen-ejecutivo.md": "Conclusión válida y ampliación", "informe-detallado.md": "Hallazgos válidos con sus citas y ampliación",
  } }, options)
  assert.ok(expanded.guardado)
  assert.deepEqual(expanded.rutas, first.rutas)
})

test("ajustes antiguos, proveedor abierto y parches mínimos validados", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "research-settings-"))
  t.after(() => rm(dir, { recursive: true, force: true }))
  const path = await settingsFile(dir)
  const old = await readSettings(path)
  delete old.skills.investiga.modoLectura
  await writeFile(path, JSON.stringify(old))
  const before = await readFile(path, "utf8")
  assert.equal((await readSettings(path)).skills.investiga.modoLectura ?? "auto", "auto")
  assert.equal(await readFile(path, "utf8"), before)
  const changed = await configureSettings({ proyecto: { board: { url: "https://custom.example/project" } },
    skills: { "lee-docs": { guardarEntregablesEnSesion: false }, "investiga": { modoLectura: "secuencial" } } }, path)
  assert.equal(changed.proyecto.board.url, "https://custom.example/project")
  assert.equal(changed.skills.investiga.maxRepreguntasEspecialistas, old.skills.investiga.maxRepreguntasEspecialistas)
  assert.deepEqual(changed.sesiones, old.sesiones)
  await configureSettings({ proyecto: { board: { proveedor: "sistema-abierto" } } }, path)
  assert.equal((await readSettings(path)).proyecto.board.proveedor, "sistema-abierto")
  const valid = await readFile(path, "utf8")
  for (const patch of [
    { proyecto: { board: { url: "http://custom.example/project" } } },
    { proyecto: { repositorio: "relativo" } },
    { proyecto: { carpetasDocumentales: ["relativa"] } },
    { skills: { "investiga": { modoLectura: "inventado" } } },
    { sesiones: { carpetaRaiz: "../fuera" } },
    { desconocido: true },
  ]) await assert.rejects(configureSettings(patch as never, path))
  assert.equal(await readFile(path, "utf8"), valid)
  await saveMissingProject({ board: { proveedor: "otro", url: "https://otro.example" } }, path)
  assert.equal(await readFile(path, "utf8"), valid)
})

test("resolución compartida prioriza selección, integración y común; excluye paquetes y pide ambigüedad", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "research-resolver-"))
  t.after(() => rm(dir, { recursive: true, force: true }))
  const common = join(dir, "research-settings.json")
  const active = await settingsFile(dir)
  assert.equal(await resolveSettingsPath(dir, active, "seleccion.json"), join(dir, "seleccion.json"))
  await cp(active, common)
  assert.equal(await resolveSettingsPath(dir, active), active)
  assert.equal(await resolveSettingsPath(dir), common)
  await rm(common)
  const ignored = join(dir, "apm_modules", "package", "research-settings.json")
  await mkdir(dirname(ignored), { recursive: true })
  await cp(active, ignored)
  const nested = join(dir, ".worktrees", "otro", ".github", "research-settings.json")
  await mkdir(dirname(nested), { recursive: true })
  await mkdir(join(dir, ".worktrees", "otro", ".git"))
  await cp(active, nested)
  const example = join(dir, "docs", "examples", "research-settings.json")
  await mkdir(dirname(example), { recursive: true })
  await cp(active, example)
  assert.equal(await resolveSettingsPath(dir), active)
  const second = join(dir, ".config", "research-settings.json")
  await mkdir(dirname(second), { recursive: true })
  await cp(active, second)
  await assert.rejects(resolveSettingsPath(dir), /Selecciona la configuración/)
})

test("los ocho estados de guardado son independientes al publicar desde un principal", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "research-saving-"))
  t.after(() => rm(dir, { recursive: true, force: true }))
  const path = await settingsFile(dir)
  const node: Identity = { id: "main", agent: "personalizado", primary: true, title: "Guardados", created: Date.now(), directory: dir }
  const options = { settingsPath: path, get: async () => node }
  for (let mask = 0; mask < 8; mask++) {
    await configureSettings({ skills: {
      "lee-codigo": { guardarEntregablesEnSesion: Boolean(mask & 1) },
      "lee-docs": { guardarEntregablesEnSesion: Boolean(mask & 2) },
      "investiga": { guardarEntregablesEnSesion: Boolean(mask & 4) },
    } }, path)
    const result = await publishSession({ sessionID: "main", agent: node.agent, topic: "guardados", files: {
      "investigacion-codebase.md": `Código ${mask}`, "investigacion-documentacion.md": `Docs ${mask}`,
      "resumen-ejecutivo.md": `Resumen ${mask}`, "informe-detallado.md": `Informe ${mask}`,
    } }, options)
    assert.equal(result.guardado, Boolean(mask))
    if (!result.guardado) {
      assert.deepEqual(await startResearch({ sessionID: "main", agent: node.agent, topic: "Sin guardado" }, options), { guardado: false })
      await assert.rejects(lstat(join(dir, "sesiones-investigacion")), { code: "ENOENT" })
      continue
    }
    assert.equal(Boolean(result.rutas["investigacion-codebase.md"]), Boolean(mask & 1))
    assert.equal(Boolean(result.rutas["investigacion-documentacion.md"]), Boolean(mask & 2))
    assert.equal(Boolean(result.rutas["informe-detallado.md"]), Boolean(mask & 4))
    assert.equal(Boolean(result.rutas["resumen-ejecutivo.md"]), Boolean(mask & 4))
    for (const path of Object.values(result.rutas)) {
      assert.equal(dirname(path), result.sesion)
      assert.ok((await readFile(path, "utf8")).includes(String(mask)))
    }
  }
  await configureSettings({ skills: { "investiga": { especialistasPermitidos: ["documentacion"] } } }, path)
  await assert.rejects(publishSession({ sessionID: "main", agent: node.agent, topic: "no permitido", files: { "investigacion-codebase.md": "Código" } }, options), /Especialista deshabilitado/)
})

test("los instaladores detectan conflictos antes de aplicar archivos", async (t) => {
  for (const target of ["opencode", "copilot"]) {
    const dir = await mkdtemp(join(tmpdir(), "research-preflight-"))
    t.after(() => rm(dir, { recursive: true, force: true }))
    const path = target === "opencode" ? join(dir, "opencode.jsonc") : join(dir, ".vscode", "mcp.json")
    await mkdir(dirname(path), { recursive: true })
    const text = target === "opencode" ? "{ agent: invalid }" : '{"servers":{"research-control":{"command":"ajeno","args":["ajeno.ts"]}}}'
    await writeFile(path, text)
    const result = spawnSync(process.execPath, [join(source, "scripts", `setup-${target}.mjs`)], { cwd: dir, encoding: "utf8", timeout: 10000 })
    assert.notEqual(result.status, 0)
    assert.equal(await readFile(path, "utf8"), text)
    await assert.rejects(lstat(join(dir, target === "opencode" ? ".opencode" : ".github")), { code: "ENOENT" })
  }
})

test("un fallo de guardado o una ruta enlazada no publican entregas ni modifican el destino", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "research-routes-"))
  t.after(() => rm(dir, { recursive: true, force: true }))
  const path = await settingsFile(dir)
  const node: Identity = { id: "main", agent: "principal", primary: true, title: "Rutas", created: Date.now(), directory: dir }
  const options = { settingsPath: path, get: async () => node }
  const input = { sessionID: "main", agent: node.agent, topic: "Rutas", files: { "investigacion-documentacion.md": "Informe completo" } }
  await writeFile(join(dir, "obstaculo"), "Conservar")
  await configureSettings({ sesiones: { carpetaRaiz: "obstaculo/sesiones" } }, path)
  await assert.rejects(publishSession(input, options))
  assert.equal(await readFile(join(dir, "obstaculo"), "utf8"), "Conservar")
  const target = join(dir, "destino")
  await mkdir(target)
  await symlink(target, join(dir, "enlace"), process.platform === "win32" ? "junction" : "dir")
  await configureSettings({ sesiones: { carpetaRaiz: "enlace/sesiones" } }, path)
  await assert.rejects(publishSession(input, options), /enlazada/)
  assert.deepEqual(await readdir(target), [])
})
