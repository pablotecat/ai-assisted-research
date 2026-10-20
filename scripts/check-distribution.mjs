import assert from "node:assert/strict"
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises"
import { spawnSync } from "node:child_process"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const source = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const root = await mkdtemp(join(tmpdir(), "research-distribution-"))
try {
  const bundle = join(root, "package")
  await mkdir(bundle)
  for (const path of [".apm", "apm.yml", "research-settings.example.json", "README.md", "scripts", "lib", "plugin", "copilot", "opencode.json", "package.json"])
    await cp(join(source, path), join(bundle, path), { recursive: true })
  for (const target of ["opencode", "copilot"]) {
    const host = join(root, target)
    await mkdir(host)
    await writeFile(join(host, "apm.yml"), `name: distribution-check\nversion: 0.0.0\ndependencies:\n  apm: []\n`)
    const result = spawnSync("apm", ["install", bundle, "--target", target], { cwd: host, encoding: "utf8", timeout: 60000 })
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`)
    const skills = join(host, ".agents", "skills")
    const names = await readdir(skills)
    for (const name of ["setup", "necesito-saber", "lee-codigo", "lee-docs"]) assert.ok(names.includes(name), `${target}: ${name} (${names})`)
    async function links(path) {
      for (const item of await readdir(path, { withFileTypes: true })) {
        const file = join(path, item.name)
        if (item.isDirectory()) await links(file)
        else if (item.name.endsWith(".md")) {
          const text = await readFile(file, "utf8")
          for (const [, link] of text.matchAll(/\]\(([^)]+)\)/g)) if (!link.includes("://")) await readFile(resolve(dirname(file), link))
        }
      }
    }
    await links(skills)
    const setup = await readFile(join(skills, "setup", "SKILL.md"), "utf8")
    assert.match(setup, /disable-model-invocation: true/)
    assert.match(setup, /solo por petición explícita/)
    const command = target === "opencode" ? join(host, ".opencode", "commands", "setup.md") : join(host, ".github", "prompts", "setup.prompt.md")
    assert.match(await readFile(command, "utf8"), /Carga la skill `setup`/)
    const installed = join(host, "apm_modules", "_local", "package")
    assert.deepEqual(JSON.parse(await readFile(join(installed, "research-settings.example.json"), "utf8")), JSON.parse(await readFile(join(source, "research-settings.example.json"), "utf8")))
    console.log(`${target}: cuatro skills, referencias relativas y plantilla instalada comprobadas.`)
  }
} finally { await rm(root, { recursive: true, force: true }) }
