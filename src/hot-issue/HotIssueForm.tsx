import type { ReactNode } from 'react'
import { PhotoUploader } from '../components/PhotoUploader'
import { processImageFile } from '../lib/image'
import {
  DEFAULT_IMAGE_POSITION,
  HOT_ISSUE_SLIDE_TYPE_LABEL,
  type HotIssueCategory,
  type HotIssueImagePosition,
  type HotIssueSlideType,
} from './types'
import type { HotIssueDraft } from './useHotIssueDraft'

const inputClass = 'w-full rounded border border-gray-200 px-3 py-2 text-sm'
const textareaClass = `${inputClass} resize-y`

const ADDABLE_SLIDE_TYPES: HotIssueSlideType[] = [
  'cover',
  'quote',
  'imageText',
  'imageCompare',
  'checklist',
  'table',
  'outro',
]

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-gray-500">{label}</span>
      {children}
    </label>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-sm font-semibold text-gray-700">{title}</h2>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  )
}

function ImageField({
  label,
  value,
  position,
  aspectRatio = '4 / 3',
  onChange,
  onPositionChange,
}: {
  label: string
  value: string
  position: HotIssueImagePosition
  aspectRatio?: string
  onChange: (dataUrl: string) => void
  onPositionChange: (position: HotIssueImagePosition) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium text-gray-500">{label}</span>
      {value ? (
        <>
          <div
            className="relative w-full overflow-hidden rounded border border-gray-200 bg-gray-100"
            style={{ aspectRatio }}
          >
            <img
              src={value}
              className="h-full w-full object-cover"
              style={{ objectPosition: `${position.x}% ${position.y}%` }}
              alt=""
            />
            <button
              type="button"
              onClick={() => onChange('')}
              className="absolute right-1 top-1 rounded bg-white/90 px-2 py-0.5 text-xs text-red-500"
            >
              삭제
            </button>
          </div>
          <label className="flex items-center gap-2 text-xs text-gray-500">
            <span className="w-16 flex-none">가로 위치</span>
            <input
              type="range"
              min={0}
              max={100}
              value={position.x}
              onChange={(e) => onPositionChange({ ...position, x: Number(e.target.value) })}
              className="flex-1"
            />
          </label>
          <label className="flex items-center gap-2 text-xs text-gray-500">
            <span className="w-16 flex-none">세로 위치</span>
            <input
              type="range"
              min={0}
              max={100}
              value={position.y}
              onChange={(e) => onPositionChange({ ...position, y: Number(e.target.value) })}
              className="flex-1"
            />
          </label>
        </>
      ) : (
        <PhotoUploader
          onFilesSelected={(files) => {
            const file = files[0]
            if (file) processImageFile(file).then(onChange)
          }}
        />
      )}
    </div>
  )
}

function SlideChrome({
  index,
  total,
  typeLabel,
  onRemove,
  onMoveUp,
  onMoveDown,
  children,
}: {
  index: number
  total: number
  typeLabel: string
  onRemove: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  children: ReactNode
}) {
  return (
    <section className="mb-8 rounded-lg border border-gray-200 p-3">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">
          카드 {index + 1} — {typeLabel}
        </h2>
        <div className="flex items-center gap-2 text-xs">
          <button type="button" onClick={onMoveUp} disabled={index === 0} className="text-gray-400 disabled:opacity-30">
            ↑
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={index === total - 1}
            className="text-gray-400 disabled:opacity-30"
          >
            ↓
          </button>
          <button type="button" onClick={onRemove} className="text-red-400">
            삭제
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  )
}

