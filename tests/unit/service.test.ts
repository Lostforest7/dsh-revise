import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { PNG } from 'pngjs'
import { RevisionService, reportHtml } from '../../src/core/service.ts'
import { parseTarget, type RoundView, type Snapshot } from '../../src/shared/model.ts'
import { VIEWPORTS } from '../../src/shared/model.ts'

let workspace: string
let service: RevisionService
let color = 255
const selection = { tag: 'h1', text: 'Hello', selector: 'h1', source: { file: 'src/App.tsx', line: 1, column: 1 }, rect: { x: 0, y: 0, width: 100, height: 30 } }
function shots(): Snapshot['shots'] {
  return Object.entries(VIEWPORTS).map(([viewport, size]) => {
    const png = new PNG({ width: 2, height: 2 }); png.data.fill(color)
    return { viewport: viewport as 'desktop' | 'mobile', ...size, dataUrl: `data:image/png;base64,${PNG.sync.write(png).toString('base64')}` }
  })
}
beforeEach(async () => {
  await mkdir('work/unit', { recursive: true })
  workspace = await mkdtemp(path.resolve('work/unit/case-'))
  await mkdir(path.join(workspace, 'src'))
  await writeFile(path.join(workspace, 'src/App.tsx'), 'export default () => <h1>Hello</h1>')
  color = 255
  service = new RevisionService({ capture: async () => shots(), dispose: async () => {} })
})
afterEach(async () => { await service.dispose(); await rm(workspace, { recursive: true, force: true }) })
const run = (operation: string, args = {}, session = 'test') => service.execute(workspace, session, operation, args)
async function noted(): Promise<RoundView> {
  const round = await run('create', { title: 'Homepage', targetUrl: 'http://127.0.0.1:5173/' }) as RoundView
  return await run('addNote', { id: round.id, version: round.version, viewport: 'desktop', selection, instruction: 'Make title smaller' }) as RoundView
}

