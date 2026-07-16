import { PHOTO_ROLE_LABEL, type ReviewFormData, type ReviewPhoto } from '../types'

export interface AiWriteResult {
  intro: string
  menuNote: string
  summary: string
  hashtags: string
  captions: Record<string, string>
}

interface DraftInput {
  form: ReviewFormData
  photos: ReviewPhoto[]
}

/** Claude usually returns pure JSON, but sometimes wraps it in a code fence
 * or adds a stray sentence before/after despite instructions — so extract
 * the outermost {...} span instead of assuming the whole string parses. */
function extractJsonObject(raw: string): string {
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start === -1 || end === -1 || end < start) return raw.trim()
  return raw.slice(start, end + 1)
}

function parseResult(raw: string): AiWriteResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(extractJsonObject(raw))
  } catch {
    throw new Error('AI 응답을 해석하지 못했어요. 다시 시도해주세요.')
  }
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('AI 응답 형식이 예상과 달라요.')
  }
  const p = parsed as Record<string, unknown>
  const str = (v: unknown) => (typeof v === 'string' ? v : '')
  const captions: Record<string, string> = {}
  if (typeof p.captions === 'object' && p.captions !== null) {
    for (const [id, value] of Object.entries(p.captions as Record<string, unknown>)) {
      if (typeof value === 'string') captions[id] = value
    }
  }
  return {
    intro: str(p.intro),
    menuNote: str(p.menuNote),
    summary: str(p.summary),
    hashtags: str(p.hashtags),
    captions,
  }
}

/**
 * Calls the local dev-server-only /api/ai-write route (see
 * vite-plugins/ai-write.ts). The server writes each photo to a temp file and
 * has `claude -p` actually open them (Read-only tool access) so captions are
 * grounded in what's really in the picture, not guessed from role labels.
 */
export async function generateReviewContent({ form, photos }: DraftInput): Promise<AiWriteResult> {
  const res = await fetch('/api/ai-write', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      form,
      photos: photos.map((p) => ({
        id: p.id,
        role: p.role,
        roleLabel: PHOTO_ROLE_LABEL[p.role],
        caption: p.caption,
        dataUrl: p.dataUrl,
      })),
    }),
  })
  if (!res.ok) {
    const errBody = (await res.json().catch(() => null)) as { error?: string } | null
    throw new Error(
      errBody?.error ??
        'AI 작성에 실패했어요. `npm run dev`로 로컬에서 실행 중인지, Claude Code CLI가 로그인되어 있는지 확인해주세요.',
    )
  }
  const { text } = (await res.json()) as { text: string }
  return parseResult(text)
}
