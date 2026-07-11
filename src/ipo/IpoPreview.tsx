import { useLayoutEffect, useRef, useState } from 'react'
import { CARD_COMPONENTS, IPO_CARD_LABELS } from './cards/IpoCards'
import { buildIpoBlocks, inlineHtml } from './export'
import { IpoExportPanel } from './IpoExportPanel'
import type { IpoDraft } from './useIpoDraft'

const CARD_SIZE = 1080

export function IpoPreview({ draft }: { draft: IpoDraft }) {
  return (
    <div>
      <CardPreviews draft={draft} />
      <BodyPreview draft={draft} />
      <div className="mx-auto my-6 max-w-xl border-t border-gray-200" />
      <IpoExportPanel draft={draft} />
    </div>
  )
}

function CardPreviews({ draft }: { draft: IpoDraft }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)

  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver(() => setWidth(el.clientWidth))
    observer.observe(el)
    setWidth(el.clientWidth)
    return () => observer.disconnect()
  }, [])

  const scale = width / CARD_SIZE

  return (
    <div className="mx-auto max-w-xl px-4">
      <div ref={containerRef} className="flex flex-col gap-5">
        {width > 0 &&
          CARD_COMPONENTS.map((Card, i) => (
            <figure key={i}>
              <figcaption className="mb-1 text-xs font-medium text-gray-500">
                카드 {i + 1} — {IPO_CARD_LABELS[i]}
              </figcaption>
              <div
                className="overflow-hidden rounded border border-gray-200"
                style={{ width, height: width }}
              >
                <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}>
                  <Card data={draft.data} />
                </div>
              </div>
            </figure>
          ))}
      </div>
    </div>
  )
}

function BodyPreview({ draft }: { draft: IpoDraft }) {
  const blocks = buildIpoBlocks(draft.data)
  return (
    <article className="mx-auto mt-8 max-w-xl px-4">
      <h3 className="mb-3 text-sm font-semibold text-gray-700">본문 미리보기</h3>
      <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm leading-relaxed">
        {blocks.map((block, i) => {
          switch (block.kind) {
            case 'card':
              return (
                <p key={i} className="my-2 rounded bg-gray-100 py-2 text-center text-xs text-gray-400">
                  📷 카드 {block.index} — {IPO_CARD_LABELS[block.index - 1]}
                </p>
              )
            case 'quote':
              return (
                <blockquote key={i} className="my-2 border-l-4 border-gray-300 bg-gray-50 px-3 py-2">
                  {block.lines.map((line, j) => (
                    <p key={j} dangerouslySetInnerHTML={{ __html: inlineHtml(line) }} />
                  ))}
                </blockquote>
              )
            case 'hr':
              return (
                <div key={i} className="my-4 border-t border-gray-200 pt-3">
                  <p className="text-base font-bold">{block.heading}</p>
                </div>
              )
            case 'text': {
              if (block.line === '') return <div key={i} className="h-3" />
              const styleClass =
                block.style === 'plusHead'
                  ? 'font-bold text-emerald-700'
                  : block.style === 'minusHead'
                    ? 'font-bold text-red-600'
                    : block.style === 'muted'
                      ? 'text-gray-400'
                      : block.style === 'hashtags'
                        ? 'text-blue-600'
                        : block.style === 'greeting'
                          ? 'font-bold'
                          : ''
              return (
                <p key={i} className={styleClass} dangerouslySetInnerHTML={{ __html: inlineHtml(block.line) }} />
              )
            }
          }
        })}
      </div>
    </article>
  )
}
