import type { ReactNode } from 'react'
import type { ReviewFormData } from '../types'

interface Props {
  form: ReviewFormData
  onChange: (patch: Partial<ReviewFormData>) => void
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-gray-500">{label}</span>
      {children}
    </label>
  )
}

const inputClass = 'w-full rounded border border-gray-200 px-3 py-2 text-sm'

export function ReviewForm({ form, onChange }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <Field label="가게 이름">
        <input
          type="text"
          className={inputClass}
          value={form.restaurantName}
          onChange={(e) => onChange({ restaurantName: e.target.value })}
          placeholder="예: 우래옥"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="방문 연도">
          <select
            className={inputClass}
            value={form.visitYear}
            onChange={(e) => onChange({ visitYear: e.target.value })}
          >
            {Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i).map((y) => (
              <option key={y} value={y}>
                {y}년
              </option>
            ))}
          </select>
        </Field>
        <Field label="방문 월">
          <select
            className={inputClass}
            value={form.visitMonth}
            onChange={(e) => onChange({ visitMonth: e.target.value })}
          >
            {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map((m) => (
              <option key={m} value={m}>
                {m}월
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="영업시간">
          <input
            type="text"
            className={inputClass}
            value={form.hours}
            onChange={(e) => onChange({ hours: e.target.value })}
            placeholder="11:00 - 21:30"
          />
        </Field>
        <Field label="주차">
          <input
            type="text"
            className={inputClass}
            value={form.parking}
            onChange={(e) => onChange({ parking: e.target.value })}
          />
        </Field>
      </div>

      <Field label="가격대">
        <input
          type="text"
          className={inputClass}
          value={form.priceRange}
          onChange={(e) => onChange({ priceRange: e.target.value })}
          placeholder="1인 15,000원~"
        />
      </Field>

      <Field label="인트로 (방문 계기 / 첫인상)">
        <textarea
          className={`${inputClass} resize-y`}
          rows={7}
          value={form.intro}
          onChange={(e) => onChange({ intro: e.target.value })}
        />
      </Field>

      <Field label="메뉴 설명 (메뉴판 사진 아래에 들어갈 텍스트)">
        <textarea
          className={`${inputClass} resize-y`}
          rows={5}
          value={form.menuNote}
          onChange={(e) => onChange({ menuNote: e.target.value })}
        />
      </Field>

      <Field label="총평 (마무리 한줄평)">
        <textarea
          className={`${inputClass} resize-y`}
          rows={5}
          value={form.summary}
          onChange={(e) => onChange({ summary: e.target.value })}
        />
      </Field>

      <Field label="해시태그">
        <input
          type="text"
          className={inputClass}
          value={form.hashtags}
          onChange={(e) => onChange({ hashtags: e.target.value })}
          placeholder="지역명맛집, 가게이름, 음식종류 — #는 알아서 붙어요"
        />
      </Field>
    </div>
  )
}
