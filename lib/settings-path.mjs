import { lstat, readdir } from "node:fs/promises"
import { join, resolve } from "node:path"

// La integración activa conserva prioridad; una selección explícita nunca se sustituye.
export async function resolveSettingsPath(directory, active, explicit) {
  if (explicit) return resolve(directory, explicit)
  const exists = async (path) => lstat(path).then(() => true, (error) => {
    if (error.code !== "ENOENT") throw error
    return false
  })
  if (active && await exists(active)) return active
  const common = join(directory, "research-settings.json")
  if (await exists(common)) return common
  const candidates = []
  const excluded = new Set([".git", "node_modules", "apm_modules", ".cache", ".npm", ".yarn", ".pnpm-store", ".codegraph", ".next", ".turbo", ".venv", "venv", "dist", "build", "coverage", "__pycache__"])
  async function scan(path) {
    if (path !== directory && await exists(join(path, ".git"))) return
    for (const entry of await readdir(path, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) continue
      const target = join(path, entry.name)
      const configurationFolder = entry.name.startsWith(".") || /^(?:config(?:uration)?s?|settings|ajustes)$/i.test(entry.name)
      if (entry.isDirectory() && !excluded.has(entry.name) && (path !== directory || configurationFolder)) await scan(target)
      else if (entry.isFile() && entry.name === "research-settings.json") candidates.push(target)
    }
  }
  await scan(directory)
  if (candidates.length > 1) throw new Error(`Selecciona la configuración del proyecto: ${candidates.join(", ")}`)
  return candidates[0] ?? common
}
