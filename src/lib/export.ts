import type { ReviewDraft } from '../hooks/useReviewDraft'
import { dataUrlToFile, dataUrlToPngBlob } from './image'
import type { ReviewPhoto } from '../types'

/**
 * Placeholder line for a photo. Numbering must match orderedPhotosForExport
 * so the "사진 N 복사" buttons line up with the pasted text.
 */
function photoPlaceholder(index: number, roleLabel: string): string {
  return `(📷 사진 ${index} · ${roleLabel} — 이 줄을 지우고 붙여넣기)`
}

type TextStyle =
  | 'title'
  | 'muted'
  | 'section'
  | 'info'
  | 'body'
  | 'summary'
  | 'hashtags'

type ReviewBlock =
  | { kind: 'text'; line: string; style: TextStyle }
  | { kind: 'photo'; index: number; photo: ReviewPhoto; roleLabel: string }

/**
 * The review as an ordered list of text lines and photo slots. Photo numbering
 * follows the same hero → menu → food order as orderedPhotosForExport.
 */
function buildReviewBlocks(draft: ReviewDraft): ReviewBlock[] {
  const { form, heroPhoto, interiorPhotos, menuPhotos, foodPhotos, etcPhotos } = draft
  const blocks: ReviewBlock[] = []
  const text = (line: string, style: TextStyle = 'body') => blocks.push({ kind: 'text', line, style })
  let photoNumber = 0
  const photo = (p: ReviewPhoto, roleLabel: string) =>
    blocks.push({ kind: 'photo', index: ++photoNumber, photo: p, roleLabel })

  text(form.restaurantName || '가게 이름', 'title')
  text('')

  const infoRows: [string, string][] = [
    ['방문일', `${form.visitYear}년 ${Number(form.visitMonth)}월`],
    ['영업시간', form.hours],
    ['주차', form.parking],
    ['가격대', form.priceRange],
  ].filter(([, value]) => value.trim() !== '') as [string, string][]
  for (const [label, value] of infoRows) {
    text(`${label}: ${value}`, 'info')
  }
  if (infoRows.length > 0) text('')

  if (form.intro) {
    text(form.intro)
    text('')
  }

  if (heroPhoto) {
    photo(heroPhoto, '대표')
    text('')
  }

  if (interiorPhotos.length > 0) {
    text('[매장]', 'section')
    for (const interiorPhoto of interiorPhotos) {
      photo(interiorPhoto, '매장')
      if (interiorPhoto.caption) text(interiorPhoto.caption)
      text('')
    }
  }

  if (menuPhotos.length > 0 || form.menuNote) {
    text('[메뉴]', 'section')
    for (const menuPhoto of menuPhotos) {
      photo(menuPhoto, '메뉴판')
    }
    if (form.menuNote) text(form.menuNote, 'muted')
    text('')
  }

  if (foodPhotos.length > 0) {
    text('[음식 & 후기]', 'section')
    for (const foodPhoto of foodPhotos) {
      photo(foodPhoto, '음식')
      if (foodPhoto.caption) text(foodPhoto.caption)
      text('')
    }
  }

  for (const etcPhoto of etcPhotos) {
    photo(etcPhoto, '기타')
    if (etcPhoto.caption) text(etcPhoto.caption)
    text('')
  }

  if (form.summary) {
    text(form.summary, 'summary')
    text('')
  }

  const hashtags = formatHashtags(form.hashtags)
  if (hashtags) {
    text(hashtags, 'hashtags')
  }

  return blocks
}

