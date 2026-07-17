import { copyTextToClipboard, escapeHtml, formatHashtags } from '../lib/export'
import { HOT_ISSUE_SLIDE_TYPE_LABEL, type HotIssueData, type HotIssueSlide } from './types'

export { copyTextToClipboard }

type HotIssueTextStyle = 'greeting' | 'body' | 'muted' | 'hashtags'

/**
 * The post as an ordered list of blocks, mirroring ipo/export.ts. The card
 * index is 1-based and follows data.slides order — must match the upload
 * order in HotIssueExportPanel.
 */
export type HotIssueBlock =
  | { kind: 'text'; line: string; style: HotIssueTextStyle }
  | { kind: 'quote'; lines: string[] }
  | { kind: 'card'; index: number; alt: string }
  | { kind: 'hr'; heading: string }

export function buildHotIssueBlocks(data: HotIssueData): HotIssueBlock[] {
  const { body, slides } = data
  const blocks: HotIssueBlock[] = []
  const text = (line: string, style: HotIssueTextStyle = 'body') => blocks.push({ kind: 'text', line, style })
  const blank = () => text('')

  text(body.greeting, 'greeting')
  blank()
  if (body.intro) {
    text(body.intro)
    blank()
  }

  slides.forEach((slide, i) => {
    const index = i + 1
    if (slide.type !== 'cover') {
      blocks.push({ kind: 'hr', heading: slideHeading(slide) })
      blank()
    }
    blocks.push({ kind: 'card', index, alt: `${data.meta.topic} — ${HOT_ISSUE_SLIDE_TYPE_LABEL[slide.type]}` })
    blank()

    switch (slide.type) {
      case 'cover':
        break
      case 'quote': {
        const lines = [slide.highlight, slide.body].filter((line) => line.trim() !== '')
        if (lines.length > 0) {
          blocks.push({ kind: 'quote', lines })
          blank()
        }
        break
      }
      case 'imageText':
        if (slide.body) {
          text(slide.body)
          blank()
        }
        break
      case 'imageCompare': {
        const lines = [slide.left, slide.right]
          .filter((side) => side.label.trim() !== '' || side.body.trim() !== '')
          .map((side) => `**${side.label}** · ${side.body}`)
        if (lines.length > 0) {
          blocks.push({ kind: 'quote', lines })
          blank()
        }
        break
      }
      case 'checklist': {
        const items = slide.items.filter((item) => item.trim() !== '')
        if (items.length > 0) {
          blocks.push({ kind: 'quote', lines: [`**${slide.title}**`, ...items] })
          blank()
        }
        break
      }
      case 'outro':
        if (slide.message) {
          text(slide.message)
          blank()
        }
        break
    }
  })

  if (body.closing) {
    text(body.closing)
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

function slideHeading(slide: HotIssueSlide): string {
  if ('title' in slide && slide.title) return slide.title
  return HOT_ISSUE_SLIDE_TYPE_LABEL[slide.type]
}

/**
 * Naver-editor-safe HTML (same surviving subset as lib/export.ts: bold,
 * font-size, color, text-align, blockquote, hr). Card image URLs must be
 * public — the editor fetches them and rejects data URIs.
 */
export function buildHotIssueHtml(data: HotIssueData, urlByCardIndex: ReadonlyMap<number, string>): string {
  const out: string[] = []
  for (const block of buildHotIssueBlocks(data)) {
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

export function buildHotIssueText(data: HotIssueData): string {
  const lines: string[] = []
  for (const block of buildHotIssueBlocks(data)) {
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

function textLineHtml(line: string, style: HotIssueTextStyle): string {
  switch (style) {
    case 'greeting':
      return `<p><b>${inlineHtml(line)}</b></p>`
    case 'muted':
      return `<p><span style="color: #888888;">${inlineHtml(line)}</span></p>`
    case 'hashtags':
      return `<p><span style="color: #3366cc;">${escapeHtml(line)}</span></p>`
    default:
      return `<p>${line === '' ? '<br>' : inlineHtml(line)}</p>`
  }
}

/** Escapes HTML, then converts `**bold**` markers to <b>. */
export function inlineHtml(line: string): string {
  return escapeHtml(line).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
}

function stripBoldMarkers(line: string): string {
  return line.replace(/\*\*([^*]+)\*\*/g, '$1')
}
