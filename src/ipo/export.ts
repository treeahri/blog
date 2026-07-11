import { copyTextToClipboard, escapeHtml, formatHashtags } from '../lib/export'
import type { IpoData } from './types'

export { copyTextToClipboard }

/**
 * The post as an ordered list of blocks, mirroring lib/export.ts. The card
 * indexes (1~3) refer to 표지/기업&실적/핵심정보 — only those go into the post;
 * the numbering must match the upload order in IpoExportPanel.
 */
export type IpoBlock =
  | { kind: 'text'; line: string; style: IpoTextStyle }
  | { kind: 'quote'; lines: string[] }
  | { kind: 'card'; index: 1 | 2 | 3; alt: string }
  | { kind: 'hr'; heading: string }

type IpoTextStyle = 'greeting' | 'body' | 'plusHead' | 'minusHead' | 'muted' | 'hashtags'

export function buildIpoBlocks(data: IpoData): IpoBlock[] {
  const { body, cards, stock } = data
  const blocks: IpoBlock[] = []
  const text = (line: string, style: IpoTextStyle = 'body') => blocks.push({ kind: 'text', line, style })
  const blank = () => text('')

  text(body.greeting, 'greeting')
  blank()
  if (body.intro) {
    text(body.intro)
    blank()
  }

  const summaryLines = body.summaryLines.filter((line) => line.trim() !== '')
  if (summaryLines.length > 0) {
    blocks.push({ kind: 'quote', lines: ['**핵심 3줄 요약**', ...summaryLines] })
    blank()
  }

  blocks.push({ kind: 'card', index: 1, alt: `${stock.name} 공모주 청약 표지` })
  blank()

  const infoRows = body.infoRows.filter((row) => row.k.trim() !== '' || row.v.trim() !== '')
  if (infoRows.length > 0) {
    blocks.push({ kind: 'quote', lines: infoRows.map((row) => `**${row.k}** · ${row.v}`) })
    blank()
  }

  blocks.push({ kind: 'hr', heading: '어떤 회사인가요?' })
  blank()
  blocks.push({ kind: 'card', index: 2, alt: `${stock.name} 기업 소개와 3개년 실적` })
  blank()
  for (const paragraph of body.companyParagraphs.filter((p) => p.trim() !== '')) {
    text(paragraph)
    blank()
  }

  blocks.push({ kind: 'hr', heading: '청약 정보와 일정' })
  blank()
  blocks.push({ kind: 'card', index: 3, alt: `${stock.name} 공모가 경쟁률 핵심 정보` })
  blank()
  for (const paragraph of body.scheduleParagraphs.filter((p) => p.trim() !== '')) {
    text(paragraph)
    blank()
  }

  const plus = cards.points.plus.filter((line) => line.trim() !== '')
  const minus = cards.points.minus.filter((line) => line.trim() !== '')
  if (plus.length > 0 || minus.length > 0) {
    blocks.push({ kind: 'hr', heading: '투자 포인트 & 유의사항' })
    blank()
    if (plus.length > 0) {
      text('👍 포인트', 'plusHead')
      for (const line of plus) text(`· ${line}`)
      blank()
    }
    if (minus.length > 0) {
      text('⚠️ 유의', 'minusHead')
      for (const line of minus) text(`· ${line}`)
      blank()
    }
  }

  const checklist = body.checklistLines.filter((line) => line.trim() !== '')
  if (checklist.length > 0) {
    blocks.push({ kind: 'quote', lines: [`**${body.checklistTitle}**`, ...checklist] })
    blank()
  }

  if (body.disclaimer) {
    text(body.disclaimer, 'muted')
    blank()
  }
  const hashtags = formatHashtags(body.hashtags)
  if (hashtags) text(hashtags, 'hashtags')

  return blocks
}

/**
 * Naver-editor-safe HTML (same surviving subset as lib/export.ts: bold,
 * font-size, color, text-align, blockquote, hr). Card image URLs must be
 * public — the editor fetches them and rejects data URIs.
 */
export function buildIpoHtml(data: IpoData, urlByCardIndex: ReadonlyMap<number, string>): string {
  const out: string[] = []
  for (const block of buildIpoBlocks(data)) {
    switch (block.kind) {
      case 'card': {
        const url = urlByCardIndex.get(block.index)
        if (url) out.push(`<p style="text-align: center;"><img src="${url}" alt="${escapeHtml(block.alt)}"></p>`)
        break
      }
      case 'quote':
        out.push(`<blockquote>${block.lines.map((line) => `<p>${inlineHtml(line)}</p>`).join('')}</blockquote>`)
        break
      case 'hr':
        out.push(`<hr><p><span style="font-size: 19px;"><b>${escapeHtml(block.heading)}</b></span></p>`)
        break
      case 'text':
        out.push(textLineHtml(block.line, block.style))
        break
    }
  }
  return out.join('')
}

export function buildIpoText(data: IpoData): string {
  const lines: string[] = []
  for (const block of buildIpoBlocks(data)) {
    switch (block.kind) {
      case 'card':
        lines.push(`(📷 카드 ${block.index} — 이 줄을 지우고 붙여넣기)`)
        break
      case 'quote':
        lines.push(...block.lines.map(stripBoldMarkers))
        break
      case 'hr':
        lines.push(`[${block.heading}]`)
        break
      case 'text':
        lines.push(stripBoldMarkers(block.line))
        break
    }
  }
  return lines.join('\n').trim()
}

function textLineHtml(line: string, style: IpoTextStyle): string {
  switch (style) {
    case 'greeting':
      return `<p><b>${inlineHtml(line)}</b></p>`
    case 'plusHead':
      return `<p><span style="color: #2e8b57;"><b>${escapeHtml(line)}</b></span></p>`
    case 'minusHead':
      return `<p><span style="color: #cc3333;"><b>${escapeHtml(line)}</b></span></p>`
    case 'muted':
      return `<p><span style="color: #888888;">${inlineHtml(line)}</span></p>`
    case 'hashtags':
      return `<p><span style="color: #3366cc;">${escapeHtml(line)}</span></p>`
    default:
      return `<p>${line === '' ? '<br>' : inlineHtml(line)}</p>`
  }
}

/** Escapes HTML, then converts routine-written `**bold**` markers to <b>. */
export function inlineHtml(line: string): string {
  return escapeHtml(line).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
}

function stripBoldMarkers(line: string): string {
  return line.replace(/\*\*([^*]+)\*\*/g, '$1')
}
