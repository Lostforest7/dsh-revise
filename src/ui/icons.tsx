import type { CSSProperties } from 'react'
const paths: Record<string, string> = {
  cursor: 'M4 3l6 17 3-7 7-3L4 3z', plus: 'M12 5v14M5 12h14', close: 'M6 6l12 12M18 6L6 18',
  check: 'M5 12l4 4L19 6', arrow: 'M5 12h14M13 6l6 6-6 6', refresh: 'M20 7v5h-5M4 17v-5h5M6 7a7 7 0 0112-1l2 6M4 12l2 6a7 7 0 0012-1',
  desktop: 'M3 4h18v12H3zM8 20h8M12 16v4', mobile: 'M7 2h10v20H7zM11 18h2',
  code: 'M8 6l-6 6 6 6M16 6l6 6-6 6M14 3l-4 18', send: 'M22 2L9 15M22 2l-7 20-6-7-7-6 20-7z',
  camera: 'M3 7h4l2-3h6l2 3h4v13H3zM12 10a4 4 0 100 8 4 4 0 000-8',
  download: 'M12 3v12M7 10l5 5 5-5M4 17v4h16v-4', history: 'M3 3v6h6M3 9a9 9 0 119 12M12 7v5l3 2',
  copy: 'M9 9h12v12H9zM15 9V3H3v12h6', note: 'M4 3h16v18H4zM8 8h8M8 12h8M8 16h5',
}
export function Icon({ name, size = 18, style }: { name: string; size?: number; style?: CSSProperties }) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" style={style}><path d={paths[name] ?? paths.note} /></svg>
}
