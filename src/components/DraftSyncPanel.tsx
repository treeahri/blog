import { useState } from 'react'
import type { ReviewDraft } from '../hooks/useReviewDraft'
import { loadDraftFromGitHub, saveDraftToGitHub } from '../lib/draftStorage'
import { loadGitHubSettings } from '../lib/github'

interface Props {
  draft: ReviewDraft
}

type Status = { kind: 'idle' } | { kind: 'busy'; message: string } | { kind: 'done'; message: string } | { kind: 'error'; message: string }

export function DraftSyncPanel({ draft }: Props) {
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const settings = loadGitHubSettings()

  async function handleSave() {
    if (!settings) return
    setStatus({ kind: 'busy', message: '저장 중…' })
    try {
      await saveDraftToGitHub(settings, { photos: draft.photos, form: draft.form })
      setStatus({ kind: 'done', message: '초안을 저장했어요. 다른 기기에서 "초안 불러오기"를 누르면 이어서 작업할 수 있어요.' })
    } catch (err) {
      setStatus({ kind: 'error', message: err instanceof Error ? err.message : '저장에 실패했어요.' })
    }
  }

  async function handleLoad() {
    if (!settings) return
    if (!window.confirm('지금 작성 중인 사진·글이 불러온 초안으로 덮어써져요. 계속할까요?')) return
    setStatus({ kind: 'busy', message: '불러오는 중…' })
    try {
      const snapshot = await loadDraftFromGitHub(settings)
      if (!snapshot) {
        setStatus({ kind: 'error', message: '저장된 초안이 없어요. 다른 기기에서 먼저 "초안 저장"을 눌러주세요.' })
        return
      }
      draft.loadSnapshot(snapshot)
      setStatus({ kind: 'done', message: '초안을 불러왔어요.' })
    } catch (err) {
      setStatus({ kind: 'error', message: err instanceof Error ? err.message : '불러오기에 실패했어요.' })
    }
  }

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3">
      <p className="mb-2 text-xs font-semibold text-blue-800">기기 간 초안 동기화</p>
      {!settings ? (
        <p className="text-xs text-gray-500">
          아래 "한 번에 복사"에서 GitHub 설정을 먼저 완료하면, 여기서 사진·글 초안을 다른 기기와 주고받을 수 있어요.
        </p>
      ) : (
        <>
          <p className="mb-2 text-xs text-gray-600">
            예: 모바일에서 작성 후 저장 → 데스크톱에서 불러와 이어서 복사/붙여넣기.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={status.kind === 'busy'}
              className="flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white active:bg-blue-700 disabled:opacity-50"
            >
              초안 저장
            </button>
            <button
              type="button"
              onClick={handleLoad}
              disabled={status.kind === 'busy'}
              className="flex-1 rounded-lg border border-blue-300 bg-white py-2.5 text-sm font-medium text-blue-700 active:bg-blue-50 disabled:opacity-50"
            >
              초안 불러오기
            </button>
          </div>
          {status.kind !== 'idle' && (
            <p className={`mt-2 text-xs ${status.kind === 'error' ? 'text-red-600' : 'text-gray-600'}`}>
              {status.message}
            </p>
          )}
        </>
      )}
    </div>
  )
}
