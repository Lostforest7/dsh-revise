import { createRoot } from 'react-dom/client'
import { App } from './App.tsx'
import type { RevisionApi } from '../shared/model.ts'
import styles from './styles.css'
const style = document.createElement('style'); style.textContent = styles; document.head.append(style)
const token = location.hash.slice(1) || sessionStorage.getItem('dsh-revise-preview-token') || ''
if (token) sessionStorage.setItem('dsh-revise-preview-token', token)
history.replaceState(null, '', location.pathname)
const api: RevisionApi = {
  async call<T>(operation: string, args = {}): Promise<T> {
    const response = await fetch(`/rpc/${operation}`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify(args) })
    const result = await response.json()
    if (!response.ok || !result.ok) throw new Error(result.error?.message ?? '请求失败')
    return result.value as T
  },
}
createRoot(document.getElementById('root')!).render(<App api={api} sessionLabel="本地示例 · 手动改稿" />)
