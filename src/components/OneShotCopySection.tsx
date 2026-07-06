import { useState } from 'react'
import type { ReviewDraft } from '../hooks/useReviewDraft'
import { buildReviewHtml, buildReviewText, orderedPhotosForExport } from '../lib/export'
import {
  clearGitHubSettings,
  clearLastUpload,
  clearUploadedPhotos,
  loadGitHubSettings,
  loadLastUpload,
  saveGitHubSettings,
  saveLastUpload,
  uploadPhotoToGitHub,
  type GitHubSettings,
  type UploadBatch,
} from '../lib/github'

interface Props {
  draft: ReviewDraft
}

type Phase =
  | { step: 'idle' }
  | { step: 'uploading'; done: number; total: number }
  | { step: 'copied' }
  | { step: 'error'; message: string }

export function OneShotCopySection({ draft }: Props) {
  const [settings, setSettings] = useState<GitHubSettings | null>(loadGitHubSettings)
  const [, setLastUpload] = useState<UploadBatch | null>(loadLastUpload)
  const [phase, setPhase] = useState<Phase>({ step: 'idle' })
  const [cleanupStatus, setCleanupStatus] = useState<string | null>(null)
  const exportPhotos = orderedPhotosForExport(draft)

  function handleOneShotCopy() {
    if (!settings) return
    if (typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write) {
      setPhase({ step: 'error', message: '이 브라우저는 한 번에 복사를 지원하지 않아요. 아래 예비 방식을 이용해주세요.' })
      return
    }
    const total = exportPhotos.length
    setPhase({ step: 'uploading', done: 0, total })
    setCleanupStatus(null)

    const folder = `posts/${uploadFolderName()}`
    const htmlPromise = (async () => {
      const batch: UploadBatch = { folder, files: [] }
      const urlByPhotoId = new Map<string, string>()
      // Sequential on purpose: parallel commits to the same branch conflict.
      for (const [i, { photo }] of exportPhotos.entries()) {
        const path = `${folder}/${String(i + 1).padStart(2, '0')}.jpg`
        const uploaded = await uploadPhotoToGitHub(settings, path, photo.dataUrl.split(',')[1])
        batch.files.push(uploaded)
        urlByPhotoId.set(photo.id, uploaded.url)
        setPhase({ step: 'uploading', done: i + 1, total })
      }
      saveLastUpload(batch)
      setLastUpload(batch)
      return new Blob([buildReviewHtml(draft, urlByPhotoId)], { type: 'text/html' })
    })()

    // clipboard.write is called synchronously with promise values so the
    // user-gesture window survives the upload time (Safari requirement).
    navigator.clipboard
      .write([
        new ClipboardItem({
          'text/html': htmlPromise,
          'text/plain': new Blob([buildReviewText(draft)], { type: 'text/plain' }),
        }),
      ])
      .then(() => setPhase({ step: 'copied' }))
      .catch((err: unknown) => {
        setPhase({
          step: 'error',
          message: err instanceof Error ? err.message : '복사에 실패했어요. 다시 시도해주세요.',
        })
      })
  }

  async function handleCleanup() {
    if (!settings) return
    setCleanupStatus('삭제 중…')
    try {
      await clearUploadedPhotos(settings)
      clearLastUpload()
      setLastUpload(null)
      setCleanupStatus('저장소의 사진과 동기화된 초안을 모두 삭제하고, 과거 기록도 함께 정리했어요.')
    } catch (err) {
      setCleanupStatus(err instanceof Error ? err.message : '삭제에 실패했어요. 다시 시도해주세요.')
    }
  }

  function handleResetSettings() {
    clearGitHubSettings()
    setSettings(null)
    setPhase({ step: 'idle' })
  }

  return (
    <div className="rounded-lg border border-green-200 bg-green-50/50 p-3">
      <p className="mb-2 text-xs font-semibold text-green-800">한 번에 복사 (텍스트+사진)</p>

      {!settings ? (
        <SetupForm onSave={(s) => setSettings(s)} />
      ) : (
        <>
          <button
            type="button"
            onClick={handleOneShotCopy}
            disabled={phase.step === 'uploading' || exportPhotos.length === 0}
            className="w-full rounded-lg bg-green-600 py-3 text-sm font-medium text-white active:bg-green-700 disabled:opacity-50"
          >
            {phase.step === 'uploading'
              ? `사진 업로드 중… (${phase.done}/${phase.total})`
              : phase.step === 'copied'
                ? '복사 완료 ✓ (다시 복사)'
                : '한 번에 복사'}
          </button>

          {phase.step === 'copied' && (
            <p className="mt-2 text-xs text-gray-600">
              네이버 에디터에 붙여넣으면 글과 사진이 순서대로 들어가요. 인용구(정보·총평) 모양을
              바꾸고 싶으면 에디터에서 인용구를 클릭해 원하는 스타일을 고르세요. 사진 확인하고
              임시저장/발행까지 마친 뒤, 아래 버튼으로 업로드한 사진을 정리하세요.
            </p>
          )}
          {phase.step === 'error' && <p className="mt-2 text-xs text-red-600">{phase.message}</p>}

          <button
            type="button"
            onClick={handleCleanup}
            className="mt-2 w-full rounded border border-gray-300 py-2 text-xs text-gray-600 active:bg-gray-50"
          >
            저장소 사진 전체 정리 (발행 후에!)
          </button>
          {cleanupStatus && <p className="mt-2 text-xs text-gray-500">{cleanupStatus}</p>}

          <button type="button" onClick={handleResetSettings} className="mt-2 text-xs text-gray-400 underline">
            GitHub 설정 다시 하기
          </button>
        </>
      )}
    </div>
  )
}

