import { useState } from 'react'
import { useReviewDraft } from '../hooks/useReviewDraft'
import { generateReviewContent } from '../lib/aiWrite'
import { ExportPanel } from './ExportPanel'
import { PhotoList } from './PhotoList'
import { PhotoUploader } from './PhotoUploader'
import { ReviewForm } from './ReviewForm'
import { TemplatePreview } from './TemplatePreview'

type Tab = 'edit' | 'preview'
type AiStatus = { kind: 'idle' } | { kind: 'busy' } | { kind: 'error'; message: string }

export function ReviewMode() {
  const draft = useReviewDraft()
  const [tab, setTab] = useState<Tab>('edit')
  const [aiStatus, setAiStatus] = useState<AiStatus>({ kind: 'idle' })

  function handleReset() {
    if (window.confirm('작성 중인 내용을 모두 지우고 새로 시작할까요?')) {
      draft.resetDraft()
      setTab('edit')
    }
  }

  async function handleAiWrite() {
    setAiStatus({ kind: 'busy' })
    try {
      const result = await generateReviewContent({ form: draft.form, photos: draft.photos })
      draft.updateForm({
        intro: result.intro,
        menuNote: result.menuNote,
        summary: result.summary,
        hashtags: result.hashtags,
      })
      for (const [id, caption] of Object.entries(result.captions)) {
        draft.setPhotoCaption(id, caption)
      }
      setAiStatus({ kind: 'idle' })
      setTab('preview')
    } catch (err) {
      setAiStatus({ kind: 'error', message: err instanceof Error ? err.message : 'AI 작성에 실패했어요.' })
    }
  }

  if (!draft.isHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-sm text-gray-400">
        불러오는 중...
      </div>
    )
  }

  return (
    <>
      <div className="border-b border-gray-200 bg-white">
        <div className="flex items-center justify-end px-4 pt-1">
          <button
            type="button"
            onClick={handleReset}
            className="text-xs text-gray-400 active:text-gray-600"
          >
            새로 작성
          </button>
        </div>
        <nav className="flex px-4">
          {(
            [
              ['edit', '입력'],
              ['preview', '미리보기'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
              className={`flex-1 border-b-2 py-2 text-sm font-medium ${
                tab === value
                  ? 'border-green-600 text-green-700'
                  : 'border-transparent text-gray-400'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      {tab === 'edit' ? (
        <main className="mx-auto max-w-xl px-4 py-5">
          <section className="mb-8">
            <h2 className="mb-3 text-sm font-semibold text-gray-700">1. 사진</h2>
            <PhotoUploader onFilesSelected={draft.addPhotos} />
            <div className="mt-3">
              <PhotoList
                photos={draft.photos}
                onReorder={draft.reorderPhotos}
                onRoleChange={draft.setPhotoRole}
                onCaptionChange={draft.setPhotoCaption}
                onRemove={draft.removePhoto}
              />
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-sm font-semibold text-gray-700">2. 후기 작성</h2>
            <ReviewForm form={draft.form} onChange={draft.updateForm} />

            <div className="mt-4 rounded-lg border border-purple-200 bg-purple-50/50 p-3">
              <button
                type="button"
                onClick={handleAiWrite}
                disabled={aiStatus.kind === 'busy'}
                className="w-full rounded-lg bg-purple-600 py-2.5 text-sm font-medium text-white active:bg-purple-700 disabled:opacity-50"
              >
                {aiStatus.kind === 'busy' ? 'AI가 다듬는 중… (몇 초 걸려요)' : 'AI 작성'}
              </button>
              <p className="mt-2 text-xs text-gray-500">
                위에 대충 적어둔 인트로·메뉴 설명·총평·해시태그·사진 캡션을 SEO에 맞게
                다듬어줘요. 로컬(`npm run dev`)에서 Claude Code CLI 로그인 상태로만 동작해요.
              </p>
              {aiStatus.kind === 'error' && (
                <p className="mt-2 text-xs text-red-600">{aiStatus.message}</p>
              )}
            </div>
          </section>
        </main>
      ) : (
        <main className="py-5">
          <TemplatePreview draft={draft} />
          <div className="mx-auto max-w-xl border-t border-gray-200" />
          <ExportPanel draft={draft} />
        </main>
      )}
    </>
  )
}
