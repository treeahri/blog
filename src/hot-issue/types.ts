export interface HotIssueImagePosition {
  /** 0–100, percentage from the left/top — same units as CSS object-position. */
  x: number
  y: number
}

export const DEFAULT_IMAGE_POSITION: HotIssueImagePosition = { x: 50, y: 50 }

export interface HotIssueImageBlock {
  imageDataUrl: string
  imagePosition: HotIssueImagePosition
  label: string
  body: string
}

interface HotIssueSlideBase {
  id: string
  /** Free paragraph for the blog post body under this card — independent of whatever text is baked into the card image itself. */
  bodyText: string
}

export type HotIssueSlide =
  | (HotIssueSlideBase & { type: 'cover'; badge: string; title: string; subtitle: string })
  | (HotIssueSlideBase & { type: 'quote'; title: string; highlight: string; body: string })
  | (HotIssueSlideBase & {
      type: 'imageText'
      title: string
      imageDataUrl: string
      imagePosition: HotIssueImagePosition
      caption: string
      body: string
    })
  | (HotIssueSlideBase & {
      type: 'imageCompare'
      title: string
      left: HotIssueImageBlock
      right: HotIssueImageBlock
    })
  | (HotIssueSlideBase & { type: 'checklist'; title: string; items: string[] })
  | (HotIssueSlideBase & { type: 'outro'; title: string; message: string })

export type HotIssueSlideType = HotIssueSlide['type']

export const HOT_ISSUE_SLIDE_TYPE_LABEL: Record<HotIssueSlideType, string> = {
  cover: '표지',
  quote: '핵심 문구 강조',
  imageText: '이미지 + 텍스트',
  imageCompare: '이미지 비교',
  checklist: '체크리스트',
  outro: '마무리',
}

export type HotIssueCategory = '경제' | '생활'

export interface HotIssueData {
  schemaVersion: number
  status: 'ready' | 'none'
  generatedAt: string
  generatedBy: string
  slug: string
  statusMessage: string
  meta: {
    category: HotIssueCategory
    topic: string
  }
  slides: HotIssueSlide[]
  body: {
    postTitle: string
    greeting: string
    intro: string
    closing: string
    disclaimer: string
    hashtags: string
  }
  sources: { name: string; url: string }[]
  notes: string[]
}

export const HOT_ISSUE_SCHEMA_VERSION = 1

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export function createEmptySlide(type: HotIssueSlideType): HotIssueSlide {
  const id = newId()
  const bodyText = ''
  switch (type) {
    case 'cover':
      return { id, bodyText, type, badge: 'daReviewDa', title: '', subtitle: '' }
    case 'quote':
      return { id, bodyText, type, title: '', highlight: '', body: '' }
    case 'imageText':
      return {
        id,
        bodyText,
        type,
        title: '',
        imageDataUrl: '',
        imagePosition: { ...DEFAULT_IMAGE_POSITION },
        caption: '',
        body: '',
      }
    case 'imageCompare':
      return {
        id,
        bodyText,
        type,
        title: '',
        left: { imageDataUrl: '', imagePosition: { ...DEFAULT_IMAGE_POSITION }, label: '', body: '' },
        right: { imageDataUrl: '', imagePosition: { ...DEFAULT_IMAGE_POSITION }, label: '', body: '' },
      }
    case 'checklist':
      return { id, bodyText, type, title: '', items: [''] }
    case 'outro':
      return { id, bodyText, type, title: '', message: '' }
  }
}

export function createEmptyHotIssueData(): HotIssueData {
  return {
    schemaVersion: HOT_ISSUE_SCHEMA_VERSION,
    status: 'none',
    generatedAt: '',
    generatedBy: '',
    slug: '',
    statusMessage: '준비된 핫이슈 데이터가 없어요. "저장소에서 불러오기"를 눌러보세요.',
    meta: { category: '생활', topic: '' },
    slides: [createEmptySlide('cover'), createEmptySlide('checklist'), createEmptySlide('outro')],
    body: {
      postTitle: '',
      greeting: '안녕하세요, 다리뷰다입니다.',
      intro: '',
      closing: '',
      disclaimer: '',
      hashtags: '',
    },
    sources: [],
    notes: [],
  }
}

/**
 * A synced JSON may come from an older routine or be partially filled, so
 * unknown shapes deep-merge over defaults instead of crashing the app
 * (same defensive stance as normalizeIpoData).
 */
export function normalizeHotIssueData(raw: unknown): HotIssueData {
  const base = createEmptyHotIssueData()
  if (typeof raw !== 'object' || raw === null) return base
  const patch = raw as Record<string, unknown>
  const slides = Array.isArray(patch.slides)
    ? (patch.slides as unknown[]).filter(isValidSlide)
    : base.slides
  return {
    ...base,
    ...patch,
    meta: { ...base.meta, ...(patch.meta as object) },
    slides,
    body: { ...base.body, ...(patch.body as object) },
  } as HotIssueData
}

function isValidSlide(value: unknown): value is HotIssueSlide {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { type?: unknown }).type === 'string' &&
    (value as { type: string }).type in HOT_ISSUE_SLIDE_TYPE_LABEL
  )
}
