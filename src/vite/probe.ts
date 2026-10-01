/** Development-only page bridge. No DSH credentials enter the preview page. */
const params = new URLSearchParams(location.search)
const nonce = params.get('__revise_nonce')
const parentOrigin = params.get('__revise_parent')
if (nonce && parentOrigin && window.parent !== window && /^https?:\/\//.test(parentOrigin)) {
  let picking = false
  const box = document.createElement('div')
  box.dataset.reviseOverlay = 'true'
  box.style.cssText = 'position:fixed;pointer-events:none;z-index:2147483647;border:2px solid #8b6cff;border-radius:5px;background:#8b6cff20;display:none;box-sizing:border-box'
  document.documentElement.append(box)
  const send = (type: string, payload: unknown = {}) => window.parent.postMessage({ channel: 'dsh-revise', type, nonce, payload }, parentOrigin)
  const selector = (element: Element): string => {
    if (element.id) return `#${CSS.escape(element.id)}`
    const parts: string[] = []
    let current: Element | null = element
    for (let depth = 0; current && depth < 6; depth++, current = current.parentElement) {
      const siblings = current.parentElement ? [...current.parentElement.children].filter(child => child.tagName === current!.tagName) : []
      parts.unshift(`${current.tagName.toLowerCase()}${siblings.length > 1 ? `:nth-of-type(${siblings.indexOf(current) + 1})` : ''}`)
      if (current.id) { parts[0] = `#${CSS.escape(current.id)}`; break }
    }
    return parts.join(' > ')
  }
  function pick(event: MouseEvent): void {
    if (!picking || !(event.target instanceof Element) || event.target === box) return
    event.preventDefault(); event.stopImmediatePropagation()
    const element = event.target
    const rect = element.getBoundingClientRect()
    const source = element.closest('[data-revise-file]') as HTMLElement | null
    send('selection', {
      tag: element.tagName.toLowerCase(), text: (element.textContent ?? '').trim().slice(0, 500), selector: selector(element),
      rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      ...(source ? { source: { file: source.dataset.reviseFile, line: Number(source.dataset.reviseLine), column: Number(source.dataset.reviseColumn) } } : {}),
    })
    picking = false; box.style.display = 'none'; send('pick-mode', { enabled: false })
  }
  window.addEventListener('message', event => {
    if (event.source !== window.parent || event.origin !== parentOrigin || event.data?.channel !== 'dsh-revise' || event.data?.nonce !== nonce) return
    if (event.data.type === 'pick') { picking = event.data.enabled === true; if (!picking) box.style.display = 'none' }
    if (event.data.type === 'ping') send('ready')
  })
  window.addEventListener('mousemove', event => {
    if (!picking || !(event.target instanceof Element) || event.target === box) { box.style.display = 'none'; return }
    const rect = event.target.getBoundingClientRect()
    Object.assign(box.style, { display: 'block', left: `${rect.x}px`, top: `${rect.y}px`, width: `${rect.width}px`, height: `${rect.height}px` })
  }, true)
  window.addEventListener('click', pick, true)
  window.addEventListener('keydown', event => { if (event.key === 'Escape') { picking = false; box.style.display = 'none'; send('pick-mode', { enabled: false }) } })
  send('ready')
}
