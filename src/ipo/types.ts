export interface IpoKV {
  k: string
  v: string
}

export interface IpoFinRow {
  year: string
  revenue: string
  op: string
  net: string
}

export interface IpoStatTile {
  value: string
  sub: string
}

export interface IpoTimelineItem {
  when: string
  note: string
}

export interface IpoData {
  schemaVersion: number
  status: 'ready' | 'none'
  generatedAt: string
  generatedBy: string
  slug: string
  statusMessage: string
  stock: {
    name: string
    market: string
    sector: string
  }
  /** ISO dates (YYYY-MM-DD) — only used to recompute the D-day line on load. */
  schedule: {
    subscriptionStart: string
    subscriptionEnd: string
    refundDate: string
    listingDate: string
  }
  cards: {
    cover: { ddayLine: string; hook: string; marketLine: string }
    company: {
      aboutRows: IpoKV[]
      finTitle: string
      finRows: IpoFinRow[]
      finNote: string
    }
    stats: {
      price: IpoStatTile
      demand: IpoStatTile
      lockup: IpoStatTile
      deposit: IpoStatTile
    }
    timeline: {
      subscription: IpoTimelineItem
      refund: IpoTimelineItem
      listing: IpoTimelineItem
      brokersLine: string
    }
    points: { plus: string[]; minus: string[] }
    outro: { title: string; disclaimer: string }
  }
  body: {
    postTitle: string
    greeting: string
    intro: string
    summaryLines: string[]
    infoRows: IpoKV[]
    companyParagraphs: string[]
    scheduleParagraphs: string[]
    checklistTitle: string
    checklistLines: string[]
    disclaimer: string
    hashtags: string
  }
  sources: { name: string; rcpNo: string; date: string }[]
  notes: string[]
}

export const IPO_SCHEMA_VERSION = 1

export function createEmptyIpoData(): IpoData {
  return {
    schemaVersion: IPO_SCHEMA_VERSION,
    status: 'none',
    generatedAt: '',
    generatedBy: '',
    slug: '',
    statusMessage: '준비된 공모주 데이터가 없어요. "저장소에서 불러오기"를 눌러보세요.',
    stock: { name: '', market: '코스닥', sector: '' },
    schedule: { subscriptionStart: '', subscriptionEnd: '', refundDate: '', listingDate: '' },
    cards: {
      cover: { ddayLine: '', hook: '', marketLine: '' },
      company: {
        aboutRows: [
          { k: '설립', v: '' },
          { k: '주요 사업', v: '' },
          { k: '포인트', v: '' },
        ],
        finTitle: '최근 3개년 실적 (단위: 억원)',
        finRows: [
          { year: '', revenue: '', op: '', net: '' },
          { year: '', revenue: '', op: '', net: '' },
          { year: '', revenue: '', op: '', net: '' },
        ],
        finNote: '출처: DART 투자설명서 · △는 적자',
      },
      stats: {
        price: { value: '', sub: '' },
        demand: { value: '', sub: '기관 대상' },
        lockup: { value: '', sub: '높을수록 상장일 매물 부담 적음' },
        deposit: { value: '', sub: '' },
      },
      timeline: {
        subscription: { when: '', note: '' },
        refund: { when: '', note: '균등 50% · 비례 50%' },
        listing: { when: '', note: '' },
        brokersLine: '',
      },
      points: { plus: ['', ''], minus: ['', ''] },
      outro: {
        title: '청약 성공 기원! 🍀',
        disclaimer:
          '본 콘텐츠는 정보 제공을 위한 것으로 투자 권유가 아닙니다.\n투자 판단과 그 책임은 투자자 본인에게 있습니다.\n작성일 기준 자료이며 실제 일정·수치는 변동될 수 있습니다.',
      },
    },
    body: {
      postTitle: '',
      greeting: '안녕하세요, 다리뷰다입니다.',
      intro: '',
      summaryLines: ['', '', ''],
      infoRows: [],
      companyParagraphs: [''],
      scheduleParagraphs: [''],
      checklistTitle: '✅ 청약 전 체크리스트',
      checklistLines: [''],
      disclaimer:
        '본 글은 정보 제공을 목적으로 하며 투자 권유가 아닙니다. 투자 판단과 그 책임은 투자자 본인에게 있습니다.',
      hashtags: '',
    },
    sources: [],
    notes: [],
  }
}

/**
 * A synced JSON may come from an older routine or be partially filled, so
 * unknown shapes deep-merge over defaults instead of crashing the app
 * (same defensive stance as useReviewDraft.loadSnapshot).
 */
export function normalizeIpoData(raw: unknown): IpoData {
  const base = createEmptyIpoData()
  if (typeof raw !== 'object' || raw === null) return base
  return deepMerge(base, raw as Record<string, unknown>) as IpoData
}

function deepMerge(base: unknown, patch: Record<string, unknown>): unknown {
  if (typeof base !== 'object' || base === null || Array.isArray(base)) {
    return patch
  }
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) }
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined || value === null) continue
    const baseValue = out[key]
    if (Array.isArray(value)) {
      out[key] = value
    } else if (typeof value === 'object' && typeof baseValue === 'object' && baseValue !== null) {
      out[key] = deepMerge(baseValue, value as Record<string, unknown>)
    } else {
      out[key] = value
    }
  }
  return out
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const

/** "청약 D-2 · 7월 13일(월) 시작" — recomputed at load so a stale JSON stays correct. */
export function computeDdayLine(subscriptionStart: string, today = new Date()): string {
  const start = parseIsoDate(subscriptionStart)
  if (!start) return ''
  const label = `${start.getMonth() + 1}월 ${start.getDate()}일(${WEEKDAYS[start.getDay()]}) 시작`
  const midnight = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const diff = Math.round((start.getTime() - midnight.getTime()) / 86_400_000)
  if (diff > 0) return `청약 D-${diff} · ${label}`
  if (diff === 0) return `오늘 청약 시작 · ${label}`
  return `청약 진행/마감 · ${label}`
}

function parseIsoDate(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!m) return null
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}
