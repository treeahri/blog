import type { ReactNode } from 'react'
import type { ReviewDraft } from '../hooks/useReviewDraft'
import { formatHashtags } from '../lib/export'
import { PhotoImg } from './PhotoImg'

interface Props {
  draft: ReviewDraft
}

function PhotoBox({ dataUrl, placeholder }: { dataUrl?: string; placeholder: string }) {
  if (dataUrl) {
    return <PhotoImg dataUrl={dataUrl} className="aspect-[4/3] w-full object-cover" />
  }
  return (
    <div className="flex aspect-[4/3] w-full items-center justify-center bg-[repeating-linear-gradient(45deg,#e3e3e3,#e3e3e3_10px,#ececec_10px,#ececec_20px)] text-sm text-gray-400">
      {placeholder}
    </div>
  )
}

/** Mimics the Naver editor's default 따옴표 인용구, which pasted blockquotes become. */
function NaverQuote({ children }: { children: ReactNode }) {
  return (
    <div className="my-7 text-center">
      <div className="font-serif text-3xl leading-none text-gray-300">❝</div>
      <div className="flex flex-col gap-0.5 py-2 text-[15px]">{children}</div>
      <div className="font-serif text-3xl leading-none text-gray-300">❞</div>
    </div>
  )
}

/** 구분선 + 19px bold, matching the export's <hr> + font-size markup. */
function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <>
      <hr className="mt-9 border-t border-gray-300" />
      <h2 className="mb-4 mt-5 text-[19px] font-bold">{children}</h2>
    </>
  )
}

function CaptionedPhotos({
  photos,
  placeholder,
}: {
  photos: { id: string; dataUrl: string; caption: string }[]
  placeholder: string
}) {
  return (
    <div className="flex flex-col gap-7">
      {photos.map((p) => (
        <div key={p.id}>
          <PhotoBox dataUrl={p.dataUrl} placeholder={placeholder} />
          {p.caption && <p className="mt-2">{p.caption}</p>}
        </div>
      ))}
    </div>
  )
}

export function TemplatePreview({ draft }: Props) {
  const { form, heroPhoto, interiorPhotos, menuPhotos, foodPhotos, etcPhotos } = draft

  const infoRows: [string, string][] = [
    ['방문일', `${form.visitYear}년 ${form.visitMonth}월`],
    ['영업시간', form.hours],
    ['주차', form.parking],
    ['가격대', form.priceRange],
  ].filter(([, value]) => value.trim() !== '') as [string, string][]

  return (
    <article className="mx-auto max-w-xl bg-white p-5 text-[15px] leading-[1.8] text-[#333]">
      <h1 className="mb-1 text-[24px] font-bold leading-snug">
        {form.restaurantName || '가게 이름'}
      </h1>

      {infoRows.length > 0 && (
        <NaverQuote>
          {infoRows.map(([label, value]) => (
            <p key={label}>
              <b>{label}</b> · {value}
            </p>
          ))}
        </NaverQuote>
      )}

      {form.intro && <p className="mb-6">{form.intro}</p>}

      <div className="mb-6">
        <PhotoBox dataUrl={heroPhoto?.dataUrl} placeholder="대표 사진" />
      </div>

      {interiorPhotos.length > 0 && (
        <section>
          <SectionTitle>매장</SectionTitle>
          <CaptionedPhotos photos={interiorPhotos} placeholder="매장 사진" />
        </section>
      )}

      {(menuPhotos.length > 0 || form.menuNote) && (
        <section>
          <SectionTitle>메뉴</SectionTitle>
          {menuPhotos.length > 0 ? (
            <div className="mb-2 flex flex-col gap-2">
              {menuPhotos.map((p) => (
                <PhotoBox key={p.id} dataUrl={p.dataUrl} placeholder="메뉴판 사진" />
              ))}
            </div>
          ) : (
            <PhotoBox placeholder="메뉴판 사진" />
          )}
          {form.menuNote && <p className="mt-2 text-gray-500">{form.menuNote}</p>}
        </section>
      )}

      {foodPhotos.length > 0 && (
        <section>
          <SectionTitle>음식 &amp; 후기</SectionTitle>
          <CaptionedPhotos photos={foodPhotos} placeholder="음식 사진" />
        </section>
      )}

      {etcPhotos.length > 0 && (
        <div className="mt-7">
          <CaptionedPhotos photos={etcPhotos} placeholder="기타 사진" />
        </div>
      )}

      {form.summary && (
        <NaverQuote>
          <p>{form.summary}</p>
        </NaverQuote>
      )}

      {formatHashtags(form.hashtags) && (
        <p className="mt-6 leading-loose text-blue-600">{formatHashtags(form.hashtags)}</p>
      )}
    </article>
  )
}
