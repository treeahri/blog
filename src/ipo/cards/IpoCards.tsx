import type { IpoData } from '../types'
import './cards.css'

interface CardProps {
  data: IpoData
}

const WATERMARK = 'daReviewDa'

export const IPO_CARD_COUNT = 6

export const IPO_CARD_LABELS = [
  '표지',
  '기업 & 실적',
  '핵심 정보',
  '청약 일정',
  '포인트 & 유의',
  '마무리',
] as const

export function CardCover({ data }: CardProps) {
  const { cover } = data.cards
  return (
    <section className="ipo-card">
      <div className="panel">
        <span className="badge">공모주 청약</span>
        <p className="cover-dday">{cover.ddayLine}</p>
        <h1 className="cover-name">{data.stock.name}</h1>
        <p className="cover-hook">{cover.hook}</p>
        <p className="cover-market">{cover.marketLine}</p>
        <p className="cover-arrow">⟶</p>
        <p className="watermark">{WATERMARK}</p>
      </div>
    </section>
  )
}

export function CardCompany({ data }: CardProps) {
  const { company } = data.cards
  return (
    <section className="ipo-card">
      <div className="panel">
        <span className="badge">회사 정보</span>
        <div className="about">
          {company.aboutRows.map((row, i) => (
            <div className="about-row" key={i}>
              <span className="k">{row.k}</span>
              <span className="v">{row.v}</span>
            </div>
          ))}
        </div>
        <div className="fin">
          <p className="fin-title">{company.finTitle}</p>
          <table>
            <thead>
              <tr>
                <th>연도</th>
                <th>매출액</th>
                <th>영업이익</th>
                <th>순이익</th>
              </tr>
            </thead>
            <tbody>
              {company.finRows.map((row, i) => (
                <tr key={i}>
                  <td>{row.year}</td>
                  <td>{row.revenue}</td>
                  <td>{row.op}</td>
                  <td>{row.net}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="fin-note">{company.finNote}</p>
        </div>
        <p className="watermark">{WATERMARK}</p>
      </div>
    </section>
  )
}

export function CardStats({ data }: CardProps) {
  const { stats } = data.cards
  const tiles = [
    { label: '확정 공모가', ...stats.price },
    { label: '수요예측 경쟁률', ...stats.demand },
    { label: '의무보유확약', ...stats.lockup },
    { label: '일반청약자 배정', ...stats.deposit },
  ]
  return (
    <section className="ipo-card">
      <div className="panel">
        <span className="badge">핵심 정보 한눈에</span>
        <div className="tiles">
          {tiles.map((tile) => (
            <div className="tile" key={tile.label}>
              <p className="label">{tile.label}</p>
              <p className="value">{tile.value}</p>
              <p className="sub">{tile.sub}</p>
            </div>
          ))}
        </div>
        <p className="watermark">{WATERMARK}</p>
      </div>
    </section>
  )
}

export function CardTimeline({ data }: CardProps) {
  const { timeline } = data.cards
  const rows = [
    { what: '청약', ...timeline.subscription },
    { what: '환불 / 배정', ...timeline.refund },
    { what: '상장', ...timeline.listing },
  ]
  return (
    <section className="ipo-card">
      <div className="panel">
        <span className="badge">청약 일정</span>
        <p className="brokers">
          청약 증권사 · <b>{timeline.brokersLine}</b>
        </p>
        <div className="timeline">
          {rows.map((row, i) => (
            <div className="tl-row" key={row.what}>
              <div className="tl-dotcol">
                <div className="tl-dot" />
                {i < rows.length - 1 && <div className="tl-line" />}
              </div>
              <div className="tl-body">
                <p className="when">{row.when}</p>
                <p className="what">{row.what}</p>
                <p className="note">{row.note}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="watermark">{WATERMARK}</p>
      </div>
    </section>
  )
}

export function CardPoints({ data }: CardProps) {
  const { points } = data.cards
  return (
    <section className="ipo-card">
      <div className="panel">
        <span className="badge">포인트 & 유의사항</span>
        <div className="points">
          {points.plus.filter(Boolean).map((line, i) => (
            <div className="point plus" key={`p${i}`}>
              <span className="mark">✓</span>
              <span>{line}</span>
            </div>
          ))}
          {points.minus.filter(Boolean).map((line, i) => (
            <div className="point minus" key={`m${i}`}>
              <span className="mark">!</span>
              <span>{line}</span>
            </div>
          ))}
        </div>
        <p className="watermark">{WATERMARK}</p>
      </div>
    </section>
  )
}

export function CardOutro({ data }: CardProps) {
  const { outro } = data.cards
  return (
    <section className="ipo-card">
      <div className="panel">
        <span className="badge">{data.stock.name}</span>
        <h2 className="outro-title">{outro.title}</h2>
        <p className="outro-disclaimer">{outro.disclaimer}</p>
        <p className="watermark">{WATERMARK}</p>
      </div>
    </section>
  )
}

export const CARD_COMPONENTS = [
  CardCover,
  CardCompany,
  CardStats,
  CardTimeline,
  CardPoints,
  CardOutro,
] as const

/**
 * Renders all six cards; `onCardRef` exposes each card's element so the
 * preview can scale them and the export panel can rasterize them.
 */
export function IpoCardDeck({
  data,
  onCardRef,
}: CardProps & { onCardRef?: (index: number, el: HTMLElement | null) => void }) {
  return (
    <>
      {CARD_COMPONENTS.map((Card, i) => (
        <div key={i} ref={(el) => onCardRef?.(i, el)} style={{ width: 1080, height: 1080, flex: 'none' }}>
          <Card data={data} />
        </div>
      ))}
    </>
  )
}
