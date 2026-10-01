import { mkdir, copyFile, cp, rm } from 'node:fs/promises'
import path from 'node:path'
const parent = path.resolve('work')
const target = path.resolve('work/e2e-project')
if (!target.startsWith(parent + path.sep)) throw new Error('Fixture path escaped work/.')
await rm(target, { recursive: true, force: true })
await mkdir(target, { recursive: true })
await copyFile('examples/vite-react/index.html', path.join(target, 'index.html'))
await cp('examples/vite-react/src', path.join(target, 'src'), { recursive: true })
