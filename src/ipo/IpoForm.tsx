import type { ReactNode } from 'react'
import type { IpoDraft } from './useIpoDraft'

const inputClass = 'w-full rounded border border-gray-200 px-3 py-2 text-sm'
const textareaClass = `${inputClass} resize-y`

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

function ListEditor({
  label,
  items,
  rows = 2,
  onItemChange,
  onAdd,
  onRemove,
}: {
  label: string
  items: string[]
  rows?: number
  onItemChange: (index: number, value: string) => void
  onAdd: () => void
  onRemove: (index: number) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium text-gray-500">{label}</span>
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-2">
          <textarea
            className={textareaClass}
            rows={rows}
            value={item}
            onChange={(e) => onItemChange(i, e.target.value)}
          />
          <button
            type="button"
            onClick={() => onRemove(i)}
            className="mt-1 flex-none text-xs text-gray-300 active:text-red-400"
            aria-label="항목 삭제"
          >
            ✕
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={onAdd}
        className="self-start text-xs text-green-700 underline"
      >
        + 항목 추가
      </button>
    </div>
  )
}

export function IpoForm({ draft }: { draft: IpoDraft }) {
  const { data, updateData, setListItem, addListItem, removeListItem } = draft
  const { cards, body } = data

  return (
    <div>
      <Section title="종목 기본 정보">
        <div className="grid grid-cols-2 gap-3">
          <Field label="종목명">
            <input
              type="text"
              className={inputClass}
              value={data.stock.name}
              onChange={(e) => updateData({ stock: { name: e.target.value } })}
            />
          </Field>
          <Field label="시장">
            <input
              type="text"
              className={inputClass}
              value={data.stock.market}
              onChange={(e) => updateData({ stock: { market: e.target.value } })}
            />
          </Field>
        </div>
        <Field label="업종/섹터">
          <input
            type="text"
            className={inputClass}
            value={data.stock.sector}
            onChange={(e) => updateData({ stock: { sector: e.target.value } })}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="청약 시작일">
            <input
              type="date"
              className={inputClass}
              value={data.schedule.subscriptionStart}
              onChange={(e) => updateData({ schedule: { subscriptionStart: e.target.value } })}
            />
          </Field>
          <Field label="청약 마감일">
            <input
              type="date"
              className={inputClass}
              value={data.schedule.subscriptionEnd}
              onChange={(e) => updateData({ schedule: { subscriptionEnd: e.target.value } })}
            />
          </Field>
          <Field label="환불일">
            <input
              type="date"
              className={inputClass}
              value={data.schedule.refundDate}
              onChange={(e) => updateData({ schedule: { refundDate: e.target.value } })}
            />
          </Field>
          <Field label="상장일">
            <input
              type="date"
              className={inputClass}
              value={data.schedule.listingDate}
              onChange={(e) => updateData({ schedule: { listingDate: e.target.value } })}
            />
          </Field>
        </div>
      </Section>

      <Section title="카드 1 — 표지">
        <Field label="D-day 줄">
          <input
            type="text"
            className={inputClass}
            value={cards.cover.ddayLine}
            onChange={(e) => updateData({ cards: { cover: { ddayLine: e.target.value } } })}
          />
        </Field>
        <Field label="한 줄 훅">
          <textarea
            className={textareaClass}
            rows={2}
            value={cards.cover.hook}
            onChange={(e) => updateData({ cards: { cover: { hook: e.target.value } } })}
          />
        </Field>
        <Field label="시장 표기줄">
          <input
            type="text"
            className={inputClass}
            value={cards.cover.marketLine}
            onChange={(e) => updateData({ cards: { cover: { marketLine: e.target.value } } })}
          />
        </Field>
      </Section>

      <Section title="카드 2 — 기업 & 실적">
        {cards.company.aboutRows.map((row, i) => (
          <div key={i} className="grid grid-cols-[110px_1fr] gap-2">
            <input
              type="text"
              className={inputClass}
              value={row.k}
              onChange={(e) => setListItem(['cards', 'company', 'aboutRows'], i, { ...row, k: e.target.value })}
            />
            <input
              type="text"
              className={inputClass}
              value={row.v}
              onChange={(e) => setListItem(['cards', 'company', 'aboutRows'], i, { ...row, v: e.target.value })}
            />
          </div>
        ))}
        <div className="rounded border border-gray-200 p-2">
          <p className="mb-2 text-xs font-medium text-gray-500">3개년 실적 (연도/매출/영업이익/순이익 — 적자는 △)</p>
          {cards.company.finRows.map((row, i) => (
            <div key={i} className="mb-2 grid grid-cols-4 gap-2">
              {(['year', 'revenue', 'op', 'net'] as const).map((field) => (
                <input
                  key={field}
                  type="text"
                  className={inputClass}
                  value={row[field]}
                  placeholder={{ year: '연도', revenue: '매출', op: '영업이익', net: '순이익' }[field]}
                  onChange={(e) =>
                    setListItem(['cards', 'company', 'finRows'], i, { ...row, [field]: e.target.value })
                  }
                />
              ))}
            </div>
          ))}
        </div>
        <Field label="실적 출처 표기">
          <input
            type="text"
            className={inputClass}
            value={cards.company.finNote}
            onChange={(e) => updateData({ cards: { company: { finNote: e.target.value } } })}
          />
        </Field>
      </Section>

      <Section title="카드 3 — 핵심 정보 타일">
        {(
          [
            ['price', '확정 공모가'],
            ['demand', '수요예측 경쟁률'],
            ['lockup', '의무보유확약'],
            ['deposit', '일반청약자 배정'],
          ] as const
        ).map(([key, label]) => (
          <div key={key} className="grid grid-cols-2 gap-2">
            <Field label={`${label} — 값`}>
              <input
                type="text"
                className={inputClass}
                value={cards.stats[key].value}
                onChange={(e) => updateData({ cards: { stats: { [key]: { ...cards.stats[key], value: e.target.value } } } })}
              />
            </Field>
            <Field label="부연">
              <input
                type="text"
                className={inputClass}
                value={cards.stats[key].sub}
                onChange={(e) => updateData({ cards: { stats: { [key]: { ...cards.stats[key], sub: e.target.value } } } })}
              />
            </Field>
          </div>
        ))}
      </Section>

      <Section title="카드 4 — 일정">
        {(
          [
            ['subscription', '청약'],
            ['refund', '환불/배정'],
            ['listing', '상장'],
          ] as const
        ).map(([key, label]) => (
          <div key={key} className="grid grid-cols-2 gap-2">
            <Field label={`${label} — 날짜`}>
              <input
                type="text"
                className={inputClass}
                value={cards.timeline[key].when}
                onChange={(e) =>
                  updateData({ cards: { timeline: { [key]: { ...cards.timeline[key], when: e.target.value } } } })
                }
              />
            </Field>
            <Field label="메모">
              <input
                type="text"
                className={inputClass}
                value={cards.timeline[key].note}
                onChange={(e) =>
                  updateData({ cards: { timeline: { [key]: { ...cards.timeline[key], note: e.target.value } } } })
                }
              />
            </Field>
          </div>
        ))}
        <Field label="청약 증권사">
          <input
            type="text"
            className={inputClass}
            value={cards.timeline.brokersLine}
            onChange={(e) => updateData({ cards: { timeline: { brokersLine: e.target.value } } })}
          />
        </Field>
      </Section>

      <Section title="카드 5 — 포인트 & 유의">
        <ListEditor
          label="👍 포인트"
          items={cards.points.plus}
          onItemChange={(i, v) => setListItem(['cards', 'points', 'plus'], i, v)}
          onAdd={() => addListItem(['cards', 'points', 'plus'], '')}
          onRemove={(i) => removeListItem(['cards', 'points', 'plus'], i)}
        />
        <ListEditor
          label="⚠️ 유의"
          items={cards.points.minus}
          onItemChange={(i, v) => setListItem(['cards', 'points', 'minus'], i, v)}
          onAdd={() => addListItem(['cards', 'points', 'minus'], '')}
          onRemove={(i) => removeListItem(['cards', 'points', 'minus'], i)}
        />
      </Section>

      <Section title="카드 6 — 마무리">
        <Field label="제목">
          <input
            type="text"
            className={inputClass}
            value={cards.outro.title}
            onChange={(e) => updateData({ cards: { outro: { title: e.target.value } } })}
          />
        </Field>
        <Field label="면책 문구">
          <textarea
            className={textareaClass}
            rows={3}
            value={cards.outro.disclaimer}
            onChange={(e) => updateData({ cards: { outro: { disclaimer: e.target.value } } })}
          />
        </Field>
      </Section>

      <Section title="블로그 본문">
        <Field label="글 제목">
          <input
            type="text"
            className={inputClass}
            value={body.postTitle}
            onChange={(e) => updateData({ body: { postTitle: e.target.value } })}
          />
        </Field>
        <Field label="인사말">
          <input
            type="text"
            className={inputClass}
            value={body.greeting}
            onChange={(e) => updateData({ body: { greeting: e.target.value } })}
          />
        </Field>
        <Field label="도입부 (**굵게** 표시 가능)">
          <textarea
            className={textareaClass}
            rows={3}
            value={body.intro}
            onChange={(e) => updateData({ body: { intro: e.target.value } })}
          />
        </Field>
        <ListEditor
          label="핵심 3줄 요약"
          items={body.summaryLines}
          onItemChange={(i, v) => setListItem(['body', 'summaryLines'], i, v)}
          onAdd={() => addListItem(['body', 'summaryLines'], '')}
          onRemove={(i) => removeListItem(['body', 'summaryLines'], i)}
        />
        <div className="rounded border border-gray-200 p-2">
          <p className="mb-2 text-xs font-medium text-gray-500">핵심 정보 인용구 (항목/값)</p>
          {body.infoRows.map((row, i) => (
            <div key={i} className="mb-2 flex items-start gap-2">
              <div className="grid flex-1 grid-cols-[130px_1fr] gap-2">
                <input
                  type="text"
                  className={inputClass}
                  value={row.k}
                  onChange={(e) => setListItem(['body', 'infoRows'], i, { ...row, k: e.target.value })}
                />
                <input
                  type="text"
                  className={inputClass}
                  value={row.v}
                  onChange={(e) => setListItem(['body', 'infoRows'], i, { ...row, v: e.target.value })}
                />
              </div>
              <button
                type="button"
                onClick={() => removeListItem(['body', 'infoRows'], i)}
                className="mt-1 flex-none text-xs text-gray-300 active:text-red-400"
                aria-label="항목 삭제"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => addListItem(['body', 'infoRows'], { k: '', v: '' })}
            className="text-xs text-green-700 underline"
          >
            + 항목 추가
          </button>
        </div>
        <ListEditor
          label="기업 설명 문단 (카드2 아래)"
          items={body.companyParagraphs}
          rows={4}
          onItemChange={(i, v) => setListItem(['body', 'companyParagraphs'], i, v)}
          onAdd={() => addListItem(['body', 'companyParagraphs'], '')}
          onRemove={(i) => removeListItem(['body', 'companyParagraphs'], i)}
        />
        <ListEditor
          label="청약 정보 문단 (카드3 아래)"
          items={body.scheduleParagraphs}
          rows={4}
          onItemChange={(i, v) => setListItem(['body', 'scheduleParagraphs'], i, v)}
          onAdd={() => addListItem(['body', 'scheduleParagraphs'], '')}
          onRemove={(i) => removeListItem(['body', 'scheduleParagraphs'], i)}
        />
        <ListEditor
          label="체크리스트"
          items={body.checklistLines}
          rows={1}
          onItemChange={(i, v) => setListItem(['body', 'checklistLines'], i, v)}
          onAdd={() => addListItem(['body', 'checklistLines'], '')}
          onRemove={(i) => removeListItem(['body', 'checklistLines'], i)}
        />
        <Field label="면책 문구 (본문용)">
          <textarea
            className={textareaClass}
            rows={3}
            value={body.disclaimer}
            onChange={(e) => updateData({ body: { disclaimer: e.target.value } })}
          />
        </Field>
        <Field label="해시태그">
          <input
            type="text"
            className={inputClass}
            value={body.hashtags}
            onChange={(e) => updateData({ body: { hashtags: e.target.value } })}
          />
        </Field>
      </Section>
    </div>
  )
}
