import { lstat, mkdir, readFile, readdir, realpath, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { ReviseError } from '../shared/model.ts'

const SOURCE_EXT = /\.(?:tsx?|jsx?|css|scss|sass|less|html|json)$/i
const ROOT_SOURCE = /^(?:index\.html|package\.json|vite\.config\.[cm]?[jt]s|tsconfig(?:\.[\w-]+)?\.json)$/
export function assertInside(root: string, file: string): string {
  const relative = path.relative(root, file)
  if (relative.startsWith('..' + path.sep) || relative === '..' || path.isAbsolute(relative)) {
    throw new ReviseError('path-outside-workspace', '路径必须在当前会话的项目目录内。')
  }
  return file
}

export async function metadataDir(workspace: string): Promise<string> {
  const root = await realpath(workspace)
  const dir = path.join(root, '.dsh-revise')
  try {
    if ((await lstat(dir)).isSymbolicLink()) throw new ReviseError('unsafe-storage', '.dsh-revise 不能是符号链接。')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    await mkdir(dir)
  }
  assertInside(root, await realpath(dir))
  return dir
}

export async function roundDir(workspace: string, id: string, create = false): Promise<string> {
  if (!/^[0-9a-f-]{36}$/.test(id)) throw new ReviseError('invalid-id', '无效的改稿编号。')
  const parent = await metadataDir(workspace)
  const dir = path.join(parent, id)
  if (create) await mkdir(dir, { recursive: true })
  const stat = await lstat(dir)
  if (stat.isSymbolicLink()) throw new ReviseError('unsafe-storage', '改稿目录不能是符号链接。')
  assertInside(parent, await realpath(dir))
  return dir
}

export async function atomicWrite(file: string, value: string | Uint8Array): Promise<void> {
  try {
    if ((await lstat(file)).isSymbolicLink()) throw new ReviseError('unsafe-storage', '记录文件不能是符号链接。')
  } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error }
  const temporary = `${file}.${randomUUID()}.tmp`
  await writeFile(temporary, value, { flag: 'wx' })
  await rename(temporary, file)
}

export async function readRecord(dir: string, name: string): Promise<string> {
  const file = path.join(dir, name)
  if ((await lstat(file)).isSymbolicLink()) throw new ReviseError('unsafe-storage', '记录文件不能是符号链接。')
  assertInside(dir, await realpath(file))
  return readFile(file, 'utf8')
}

/** Snapshot the supported source surface; never silently omit oversized files. */
export async function readSources(workspace: string): Promise<Record<string, string>> {
  const root = await realpath(workspace)
  const files: Record<string, string> = {}
  let bytes = 0
  async function read(file: string): Promise<void> {
    const resolved = await realpath(file)
    assertInside(root, resolved)
    const key = path.relative(root, file).split(path.sep).join('/')
    const data = await readFile(file)
    bytes += data.byteLength
    if (data.byteLength > 512_000 || bytes > 5_000_000 || Object.keys(files).length >= 500) {
      throw new ReviseError('source-limit', '首版源码快照上限：500 个文件、单文件 512 KB、合计 5 MB。请使用较小的前端项目。')
    }
    files[key] = data.toString('utf8')
  }
  async function walk(dir: string): Promise<void> {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.') || ['node_modules', 'dist', 'build', 'coverage'].includes(entry.name)) continue
      const file = path.join(dir, entry.name)
      if (entry.isSymbolicLink()) throw new ReviseError('source-symlink', '源码目录中的符号链接暂不支持。')
      if (entry.isDirectory()) await walk(file)
      else if (SOURCE_EXT.test(entry.name)) await read(file)
    }
  }
  for (const entry of await readdir(root, { withFileTypes: true })) {
    if (entry.isSymbolicLink() && (ROOT_SOURCE.test(entry.name) || ['src', 'app', 'pages', 'components'].includes(entry.name))) throw new ReviseError('source-symlink', '源码目录中的符号链接暂不支持。')
    if (entry.isFile() && ROOT_SOURCE.test(entry.name)) await read(path.join(root, entry.name))
    if (entry.isDirectory() && ['src', 'app', 'pages', 'components'].includes(entry.name)) await walk(path.join(root, entry.name))
  }
  if (!Object.keys(files).length) throw new ReviseError('no-sources', '未找到支持的前端源码：需要 src/ 等目录或 index.html。')
  return Object.fromEntries(Object.entries(files).sort(([a], [b]) => a.localeCompare(b)))
}
export function sameSources(a: Record<string, string>, b: Record<string, string>): boolean {
  const keys = Object.keys(a)
  return keys.length === Object.keys(b).length && keys.every(key => a[key] === b[key])
}
