import { existsSync } from 'node:fs'
import path from 'node:path'
import { createServer } from 'vite'
import { startPreview } from './dev-server.ts'

/** Own the servers directly so Windows teardown needs no process-tree kill. */
export default async function setup() {
  await import('./prepare-fixture.mjs')
  const browserPath = process.env.REVISE_CHROMIUM_PATH ?? (process.platform === 'win32' && existsSync('C:/Program Files/Google/Chrome/Application/chrome.exe') ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : undefined)
  const vite = await createServer({ root: path.resolve('work/e2e-project'), configFile: path.resolve('examples/vite-react/vite.config.ts'), server: { host: '127.0.0.1', port: 45210, strictPort: true } })
  let preview: Awaited<ReturnType<typeof startPreview>> | undefined
  try {
    await vite.listen()
    preview = await startPreview({ workspace: 'work/e2e-project', port: 45211, token: 'e2e-local-preview-token', browserPath })
  } catch (error) { await preview?.close(); await vite.close(); throw error }
  return async () => { await preview!.close(); await vite.close() }
}
