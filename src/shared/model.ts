import { z } from 'zod'

export const ViewportSchema = z.enum(['desktop', 'mobile'])
export type Viewport = z.infer<typeof ViewportSchema>
export const VIEWPORTS = {
  desktop: { width: 1280, height: 800 },
  mobile: { width: 390, height: 844 },
} as const

export const SelectionSchema = z.object({
  tag: z.string().max(80), text: z.string().max(500), selector: z.string().max(1000),
  source: z.object({ file: z.string().max(1000), line: z.number().int().positive(), column: z.number().int().positive() }).optional(),
  rect: z.object({ x: z.number().finite(), y: z.number().finite(), width: z.number().nonnegative(), height: z.number().nonnegative() }),
})
export type Selection = z.infer<typeof SelectionSchema>
export const NoteSchema = z.object({
  id: z.string().uuid(), viewport: ViewportSchema, selection: SelectionSchema,
  instruction: z.string().trim().min(1).max(3000),
  status: z.enum(['pending', 'accepted', 'needs-work']), feedback: z.string().max(3000),
  reviewedSnapshotId: z.string().uuid().optional(),
})
export type Note = z.infer<typeof NoteSchema>
export const SnapshotSchema = z.object({
  id: z.string().uuid(), createdAt: z.string(),
  sources: z.record(z.string(), z.string()),
  shots: z.array(z.object({ viewport: ViewportSchema, width: z.number().int(), height: z.number().int(), dataUrl: z.string() })),
  visualChanges: z.array(z.object({ viewport: ViewportSchema, changedPixels: z.number().int(), totalPixels: z.number().int(), percent: z.number(), dimensionsChanged: z.boolean() })).optional(),
})
export type Snapshot = z.infer<typeof SnapshotSchema>
export const RoundSchema = z.object({
  schemaVersion: z.literal(1), id: z.string().uuid(), version: z.number().int().positive(),
  sessionId: z.string().min(1).max(200), title: z.string().trim().min(1).max(160), targetUrl: z.string().max(2000),
  createdAt: z.string(), updatedAt: z.string(), status: z.enum(['draft', 'sent', 'reviewing', 'accepted']),
  notes: z.array(NoteSchema).max(50), baseline: SnapshotSchema, candidate: SnapshotSchema.optional(),
  lastSentAt: z.string().optional(),
})
export type Round = z.infer<typeof RoundSchema>
export type RoundView = Round & { stale: boolean; codeDiff: string }
export type RoundSummary = Pick<Round, 'id' | 'title' | 'status' | 'targetUrl' | 'updatedAt' | 'version'> & { noteCount: number; acceptedCount: number }
export interface RevisionApi {
  call<T>(operation: string, payload?: Record<string, unknown>): Promise<T>
  send?(text: string): Promise<void>
}

export class ReviseError extends Error {
  constructor(readonly code: string, message: string) { super(message); this.name = 'ReviseError' }
}

/** Accept only local development targets, with an explicit port. */
export function parseTarget(value: string): URL {
  let url: URL
  try { url = new URL(value) } catch { throw new ReviseError('invalid-target', '请输入完整的本地开发地址，例如 http://127.0.0.1:5173/') }
  if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) || !url.port || url.username || url.password) {
    throw new ReviseError('invalid-target', '第一版只连接带端口的本地 HTTP 开发服务器。')
  }
  url.hash = ''
  url.searchParams.delete('__revise_nonce')
  url.searchParams.delete('__revise_parent')
  return url
}
