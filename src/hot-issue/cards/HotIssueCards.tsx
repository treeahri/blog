import type { HotIssueData, HotIssueSlide } from '../types'
import './cards.css'

const WATERMARK = 'daReviewDa'

type SlideOf<T extends HotIssueSlide['type']> = Extract<HotIssueSlide, { type: T }>

function SlideImage({ src, alt }: { src: string; alt: string }) {
  if (!src) return <div className="image-placeholder">이미지 없음</div>
  return <img src={src} alt={alt} />
}

function SlideCover({ slide }: { slide: SlideOf<'cover'> }) {
  return (
    <>
      <span className="badge">{slide.badge}</span>
      <h1 className="cover-title-box">{slide.title}</h1>
      <p className="cover-subtitle">{slide.subtitle}</p>
      <div className="cover-arrow">→</div>
    </>
  )
}

function SlideQuote({ slide }: { slide: SlideOf<'quote'> }) {
  return (
    <div className="quote-slide">
      <h2 className="heading">{slide.title}</h2>
      <div className="quote-box">
        <p className="quote-highlight">{slide.highlight}</p>
      </div>
      <p className="quote-body">{slide.body}</p>
    </div>
  )
}

function SlideImageText({ slide }: { slide: SlideOf<'imageText'> }) {
  return (
    <>
      <h2 className="heading">{slide.title}</h2>
      <div className="single-image">
        <SlideImage src={slide.imageDataUrl} alt={slide.caption || slide.title} />
      </div>
      <p className="image-caption">{slide.caption}</p>
      <p className="image-body">{slide.body}</p>
    </>
  )
}

function SlideImageCompare({ slide }: { slide: SlideOf<'imageCompare'> }) {
  return (
    <>
      <h2 className="heading">{slide.title}</h2>
      <div className="compare-row">
        {[slide.left, slide.right].map((side, i) => (
          <div className="compare-col" key={i}>
            <div className="compare-image">
              <SlideImage src={side.imageDataUrl} alt={side.label} />
            </div>
            <p className="compare-label">{side.label}</p>
            <p className="compare-body">{side.body}</p>
          </div>
        ))}
      </div>
    </>
  )
}

function SlideChecklist({ slide }: { slide: SlideOf<'checklist'> }) {
  return (
    <>
      <h2 className="heading">{slide.title}</h2>
      <div className="checklist">
        {slide.items.filter(Boolean).map((item, i) => (
          <div className="check-item" key={i}>
            <span className="check-mark">✓</span>
            <span className="check-text">{item}</span>
          </div>
        ))}
      </div>
    </>
  )
}

function SlideOutro({ slide }: { slide: SlideOf<'outro'> }) {
  return (
    <>
      <h2 className="outro-title">{slide.title}</h2>
      <p className="outro-message">{slide.message}</p>
    </>
  )
}

function SlideBody({ slide }: { slide: HotIssueSlide }) {
  switch (slide.type) {
    case 'cover':
      return <SlideCover slide={slide} />
    case 'quote':
      return <SlideQuote slide={slide} />
    case 'imageText':
      return <SlideImageText slide={slide} />
    case 'imageCompare':
      return <SlideImageCompare slide={slide} />
    case 'checklist':
      return <SlideChecklist slide={slide} />
    case 'outro':
      return <SlideOutro slide={slide} />
  }
}

export function HotIssueCard({ slide }: { slide: HotIssueSlide }) {
  return (
    <section className="hi-card">
      <div className="panel">
        <SlideBody slide={slide} />
        {slide.type !== 'cover' && <p className="watermark">{WATERMARK}</p>}
      </div>
    </section>
  )
}

/**
 * Renders every slide in the (variable-length) deck; `onCardRef` exposes each
 * card's element so the preview can scale them and the export panel can
 * rasterize them, same contract as IpoCardDeck.
 */
export function HotIssueCardDeck({
  data,
  onCardRef,
}: {
  data: HotIssueData
  onCardRef?: (index: number, el: HTMLElement | null) => void
}) {
  return (
    <>
      {data.slides.map((slide, i) => (
        <div
          key={slide.id}
          ref={(el) => onCardRef?.(i, el)}
          style={{ width: 1080, height: 1080, flex: 'none' }}
        >
          <HotIssueCard slide={slide} />
        </div>
      ))}
    </>
  )
}