function uploadFolderName(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
}

function SetupForm({ onSave }: { onSave: (settings: GitHubSettings) => void }) {
  const [owner, setOwner] = useState('')
  const [repo, setRepo] = useState('blog-image')
  const [token, setToken] = useState('')
  const canSave = owner.trim() !== '' && repo.trim() !== '' && token.trim() !== ''

  function handleSave() {
    const settings = { owner: owner.trim(), repo: repo.trim(), token: token.trim() }
    saveGitHubSettings(settings)
    onSave(settings)
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-gray-600">
        사진은 붙여넣기 전까지 본인 GitHub의 공개 저장소(<b>본인아이디/blog-image</b>)에 잠시
        올라가요. 아래에 본인 아이디·저장소·토큰을 넣어주세요.
      </p>
      <ol className="list-decimal pl-4 text-xs text-gray-500">
        <li>
          <a
            href="https://github.com/settings/personal-access-tokens/new"
            target="_blank"
            rel="noreferrer"
            className="text-green-700 underline"
          >
            GitHub 토큰 발급 페이지
          </a>
          에서 Repository access → Only select repositories → <b>blog-image</b> 선택
        </li>
        <li>Permissions → Contents → Read and write로 발급</li>
        <li>발급된 토큰(github_pat_…)을 아래에 붙여넣기 — 이 브라우저에만 저장돼요</li>
      </ol>
      <input
        value={owner}
        onChange={(e) => setOwner(e.target.value)}
        placeholder="GitHub 아이디"
        className="rounded border border-gray-300 px-2 py-1.5 text-sm"
      />
      <input
        value={repo}
        onChange={(e) => setRepo(e.target.value)}
        placeholder="저장소 이름"
        className="rounded border border-gray-300 px-2 py-1.5 text-sm"
      />
      <input
        value={token}
        onChange={(e) => setToken(e.target.value)}
        type="password"
        placeholder="토큰 (github_pat_…)"
        className="rounded border border-gray-300 px-2 py-1.5 text-sm"
      />
      <button
        type="button"
        onClick={handleSave}
        disabled={!canSave}
        className="rounded bg-green-600 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        저장
      </button>
    </div>
  )
}
