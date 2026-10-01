import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-connection'
import type {} from '@deepseek-ai/dsh-session-query'
import type { SessionId } from '@deepseek-ai/dsh-session'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { BrowserCapture } from '../core/capture.ts'
import { RevisionService } from '../core/service.ts'
import { ReviseError } from '../shared/model.ts'

export const name = 'dsh-revise'
export const inject = ['connection', 'sessionQuery']
const RequestSchema = z.object({ operation: z.string().max(40), sessionId: z.string().trim().min(1).max(200), args: z.unknown() })
const EnvelopeSchema = z.object({ type: z.literal('client-request'), rpcId: z.string().min(1).max(200), method: z.literal('dsh-revise'), payload: RequestSchema })

export function apply(ctx: Context): void {
  const service = new RevisionService(new BrowserCapture(process.env.REVISE_CHROMIUM_PATH))
  ctx.connection.fetch.register({ path: '/api/dsh-revise', methods: ['POST'], requestBody: 'buffered', fetch: async incoming => {
    let rpcId = randomUUID() as string
    let result: unknown
    try {
      const envelope = EnvelopeSchema.parse(await incoming.json())
      rpcId = envelope.rpcId
      const request = envelope.payload
      using observation = await ctx.sessionQuery.observeSession(request.sessionId as SessionId, { projectionMode: 'none', signal: incoming.signal })
      const workspace = observation.header.cwd
      if (!workspace) throw new ReviseError('no-workspace', '当前会话没有项目目录，请先创建项目会话。')
      const value = await service.execute(workspace, request.sessionId, request.operation, request.args, incoming.signal)
      result = { ok: true, value }
    } catch (error) {
      result = { ok: false, error: { code: error instanceof ReviseError ? error.code : error instanceof z.ZodError ? 'invalid-request' : 'revise/failed', message: error instanceof Error ? error.message : String(error), details: {} } }
    }
    return Response.json({ type: 'server-response', rpcId, result }, { headers: { 'cache-control': 'no-store' } })
  } })
  ctx.effect(() => () => service.dispose(), 'dsh-revise: capture and storage lifetime')
}
