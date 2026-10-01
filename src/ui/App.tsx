import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { SelectionSchema, VIEWPORTS, type RevisionApi, type RoundSummary, type RoundView, type Selection, type Viewport } from '../shared/model.ts'
import { Icon } from './icons.tsx'

const labels = { draft: '收集意见', sent: '等待修改', reviewing: '逐项验收', accepted: '已验收' }
const noteLabels = { pending: '待验收', accepted: '已接受', 'needs-work': '继续修改' }
function Button({ children, icon, primary, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children?: ReactNode; icon?: string; primary?: boolean }) {
  return <button {...props} className={`rv-button ${primary ? 'rv-primary' : ''} ${props.className ?? ''}`}>{icon && <Icon name={icon} />}{children}</button>
}
export function App({ api, sessionLabel = '当前项目', onClose }: { api: RevisionApi; sessionLabel?: string; onClose?: () => void }) {
  const [rounds, setRounds] = useState<RoundSummary[]>([])
  const [round, setRound] = useState<RoundView>()
  const [viewport, setViewport] = useState<Viewport>('desktop')
  const [tab, setTab] = useState<'preview' | 'compare' | 'code'>('preview')
  const [target, setTarget] = useState('http://127.0.0.1:5173/')
  const [title, setTitle] = useState('首页视觉改稿')
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [selection, setSelection] = useState<Selection>()
  const [instruction, setInstruction] = useState('')
  const [picking, setPicking] = useState(false)
  const [bridge, setBridge] = useState(false)
  const [reload, setReload] = useState(0)
  const [prompt, setPrompt] = useState('')
  const [newRound, setNewRound] = useState(false)
  const [nonce, setNonce] = useState(() => crypto.randomUUID())
  const iframe = useRef<HTMLIFrameElement>(null)
  const previewArea = useRef<HTMLDivElement>(null)
  const [availableWidth, setAvailableWidth] = useState(720)
  const sessionGeneration = useRef(0)

  const refresh = useCallback(async () => { setRounds(await api.call<RoundSummary[]>('list')) }, [api])
  useEffect(() => {
    const generation = ++sessionGeneration.current
    setRound(undefined); setSelection(undefined); setPrompt(''); setBridge(false); setError('')
    api.call<RoundSummary[]>('list').then(result => { if (generation === sessionGeneration.current) setRounds(result) }).catch(cause => { if (generation === sessionGeneration.current) setError(String(cause.message ?? cause)) })
    return () => { sessionGeneration.current++ }
  }, [api])
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 3500); return () => clearTimeout(timer) }, [toast])
  useEffect(() => {
    if (!previewArea.current) return
    const observer = new ResizeObserver(([entry]) => { if (entry) setAvailableWidth(entry.contentRect.width) })
    observer.observe(previewArea.current)
    return () => observer.disconnect()
  }, [tab, round?.id])
  useEffect(() => {
    setBridge(false); setPicking(false); setNonce(crypto.randomUUID())
  }, [round?.id, viewport, reload])
  useEffect(() => {
    if (!round) return
    const origin = new URL(round.targetUrl).origin
    const listener = (event: MessageEvent) => {
      if (event.source !== iframe.current?.contentWindow || event.origin !== origin || event.data?.channel !== 'dsh-revise' || event.data?.nonce !== nonce) return
      if (event.data.type === 'ready') setBridge(true)
      if (event.data.type === 'pick-mode') setPicking(event.data.payload?.enabled === true)
      if (event.data.type === 'selection') {
        const parsed = SelectionSchema.safeParse(event.data.payload)
        if (parsed.success) { setSelection(parsed.data); setPicking(false) }
      }
    }
    window.addEventListener('message', listener)
    return () => window.removeEventListener('message', listener)
  }, [round?.targetUrl, nonce])

  async function action(label: string, run: () => Promise<void>): Promise<void> {
    if (busy) return
    const generation = sessionGeneration.current
    setBusy(label); setError('')
    try { await run() } catch (cause) { if (generation === sessionGeneration.current) setError(cause instanceof Error ? cause.message : String(cause)) }
    finally { if (generation === sessionGeneration.current) setBusy('') }
  }
  async function mutate(operation: string, extra: Record<string, unknown> = {}): Promise<void> {
    if (!round) return
    setRound(await api.call<RoundView>(operation, { id: round.id, version: round.version, ...extra }))
    await refresh()
  }
  async function open(id: string): Promise<void> {
    await action('载入改稿', async () => { setRound(await api.call<RoundView>('get', { id })); setSelection(undefined); setPrompt(''); setNewRound(false); setTab('preview') })
  }
  function pick(): void {
    if (!round || !bridge) return
    const enabled = !picking
    iframe.current?.contentWindow?.postMessage({ channel: 'dsh-revise', type: 'pick', nonce, enabled }, new URL(round.targetUrl).origin)
    setPicking(enabled)
  }
  function previewUrl(): string {
    if (!round) return ''
    const url = new URL(round.targetUrl)
    url.searchParams.set('__revise_nonce', nonce)
    url.searchParams.set('__revise_parent', location.origin)
    return url.href
  }
  async function sendRequest(): Promise<void> {
    await action('准备修改请求', async () => {
      if (!round) return
      const request = await api.call<{ text: string }>('request', { id: round.id, version: round.version })
      setPrompt(request.text)
    })
  }
  const candidate = round?.candidate?.shots.find(shot => shot.viewport === viewport)
  const before = round?.baseline.shots.find(shot => shot.viewport === viewport)
  const changes = round?.candidate?.visualChanges?.find(change => change.viewport === viewport)
  const accepted = round?.notes.filter(note => note.status === 'accepted').length ?? 0
  const scale = Math.min(1, Math.max(0.2, (availableWidth - 44) / VIEWPORTS[viewport].width))

  return <div className="rv-app">
    <header className="rv-header">
      <div className="rv-brand"><span className="rv-logomark"><Icon name="cursor" size={23} /></span><div><strong>DSH <span>Revise</span></strong><small>从修改意见到亲眼验收</small></div><span className="rv-beta">0.1 / Preview</span></div>
      <div className="rv-header-right"><span className="rv-session"><span className="rv-dot" />{sessionLabel}</span>{onClose && <Button icon="close" aria-label="关闭改稿台" onClick={onClose} />}</div>
    </header>
    <div className="rv-body">
      <aside className="rv-history"><div className="rv-aside-label">改稿记录 <span>{rounds.length}</span></div>
        <Button icon="plus" className="rv-new" onClick={() => setNewRound(true)} disabled={!!busy}>新建一轮</Button>
        <div className="rv-history-list">{rounds.map(item => <button key={item.id} className={`rv-history-item ${round?.id === item.id ? 'rv-active' : ''}`} onClick={() => void open(item.id)} disabled={!!busy}>
          <span className={`rv-history-dot ${item.status}`} /><strong>{item.title}</strong><small>{labels[item.status]} · {item.acceptedCount}/{item.noteCount} 项</small>
        </button>)}</div>
        <div className="rv-local"><Icon name="history" size={16} /><span>记录保存在项目内<br />刷新后可以继续</span></div>
      </aside>
      <main className="rv-main">
        {error && <div className="rv-error" role="alert">{error}<button onClick={() => setError('')} aria-label="关闭错误">×</button></div>}
        {busy && <div className="rv-progress" role="status"><span className="rv-spinner" />{busy}…</div>}
        {!round ? <div className="rv-welcome"><span className="rv-eyebrow">A BETTER WAY TO REVIEW AI CHANGES</span><h1>指给 AI 看。<br /><span>把改动看清楚。</span></h1><p>在网页上留下修改意见，保存修改前后截图，<br />对照源码，逐项决定是否接受。</p><Button primary icon="plus" onClick={() => setNewRound(true)}>开始第一轮改稿</Button><div className="rv-steps"><span><b>01</b> 选元素、提意见</span><span><b>02</b> 交给 DSH 修改</span><span><b>03</b> 对照、验收</span></div></div> : <>
          <div className="rv-round-head"><div><div className="rv-eyebrow">REVISION {round.id.slice(0, 8)}</div><h1>{round.title} <span className={`rv-status ${round.status}`}>{labels[round.status]}</span></h1><p>{round.targetUrl}</p></div>
            <div className="rv-round-actions"><Button icon="download" onClick={() => void action('导出报告', async () => {
              const report = await api.call<{ html: string; relativePath: string }>('report', { id: round.id })
              const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([report.html], { type: 'text/html;charset=utf-8' })); link.download = `revise-${round.id.slice(0, 8)}.html`; link.click(); URL.revokeObjectURL(link.href); setToast(`报告与截图已保存在 ${report.relativePath}`)
            })}>导出报告</Button><Button primary icon="camera" disabled={!!busy || !round.notes.length || round.status === 'accepted'} onClick={() => void action('采集修改后的桌面和手机截图', async () => { await mutate('capture'); setTab('compare') })}>采集修改后</Button></div>
          </div>
          {round.stale && <div className="rv-stale">源码已在上次采集后发生变化。请重新采集修改后页面，再进行验收。</div>}
          <div className="rv-workspace">
            <section className="rv-canvas-section"><div className="rv-toolbar"><div className="rv-tabs">{([['preview', '实时页面'], ['compare', '前后对照'], ['code', '代码差异']] as const).map(([key, label]) => <button key={key} className={tab === key ? 'selected' : ''} onClick={() => setTab(key)}>{label}</button>)}</div>
              <div className="rv-viewports"><button className={viewport === 'desktop' ? 'selected' : ''} aria-label="桌面视口" onClick={() => setViewport('desktop')}><Icon name="desktop" /></button><button className={viewport === 'mobile' ? 'selected' : ''} aria-label="手机视口" onClick={() => setViewport('mobile')}><Icon name="mobile" /></button></div>
            </div>
            {tab === 'preview' && <><div className="rv-preview-tools"><span className={`rv-bridge ${bridge ? 'connected' : ''}`}><span className="rv-dot" />{bridge ? '元素选择已连接' : '等待 Vite 插件连接'}</span><div><Button icon="refresh" aria-label="刷新页面" onClick={() => setReload(value => value + 1)} /><Button icon="cursor" primary={picking} disabled={!bridge || round.status !== 'draft'} onClick={pick}>{picking ? '点击页面元素' : '选择元素'}</Button></div></div>
              {!bridge && <div className="rv-setup">在 Vite 配置中加入 <code>revise()</code> 并重启开发服务器。<a href="https://github.com/deepseek-ai/deepseek-harness" target="_blank" rel="noreferrer">DSH</a></div>}
              <div className="rv-preview-scroll" ref={previewArea}><div className="rv-preview-scaled" style={{ width: VIEWPORTS[viewport].width * scale, height: VIEWPORTS[viewport].height * scale }}><div className={`rv-frame ${viewport}`} style={{ width: VIEWPORTS[viewport].width, height: VIEWPORTS[viewport].height, transform: `scale(${scale})` }}><iframe ref={iframe} key={`${round.id}-${viewport}-${nonce}`} src={previewUrl()} title="前端实时预览" sandbox="allow-scripts allow-same-origin allow-forms" onLoad={() => iframe.current?.contentWindow?.postMessage({ channel: 'dsh-revise', type: 'ping', nonce }, new URL(round.targetUrl).origin)} /></div></div></div>
            </>}
            {tab === 'compare' && <div className="rv-compare"><div className="rv-compare-heading"><span>同一视口 · {viewport === 'desktop' ? '1280 × 800' : '390 × 844'}</span>{changes && <span>变化像素 {changes.percent}% <small>仅供参考</small></span>}</div><div className={`rv-shot-grid ${viewport}`}><figure><figcaption><span className="rv-shot-dot before" />修改前 <time>{round.baseline.createdAt.slice(11, 19)}</time></figcaption><img src={before?.dataUrl} alt="修改前截图" /></figure><figure><figcaption><span className="rv-shot-dot after" />修改后 <time>{round.candidate?.createdAt.slice(11, 19)}</time></figcaption>{candidate ? <img src={candidate.dataUrl} alt="修改后截图" /> : <div className="rv-shot-empty"><Icon name="camera" size={32} /><p>修改完成后，点击“采集修改后”</p></div>}</figure></div><p className="rv-capture-note">截图使用独立浏览器、固定视口。变化百分比不代表意见已经落实，请逐项检查。</p></div>}
            {tab === 'code' && <div className="rv-code"><div className="rv-code-title"><Icon name="code" />修改前源码 → 当前采集版本</div><pre>{round.codeDiff || '还没有采集到源码变化。'}</pre><p className="rv-capture-note">比较 src/ 等支持的源码目录与 Vite 配置；不包含依赖、二进制资源和环境变量。</p></div>}
            </section>
            <aside className="rv-notes"><div className="rv-notes-head"><h2>修改意见 <span>{round.notes.length.toString().padStart(2, '0')}</span></h2><p>{accepted} 项已接受 / {round.notes.length} 项</p><div className="rv-meter"><i style={{ width: `${round.notes.length ? accepted / round.notes.length * 100 : 0}%` }} /></div></div>
              <div className="rv-note-list">
                {selection && round.status === 'draft' && <div className="rv-note-compose"><div className="rv-note-compose-head"><span><Icon name="cursor" size={15} />已选中 &lt;{selection.tag}&gt;</span><button aria-label="取消选中" onClick={() => setSelection(undefined)}>×</button></div><code>{selection.source ? `${selection.source.file}:${selection.source.line}` : selection.selector}</code><textarea aria-label="修改意见" placeholder="希望这个元素如何修改？" value={instruction} onChange={event => setInstruction(event.target.value)} autoFocus /><Button primary icon="plus" disabled={!instruction.trim() || !!busy} onClick={() => void action('保存意见', async () => { await mutate('addNote', { selection, viewport, instruction }); setSelection(undefined); setInstruction('') })}>保存意见</Button></div>}
                {!round.notes.length && !selection && <div className="rv-notes-empty"><Icon name="cursor" size={30} /><h3>从一个具体元素开始</h3><p>点击“选择元素”，然后在页面上<br />指出要修改的地方。</p></div>}
                {round.notes.map((note, index) => <article key={note.id} className={`rv-note ${note.status}`}><div className="rv-note-top"><span className="rv-note-number">{(index + 1).toString().padStart(2, '0')}</span><span className="rv-note-state">{noteLabels[note.status]}</span>{round.status === 'draft' && <button aria-label={`删除意见 ${index + 1}`} onClick={() => void action('删除意见', () => mutate('removeNote', { noteId: note.id }))}>×</button>}</div><h3>{note.instruction}</h3><code>{note.selection.source ? `${note.selection.source.file}:${note.selection.source.line}` : note.selection.selector}</code><div className="rv-note-viewport"><Icon name={note.viewport} size={13} />{note.viewport === 'desktop' ? '桌面' : '手机'} · &lt;{note.selection.tag}&gt;</div>
                  {note.feedback && <p className="rv-note-feedback">{note.feedback}</p>}
                  {round.candidate && round.status !== 'accepted' && <div className="rv-note-review"><Button icon="check" disabled={!!busy || round.stale || note.status === 'accepted'} onClick={() => void action('记录验收', () => mutate('review', { noteId: note.id, status: 'accepted', feedback: note.feedback }))}>接受</Button><Button disabled={!!busy || round.stale} onClick={() => {
                    const feedback = window.prompt('还有哪里需要修改？', note.feedback)
                    if (feedback !== null) void action('记录反馈', () => mutate('review', { noteId: note.id, status: 'needs-work', feedback }))
                  }}>继续修改</Button></div>}
                </article>)}
              </div>
              <div className="rv-notes-footer">{round.status === 'accepted' ? <div className="rv-done"><Icon name="check" />这轮改稿已验收完成</div> : <><Button primary icon="send" disabled={!!busy || !round.notes.length || accepted === round.notes.length} onClick={() => void sendRequest()}>{round.lastSentAt ? '发送补充修改意见' : '发送给 DSH'}</Button><Button icon="check" disabled={!!busy || !round.candidate || round.stale || !round.notes.length || accepted !== round.notes.length} onClick={() => void action('完成验收', () => mutate('finish'))}>完成本轮验收</Button></>}</div>
            </aside>
          </div>
        </>}
      </main>
    </div>
    {newRound && <div className="rv-modal-backdrop"><form className="rv-modal" onSubmit={event => { event.preventDefault(); void action('保存修改前的桌面和手机截图', async () => { const result = await api.call<RoundView>('create', { title, targetUrl: target }); setRound(result); setSelection(undefined); setNewRound(false); setTab('preview'); await refresh() }) }}><div className="rv-modal-top"><span className="rv-eyebrow">NEW REVISION</span><Button icon="close" aria-label="关闭新建窗口" onClick={() => setNewRound(false)} type="button" disabled={!!busy} /></div><h2>给这一轮改稿一个起点</h2><p>先保存修改前的页面和源码，之后的变化才有依据。</p><label>改稿名称<input value={title} onChange={event => setTitle(event.target.value)} maxLength={160} required /></label><label>本地开发地址<input value={target} onChange={event => setTarget(event.target.value)} placeholder="http://127.0.0.1:5173/" required /></label><div className="rv-modal-hint"><Icon name="camera" /><span>将采集桌面和手机两个视口。请保持开发服务器运行。</span></div>{error && <div className="rv-error" role="alert">{error}</div>}<Button primary icon="arrow" type="submit" disabled={!!busy || !title.trim()}>{busy ? '正在保存起点…' : '保存起点，开始改稿'}</Button></form></div>}
    {prompt && <div className="rv-modal-backdrop"><div className="rv-modal rv-prompt"><div className="rv-modal-top"><span className="rv-eyebrow">HAND OFF TO YOUR AGENT</span><Button icon="close" aria-label="关闭发送窗口" onClick={() => setPrompt('')} /></div><h2>确认发送这些修改意见</h2><p>发送到当前 DSH 会话。验收结果由你决定。</p><pre>{prompt}</pre><div className="rv-prompt-actions"><Button icon="copy" onClick={() => void action('复制请求', async () => { await navigator.clipboard.writeText(prompt); setToast('修改请求已复制') })}>复制请求</Button>{api.send && <Button primary icon="send" disabled={!!busy} onClick={() => void action('发送给当前会话', async () => { await api.send!(prompt); await mutate('markSent'); setPrompt(''); setToast('修改意见已发送，请在 DSH 对话中查看进展') })}>确认发送给 DSH</Button>}</div></div></div>}
    {toast && <div className="rv-toast" role="status"><Icon name="check" />{toast}</div>}
  </div>
}
