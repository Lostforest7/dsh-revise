import { expect, test } from 'vitest'
import { PNG } from 'pngjs'
import { visualChanges } from '../../src/core/capture.ts'
import type { Snapshot } from '../../src/shared/model.ts'

function snapshot(buttonColor: [number, number, number]): Snapshot {
  const png = new PNG({ width: 20, height: 12 })
  for (let y = 0; y < png.height; y++) for (let x = 0; x < png.width; x++) {
    const color = x >= 3 && x < 17 && y >= 3 && y < 9 ? buttonColor : [245, 242, 235]
    png.data.set([...color, 255], (y * png.width + x) * 4)
  }
  return { id: 'test', createdAt: '2026-10-01T00:00:00Z', sources: {}, shots: [{ viewport: 'mobile', width: 20, height: 12, dataUrl: `data:image/png;base64,${PNG.sync.write(png).toString('base64')}` }] }
}

test('counts a visible green-to-purple button change at similar luminance', () => {
  const [change] = visualChanges(snapshot([82, 102, 68]), snapshot([99, 80, 147]))
  expect(change!.changedPixels).toBeGreaterThan(0)
  expect(change!.percent).toBeGreaterThan(0)
})

test('identical screenshots remain zero', () => {
  const before = snapshot([82, 102, 68])
  expect(visualChanges(before, snapshot([82, 102, 68]))[0]!.changedPixels).toBe(0)
})