export function HotIssueForm({ draft }: { draft: HotIssueDraft }) {
  const {
    data,
    updateMeta,
    updateBody,
    addSlide,
    removeSlide,
    updateSlide,
    reorderSlides,
    setChecklistItem,
    addChecklistItem,
    removeChecklistItem,
    setCompareSide,
  } = draft
  const { meta, slides, body } = data

  function moveSlide(id: string, direction: -1 | 1) {
    const index = slides.findIndex((s) => s.id === id)
    const targetIndex = index + direction
    if (index === -1 || targetIndex < 0 || targetIndex >= slides.length) return
    reorderSlides(id, slides[targetIndex].id)
  }

  return (
    <div>
      <Section title="주제 정보">
        <div className="grid grid-cols-2 gap-3">
          <Field label="카테고리">
            <select
              className={inputClass}
              value={meta.category}
              onChange={(e) => updateMeta({ category: e.target.value as HotIssueCategory })}
            >
              <option value="경제">경제</option>
              <option value="생활">생활</option>
            </select>
          </Field>
          <Field label="주제/키워드">
            <input
              type="text"
              className={inputClass}
              value={meta.topic}
              onChange={(e) => updateMeta({ topic: e.target.value })}
            />
          </Field>
        </div>
      </Section>

      {slides.map((slide, i) => (
        <SlideChrome
          key={slide.id}
          index={i}
          total={slides.length}
          typeLabel={HOT_ISSUE_SLIDE_TYPE_LABEL[slide.type]}
          onRemove={() => removeSlide(slide.id)}
          onMoveUp={() => moveSlide(slide.id, -1)}
          onMoveDown={() => moveSlide(slide.id, 1)}
        >
          {slide.type === 'cover' && (
            <>
              <Field label="배지 문구">
                <input
                  type="text"
                  className={inputClass}
                  value={slide.badge}
                  onChange={(e) => updateSlide(slide.id, { badge: e.target.value })}
                />
              </Field>
              <Field label="제목 (강조 박스)">
                <textarea
                  className={textareaClass}
                  rows={2}
                  value={slide.title}
                  onChange={(e) => updateSlide(slide.id, { title: e.target.value })}
                />
              </Field>
              <Field label="부제 / 훅">
                <textarea
                  className={textareaClass}
                  rows={2}
                  value={slide.subtitle}
                  onChange={(e) => updateSlide(slide.id, { subtitle: e.target.value })}
                />
              </Field>
            </>
          )}

          {slide.type === 'quote' && (
            <>
              <Field label="상단 제목">
                <input
                  type="text"
                  className={inputClass}
                  value={slide.title}
                  onChange={(e) => updateSlide(slide.id, { title: e.target.value })}
                />
              </Field>
              <Field label="강조 문구">
                <textarea
                  className={textareaClass}
                  rows={2}
                  value={slide.highlight}
                  onChange={(e) => updateSlide(slide.id, { highlight: e.target.value })}
                />
              </Field>
              <Field label="부연 설명">
                <textarea
                  className={textareaClass}
                  rows={3}
                  value={slide.body}
                  onChange={(e) => updateSlide(slide.id, { body: e.target.value })}
                />
              </Field>
            </>
          )}

          {slide.type === 'imageText' && (
            <>
              <Field label="상단 제목">
                <input
                  type="text"
                  className={inputClass}
                  value={slide.title}
                  onChange={(e) => updateSlide(slide.id, { title: e.target.value })}
                />
              </Field>
              <ImageField
                label="이미지"
                value={slide.imageDataUrl}
                position={slide.imagePosition ?? DEFAULT_IMAGE_POSITION}
                aspectRatio="4 / 3"
                onChange={(dataUrl) => updateSlide(slide.id, { imageDataUrl: dataUrl })}
                onPositionChange={(imagePosition) => updateSlide(slide.id, { imagePosition })}
              />
              <Field label="이미지 설명 타이틀">
                <input
                  type="text"
                  className={inputClass}
                  value={slide.caption}
                  onChange={(e) => updateSlide(slide.id, { caption: e.target.value })}
                />
              </Field>
              <Field label="본문">
                <textarea
                  className={textareaClass}
                  rows={3}
                  value={slide.body}
                  onChange={(e) => updateSlide(slide.id, { body: e.target.value })}
                />
              </Field>
            </>
          )}

          {slide.type === 'imageCompare' && (
            <>
              <Field label="상단 제목">
                <input
                  type="text"
                  className={inputClass}
                  value={slide.title}
                  onChange={(e) => updateSlide(slide.id, { title: e.target.value })}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                {(['left', 'right'] as const).map((side) => (
                  <div key={side} className="flex flex-col gap-2 rounded border border-gray-100 p-2">
                    <ImageField
                      label={side === 'left' ? '왼쪽 이미지' : '오른쪽 이미지'}
                      value={slide[side].imageDataUrl}
                      position={slide[side].imagePosition ?? DEFAULT_IMAGE_POSITION}
                      aspectRatio="1 / 1"
                      onChange={(dataUrl) => setCompareSide(slide.id, side, { imageDataUrl: dataUrl })}
                      onPositionChange={(imagePosition) => setCompareSide(slide.id, side, { imagePosition })}
                    />
                    <Field label="라벨">
                      <input
                        type="text"
                        className={inputClass}
                        value={slide[side].label}
                        onChange={(e) => setCompareSide(slide.id, side, { label: e.target.value })}
                      />
                    </Field>
                    <Field label="설명">
                      <textarea
                        className={textareaClass}
                        rows={2}
                        value={slide[side].body}
                        onChange={(e) => setCompareSide(slide.id, side, { body: e.target.value })}
                      />
                    </Field>
                  </div>
                ))}
              </div>
            </>
          )}

          {slide.type === 'checklist' && (
            <>
              <Field label="상단 제목">
                <input
                  type="text"
                  className={inputClass}
                  value={slide.title}
                  onChange={(e) => updateSlide(slide.id, { title: e.target.value })}
                />
              </Field>
              <div className="flex flex-col gap-2">
                <span className="text-xs font-medium text-gray-500">체크리스트 항목</span>
                {slide.items.map((item, itemIndex) => (
                  <div key={itemIndex} className="flex items-start gap-2">
                    <textarea
                      className={textareaClass}
                      rows={2}
                      value={item}
                      onChange={(e) => setChecklistItem(slide.id, itemIndex, e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => removeChecklistItem(slide.id, itemIndex)}
                      className="mt-1 flex-none text-xs text-gray-300 active:text-red-400"
                      aria-label="항목 삭제"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addChecklistItem(slide.id)}
                  className="self-start text-xs text-green-700 underline"
                >
                  + 항목 추가
                </button>
              </div>
            </>
          )}

          {slide.type === 'table' && (
            <>
              <Field label="상단 제목">
                <input
                  type="text"
                  className={inputClass}
                  value={slide.title}
                  onChange={(e) => updateSlide(slide.id, { title: e.target.value })}
                />
              </Field>
              <Field label="열 제목 — 셀은 | 로 구분 (마지막 열이 파란색 강조)">
                <input
                  type="text"
                  className={inputClass}
                  value={slide.columns.join('|')}
                  onChange={(e) => updateSlide(slide.id, { columns: e.target.value.split('|') })}
                />
              </Field>
              <div className="flex flex-col gap-2">
                <span className="text-xs font-medium text-gray-500">행 — 셀은 | 로 구분</span>
                {slide.rows.map((row, rowIndex) => (
                  <div key={rowIndex} className="flex items-start gap-2">
                    <input
                      type="text"
                      className={inputClass}
                      value={row.join('|')}
                      onChange={(e) =>
                        updateSlide(slide.id, {
                          rows: slide.rows.map((r, i) => (i === rowIndex ? e.target.value.split('|') : r)),
                        })
                      }
                    />
                    <button
                      type="button"
                      onClick={() =>
                        updateSlide(slide.id, { rows: slide.rows.filter((_, i) => i !== rowIndex) })
                      }
                      className="mt-1 flex-none text-xs text-gray-300 active:text-red-400"
                      aria-label="행 삭제"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    updateSlide(slide.id, { rows: [...slide.rows, slide.columns.map(() => '')] })
                  }
                  className="self-start text-xs text-green-700 underline"
                >
                  + 행 추가
                </button>
              </div>
              <Field label="표 아래 참고 문구 (선택)">
                <input
                  type="text"
                  className={inputClass}
                  value={slide.note ?? ''}
                  onChange={(e) => updateSlide(slide.id, { note: e.target.value })}
                />
              </Field>
            </>
          )}

          {slide.type === 'outro' && (
            <>
              <Field label="제목">
                <input
                  type="text"
                  className={inputClass}
                  value={slide.title}
                  onChange={(e) => updateSlide(slide.id, { title: e.target.value })}
                />
              </Field>
              <Field label="마무리 메시지">
                <textarea
                  className={textareaClass}
                  rows={3}
                  value={slide.message}
                  onChange={(e) => updateSlide(slide.id, { message: e.target.value })}
                />
              </Field>
            </>
          )}

          <Field label="본문 문단 (카드 이미지에는 안 들어가고, 블로그 글 텍스트에만 추가돼요)">
            <textarea
              className={textareaClass}
              rows={3}
              value={slide.bodyText ?? ''}
              onChange={(e) => updateSlide(slide.id, { bodyText: e.target.value })}
            />
          </Field>
        </SlideChrome>
      ))}

      <div className="mb-8 flex flex-wrap gap-2">
        {ADDABLE_SLIDE_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => addSlide(type)}
            className="rounded-full border border-green-300 px-3 py-1.5 text-xs font-medium text-green-800 active:bg-green-50"
          >
            + {HOT_ISSUE_SLIDE_TYPE_LABEL[type]}
          </button>
        ))}
      </div>

      <Section title="블로그 본문">
        <Field label="글 제목">
          <input
            type="text"
            className={inputClass}
            value={body.postTitle}
            onChange={(e) => updateBody({ postTitle: e.target.value })}
          />
        </Field>
        <Field label="인사말">
          <input
            type="text"
            className={inputClass}
            value={body.greeting}
            onChange={(e) => updateBody({ greeting: e.target.value })}
          />
        </Field>
        <Field label="도입부 (**굵게** 표시 가능)">
          <textarea
            className={textareaClass}
            rows={3}
            value={body.intro}
            onChange={(e) => updateBody({ intro: e.target.value })}
          />
        </Field>
        <Field label="마무리 문단">
          <textarea
            className={textareaClass}
            rows={3}
            value={body.closing}
            onChange={(e) => updateBody({ closing: e.target.value })}
          />
        </Field>
        <Field label="면책/유의 문구 (필요할 때만)">
          <textarea
            className={textareaClass}
            rows={2}
            value={body.disclaimer}
            onChange={(e) => updateBody({ disclaimer: e.target.value })}
          />
        </Field>
        <Field label="해시태그">
          <input
            type="text"
            className={inputClass}
            value={body.hashtags}
            onChange={(e) => updateBody({ hashtags: e.target.value })}
          />
        </Field>
      </Section>
    </div>
  )
}
