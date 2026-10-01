import { expect, test } from 'vitest'
import { revise } from '../../src/vite/index.ts'
import type { ResolvedConfig } from 'vite'

test('Vite source hints instrument DOM elements while preserving component props and source maps', () => {
  const plugin = revise()
  const configure = plugin.configResolved as (config: ResolvedConfig) => void
  configure({ root: '/project' } as ResolvedConfig)
  const transform = plugin.transform as unknown as (code: string, id: string) => { code: string; map: object } | null
  const result = transform('const X = () => <div><Widget label="x" /><button>Go</button></div>', '/project/src/App.tsx')!
  expect(result.code).toContain('data-revise-file="src/App.tsx"')
  expect(result.code).toContain('<Widget label="x" />')
  expect(result.code.match(/data-revise-file/g)).toHaveLength(2)
  expect(result.map).toBeDefined()
  expect(transform('export default 42', '/project/node_modules/a/x.tsx')).toBeNull()
  expect(plugin.apply).toBe('serve')
})