/** "성수맛집, 카페, #디저트" → "#성수맛집 #카페 #디저트" — 쉼표/공백으로 나누고 #는 알아서 붙인다. */
export function formatHashtags(input: string): string {
  return input
    .split(/[,\s]+/)
    .map((tag) => tag.replace(/^#+/, ''))
    .filter((tag) => tag !== '')
    .map((tag) => `#${tag}`)
    .join(' ')
}

export function buildReviewText(draft: ReviewDraft): string {
  const lines = buildReviewBlocks(draft).map((block) =>
    block.kind === 'text' ? block.line : photoPlaceholder(block.index, block.roleLabel),
  )
  return lines.join('\n').trim()
}

/**
 * The review as HTML with real <img> tags, for the one-shot rich copy.
 * Image URLs must be publicly reachable (e.g. raw.githubusercontent.com) —
 * the Naver editor fetches and re-attaches them, but rejects data URIs.
 *
 * Styling only uses what the Naver editor keeps when sanitizing pasted HTML:
 * bold, font color/size, text-align, <blockquote> (→ 인용구), <hr> (→ 구분선).
 * Layout CSS like borders, backgrounds and rounded boxes gets stripped, so the
 * preview's info/summary boxes are approximated with 인용구 instead.
 */
export function buildReviewHtml(draft: ReviewDraft, urlByPhotoId: ReadonlyMap<string, string>): string {
  const blocks = buildReviewBlocks(draft)
  const out: string[] = []
  let i = 0
  while (i < blocks.length) {
    const block = blocks[i]
    if (block.kind === 'photo') {
      const url = urlByPhotoId.get(block.photo.id)
      if (url) out.push(`<p style="text-align: center;"><img src="${url}" alt="사진 ${block.index}"></p>`)
      i++
      continue
    }
    const box = boxOf(block.style)
    if (box) {
      const run: string[] = []
      while (i < blocks.length) {
        const current = blocks[i]
        if (current.kind !== 'text' || boxOf(current.style) !== box) break
        run.push(textLineHtml(current.line, current.style))
        i++
      }
      out.push(`<blockquote>${run.join('')}</blockquote>`)
      continue
    }
    out.push(textLineHtml(block.line, block.style))
    i++
  }
  return out.join('')
}

/** Consecutive lines of the same box kind are merged into one 인용구. */
function boxOf(style: TextStyle): 'info' | 'summary' | null {
  if (style === 'info') return 'info'
  if (style === 'summary') return 'summary'
  return null
}

function textLineHtml(line: string, style: TextStyle): string {
  const e = escapeHtml(line)
  switch (style) {
    case 'title':
      return `<p><span style="font-size: 24px;"><b>${e}</b></span></p>`
    case 'muted':
      return `<p><span style="color: #888888;">${e}</span></p>`
    case 'section': {
      // 구분선 + 큰 글씨 — quote styles can't survive a paste (verified: even
      // copying a published Naver post degrades its quotes to the default
      // style), while <hr>, font-size and bold reliably do.
      const name = escapeHtml(line.replace(/^\[|\]$/g, ''))
      return `<hr><p><span style="font-size: 19px;"><b>${name}</b></span></p>`
    }
    case 'info':
      return `<p>${infoLineInner(line)}</p>`
    case 'hashtags':
      return `<p><span style="color: #3366cc;">${e}</span></p>`
    default:
      return `<p>${e || '<br>'}</p>`
  }
}

/** Inner HTML of one 정보 박스 row, e.g. "방문일: 2026년 7월" → "<b>방문일</b> · 2026년 7월". */
function infoLineInner(line: string): string {
  const colon = line.indexOf(':')
  const label = escapeHtml(line.slice(0, colon))
  const value = escapeHtml(line.slice(colon + 1).trim())
  return `<b>${label}</b> · ${value}`
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export interface ExportPhoto {
  photo: ReviewPhoto
  filename: string
}

const ROLE_ORDER = { hero: 0, interior: 1, menu: 2, food: 3, etc: 4 } as const
const ROLE_FILE_LABEL = { hero: '대표', interior: '매장', menu: '메뉴판', food: '음식', etc: '기타' } as const

export function orderedPhotosForExport(draft: ReviewDraft): ExportPhoto[] {
  const sorted = [...draft.photos].sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role])
  const counters: Record<string, number> = {}
  return sorted.map((photo, i) => {
    counters[photo.role] = (counters[photo.role] ?? 0) + 1
    const filename = `${String(i + 1).padStart(2, '0')}_${ROLE_FILE_LABEL[photo.role]}${
      counters[photo.role] > 1 ? counters[photo.role] : ''
    }.jpg`
    return { photo, filename }
  })
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

/**
 * Copies one photo to the clipboard as a binary PNG — the same form a
 * screenshot takes. The Naver editor uploads binary pastes normally, unlike
 * data-URI <img> tags in pasted HTML, which it rejects as 존재하지 않는 이미지.
 */
export async function copyPhotoToClipboard(photo: ReviewPhoto): Promise<boolean> {
  if (typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write) return false
  try {
    // Pass the promise itself so Safari keeps the user-gesture window open.
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': dataUrlToPngBlob(photo.dataUrl) }),
    ])
    return true
  } catch {
    return false
  }
}

export function downloadPhoto(exportPhoto: ExportPhoto) {
  const file = dataUrlToFile(exportPhoto.photo.dataUrl, exportPhoto.filename)
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = exportPhoto.filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