describe('human review contract', () => {
  test('persists rounds, requests, screenshots and report; requires a captured candidate', async () => {
    const round = await noted()
    await expect(run('finish', { id: round.id, version: round.version })).rejects.toMatchObject({ code: 'no-candidate' })
    const request = await run('request', { id: round.id, version: round.version }) as { text: string }
    expect(request.text).toContain('src/App.tsx:1:1')
    const persisted = JSON.parse(await readFile(path.join(workspace, '.dsh-revise', round.id, 'round.json'), 'utf8'))
    expect(persisted.notes[0].instruction).toBe('Make title smaller')
    expect(persisted.baseline.shots).toHaveLength(2)
  })
  test('only completes after every human review refers to the current candidate', async () => {
    let round = await noted()
    color = 127
    await writeFile(path.join(workspace, 'src/App.tsx'), 'export default () => <h1>Updated</h1>')
    round = await run('capture', { id: round.id, version: round.version }) as RoundView
    expect(round.codeDiff).toContain('+export default')
    expect(round.candidate?.visualChanges?.[0]?.percent).toBeGreaterThan(0)
    await expect(run('finish', { id: round.id, version: round.version })).rejects.toMatchObject({ code: 'incomplete-review' })
    round = await run('review', { id: round.id, version: round.version, noteId: round.notes[0]!.id, status: 'accepted' }) as RoundView
    round = await run('finish', { id: round.id, version: round.version }) as RoundView
    expect(round.status).toBe('accepted')
    expect(await readFile(path.join(workspace, '.dsh-revise', round.id, 'report.md'), 'utf8')).toContain('[accepted]')
    await expect(run('capture', { id: round.id, version: round.version })).rejects.toMatchObject({ code: 'round-closed' })
  })
  test('rejects stale source and invalidates prior approvals after recapture', async () => {
    let round = await noted()
    round = await run('capture', { id: round.id, version: round.version }) as RoundView
    round = await run('review', { id: round.id, version: round.version, noteId: round.notes[0]!.id, status: 'accepted' }) as RoundView
    await writeFile(path.join(workspace, 'src/App.tsx'), '<h1>Changed again</h1>')
    await expect(run('finish', { id: round.id, version: round.version })).rejects.toMatchObject({ code: 'stale-candidate' })
    round = await run('capture', { id: round.id, version: round.version }) as RoundView
    expect(round.notes[0]!.status).toBe('pending')
    expect(round.notes[0]!.reviewedSnapshotId).toBeUndefined()
  })
  test('refreshes old image metrics without rewriting accepted snapshots or decisions', async () => {
    let round = await noted()
    color = 127
    round = await run('capture', { id: round.id, version: round.version }) as RoundView
    round = await run('review', { id: round.id, version: round.version, noteId: round.notes[0]!.id, status: 'accepted' }) as RoundView
    round = await run('finish', { id: round.id, version: round.version }) as RoundView
    const recordPath = path.join(workspace, '.dsh-revise', round.id, 'round.json')
    const record = JSON.parse(await readFile(recordPath, 'utf8'))
    record.candidate.visualChanges.forEach((change: { percent: number; changedPixels: number }) => { change.percent = 0; change.changedPixels = 0 })
    await writeFile(recordPath, JSON.stringify(record))
    const loaded = await run('get', { id: round.id }) as RoundView
    expect(loaded.candidate!.visualChanges![0]!.percent).toBeGreaterThan(0)
    expect(loaded.candidate!.id).toBe(round.candidate!.id)
    expect(loaded.version).toBe(round.version)
    expect(loaded.status).toBe('accepted')
    expect(loaded.notes[0]!.reviewedSnapshotId).toBe(round.candidate!.id)
    expect(JSON.parse(await readFile(recordPath, 'utf8')).candidate.visualChanges[0].percent).toBe(0)
    const report = await run('report', { id: round.id }) as { html: string }
    expect(report.html).not.toContain('变化像素 0%')
  })
  test('rejects concurrent edits and cross-session access', async () => {
    let round = await noted()
    await expect(run('get', { id: round.id }, 'other-session')).rejects.toMatchObject({ code: 'wrong-session' })
    round = await run('markSent', { id: round.id, version: round.version }) as RoundView
    await expect(run('capture', { id: round.id, version: round.version - 1 })).rejects.toMatchObject({ code: 'conflict' })
    await expect(run('removeNote', { id: round.id, version: round.version, noteId: round.notes[0]!.id })).rejects.toMatchObject({ code: 'notes-frozen' })
    expect(await run('list', {}, 'other-session')).toEqual([])
  })
  test('does not create a round when either viewport capture fails', async () => {
    await service.dispose()
    service = new RevisionService({ capture: async () => shots().slice(0, 1), dispose: async () => {} })
    await expect(run('create', { title: 'Broken', targetUrl: 'http://127.0.0.1:5173' })).rejects.toMatchObject({ code: 'incomplete-capture' })
    expect(await run('list')).toEqual([])
  })
  test('detects source mutation during screenshots rather than pairing unrelated evidence', async () => {
    await service.dispose()
    service = new RevisionService({ capture: async () => { await writeFile(path.join(workspace, 'src/App.tsx'), '<h1>Raced</h1>'); return shots() }, dispose: async () => {} })
    await expect(run('create', { title: 'Raced', targetUrl: 'http://127.0.0.1:5173' })).rejects.toMatchObject({ code: 'changed-during-capture' })
  })
  test('keeps round snapshots immutable when source is edited later', async () => {
    const round = await noted()
    await writeFile(path.join(workspace, 'src/App.tsx'), '<h1>Later</h1>')
    const loaded = await run('get', { id: round.id }) as RoundView
    expect(loaded.baseline.sources['src/App.tsx']).toContain('Hello')
    expect(loaded.stale).toBe(true)
  })
  test('exports a portable HTML report with escaped page and code content', async () => {
    const round = await noted()
    round.title = '<script>attack()</script>'
    round.notes[0]!.instruction = '<img src=x onerror=attack()>'
    const html = reportHtml(round)
    expect(html).not.toContain('<script>')
    expect(html).not.toContain('<img src=x')
    expect(html).toContain('&lt;script&gt;attack()&lt;/script&gt;')
    expect(html).toContain('data:image/png;base64,')
    expect(html).toContain("default-src 'none'")
    const report = await run('report', { id: round.id }) as { html: string; relativePath: string }
    expect(report.relativePath).toMatch(/report\.html$/)
    expect(await readFile(path.join(workspace, report.relativePath), 'utf8')).toBe(report.html)
  })
})

test('target validation refuses credentials, remote hosts, implicit ports and non-HTTP', () => {
  for (const url of ['https://localhost:5173', 'http://example.com:5173', 'http://localhost', 'http://user:pass@localhost:5173', 'file:///tmp/page.html', 'http://127.0.0.1.evil.test:5173']) expect(() => parseTarget(url)).toThrow()
  expect(parseTarget('http://localhost:5173/a?x=1').pathname).toBe('/a')
})
