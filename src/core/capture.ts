import { chromium, type Browser } from 'playwright-core'
import { PNG } from 'pngjs'
import pixelmatch from 'pixelmatch'
import { parseTarget, ReviseError, VIEWPORTS, type Snapshot, type Viewport } from '../shared/model.ts'

export interface CaptureDriver {
  capture(target: string, signal?: AbortSignal): Promise<Snapshot['shots']>
  dispose(): Promise<void>
}

export class BrowserCapture implements CaptureDriver {
  private pending?: Promise<Browser>
  private stopped = false
  constructor(private readonly executablePath?: string) {}
  private browser(): Promise<Browser> {
    if (this.stopped) throw new ReviseError('disposed', '截图服务已停止。')
    this.pending ??= chromium.launch({ executablePath: this.executablePath, headless: true }).catch(error => {
      this.pending = undefined
      throw new ReviseError('browser-missing', `无法启动截图浏览器。请执行 npx playwright-core@1.63.0 install chromium，或设置 REVISE_CHROMIUM_PATH。${error instanceof Error ? error.message : ''}`)
    })
    return this.pending
  }
  async capture(target: string, signal?: AbortSignal): Promise<Snapshot['shots']> {
    const url = parseTarget(target)
    const browser = await this.browser()
    const shots: Snapshot['shots'] = []
    for (const [key, size] of Object.entries(VIEWPORTS)) {
      signal?.throwIfAborted()
      const context = await browser.newContext({ viewport: size, deviceScaleFactor: 1, reducedMotion: 'reduce', serviceWorkers: 'block' })
      const abort = () => { void context.close().catch(() => {}) }
      signal?.addEventListener('abort', abort, { once: true })
      try {
        // A screenshot must not browse other local services or follow a redirected origin.
        await context.route('**/*', route => {
          const request = route.request()
          const destination = new URL(request.url())
          if (['data:', 'blob:'].includes(destination.protocol) || destination.origin === url.origin) return route.continue()
          return route.abort('blockedbyclient')
        })
        const page = await context.newPage()
        const response = await page.goto(url.href, { waitUntil: 'networkidle', timeout: 20_000 })
        if (!response?.ok() || new URL(page.url()).origin !== url.origin) throw new ReviseError('preview-failed', '开发页面未成功加载，请先启动 Vite。')
        await page.evaluate(async () => { await document.fonts.ready })
        await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}' })
        const bytes = await page.screenshot({ type: 'png', fullPage: false, animations: 'disabled' })
        shots.push({ viewport: key as Viewport, ...size, dataUrl: `data:image/png;base64,${bytes.toString('base64')}` })
      } finally {
        signal?.removeEventListener('abort', abort)
        await context.close()
      }
    }
    return shots
  }
  async dispose(): Promise<void> {
    this.stopped = true
    if (this.pending) await (await this.pending.catch(() => undefined))?.close()
  }
}

export function visualChanges(baseline: Snapshot, candidate: Snapshot): NonNullable<Snapshot['visualChanges']> {
  return candidate.shots.map(shot => {
    const before = baseline.shots.find(value => value.viewport === shot.viewport)
    if (!before) throw new ReviseError('missing-baseline', '缺少同一视口的修改前截图。')
    const a = PNG.sync.read(Buffer.from(before.dataUrl.split(',')[1]!, 'base64'))
    const b = PNG.sync.read(Buffer.from(shot.dataUrl.split(',')[1]!, 'base64'))
    const dimensionsChanged = a.width !== b.width || a.height !== b.height
    const totalPixels = b.width * b.height
    // Keep antialias filtering, but count visible hue changes at similar luminance.
    const changedPixels = dimensionsChanged ? totalPixels : pixelmatch(a.data, b.data, undefined, b.width, b.height, { threshold: 0.05 })
    return { viewport: shot.viewport, changedPixels, totalPixels, percent: Math.round(changedPixels / totalPixels * 10000) / 100, dimensionsChanged }
  })
}
