import { useState } from 'react'
import { ExportPanel } from './components/ExportPanel'
import { PhotoList } from './components/PhotoList'
import { PhotoUploader } from './components/PhotoUploader'
import { ReviewForm } from './components/ReviewForm'
import { TemplatePreview } from './components/TemplatePreview'
import { useReviewDraft } from './hooks/useReviewDraft'

type Tab = 'edit' | 'preview'

function App() {
  const draft = useReviewDraft()
  const [tab, setTab] = useState<Tab>('edit')

  function handleReset() {
    if (window.confirm('작성 중인 내용을 모두 지우고 새로 시작할까요?')) {
      draft.resetDraft()
      setTab('edit')
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
    <div className="min-h-screen bg-gray-50 pb-16">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between px-4 pt-3">
          <h1 className="text-base font-semibold">맛집 후기 템플릿 도구</h1>
          <button
            type="button"
            onClick={handleReset}
            className="text-xs text-gray-400 active:text-gray-600"
          >
            새로 작성
          </button>
        </div>
        <nav className="mt-2 flex px-4">
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
      </header>

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
          </section>
        </main>
      ) : (
        <main className="py-5">
          <TemplatePreview draft={draft} />
          <div className="mx-auto max-w-xl border-t border-gray-200" />
          <ExportPanel draft={draft} />
        </main>
      )}
    </div>
  )
}

export default App
