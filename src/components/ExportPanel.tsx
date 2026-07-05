import { useState } from 'react'
import type { ReviewDraft } from '../hooks/useReviewDraft'
import {
  buildReviewText,
  copyPhotoToClipboard,
  copyTextToClipboard,
  downloadPhoto,
  orderedPhotosForExport,
} from '../lib/export'
import { PHOTO_ROLE_LABEL } from '../types'
import { OneShotCopySection } from './OneShotCopySection'
import { PhotoImg } from './PhotoImg'

interface Props {
  draft: ReviewDraft
}

export function ExportPanel({ draft }: Props) {
  const [status, setStatus] = useState<string | null>(null)
  const [textCopied, setTextCopied] = useState(false)
  const [copiedPhotoIds, setCopiedPhotoIds] = useState<ReadonlySet<string>>(new Set())
  const exportPhotos = orderedPhotosForExport(draft)
  const text = buildReviewText(draft)

  async function handleCopyText() {
    const ok = await copyTextToClipboard(text)
    setTextCopied(ok)
    setStatus(
      ok
        ? '텍스트를 복사했어요. 네이버 에디터에 붙여넣은 뒤, 아래에서 사진을 하나씩 복사해 (📷 사진 N) 자리에 붙여넣으세요.'
        : '복사에 실패했어요. 아래 미리보기 텍스트를 직접 선택해 복사해주세요.',
    )
  }

  async function handleCopyPhoto(photoId: string) {
    const exportPhoto = exportPhotos.find(({ photo }) => photo.id === photoId)
    if (!exportPhoto) return
    const ok = await copyPhotoToClipboard(exportPhoto.photo)
    if (ok) {
      setCopiedPhotoIds((prev) => new Set(prev).add(photoId))
      setStatus(null)
    } else {
      setStatus('이 브라우저는 사진 복사를 지원하지 않아요. 대신 저장 버튼으로 내려받아 에디터에 끌어다 놓아주세요.')
    }
  }

  return (
    <section className="mx-auto max-w-xl px-4 py-6">
      <h2 className="mb-3 text-sm font-semibold text-gray-700">네이버 블로그에 옮기기</h2>

      <OneShotCopySection draft={draft} />

      <details className="mt-4">
        <summary className="cursor-pointer text-xs font-medium text-gray-500">
          예비 방식: 텍스트 따로, 사진 하나씩 복사
        </summary>

        <ol className="my-3 list-decimal space-y-1 pl-5 text-xs text-gray-500">
          <li>아래 버튼으로 글 전체 텍스트를 복사해 네이버 에디터에 붙여넣기</li>
          <li>에디터에서 「(📷 사진 N …)」 줄을 지우고 그 자리를 클릭</li>
          <li>여기서 해당 번호의 사진을 복사한 뒤 에디터에 붙여넣기(⌘V) — 사진 수만큼 반복</li>
        </ol>

        <button
        type="button"
        onClick={handleCopyText}
        className="w-full rounded-lg bg-green-600 py-3 text-sm font-medium text-white active:bg-green-700"
      >
        {textCopied ? '텍스트 복사됨 ✓ (다시 복사)' : '1단계 · 전체 텍스트 복사'}
      </button>

      {status && <p className="mt-3 text-sm text-gray-600">{status}</p>}

      {exportPhotos.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 text-xs font-medium text-gray-500">2단계 · 사진 하나씩 복사해 붙여넣기</p>
          <div className="flex flex-col gap-2">
            {exportPhotos.map(({ photo, filename }, i) => {
              const copied = copiedPhotoIds.has(photo.id)
              return (
                <div key={photo.id} className="flex items-center gap-3 rounded border border-gray-200 p-2">
                  <PhotoImg dataUrl={photo.dataUrl} className="h-12 w-12 rounded object-cover" />
                  <span className="flex-1 truncate text-sm text-gray-600">
                    사진 {i + 1} · {PHOTO_ROLE_LABEL[photo.role]}
                    {copied && <span className="ml-1 text-green-600">✓</span>}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyPhoto(photo.id)}
                    className={`rounded px-3 py-1.5 text-xs font-medium ${
                      copied
                        ? 'bg-green-50 text-green-700 active:bg-green-100'
                        : 'bg-green-600 text-white active:bg-green-700'
                    }`}
                  >
                    {copied ? '다시 복사' : '복사'}
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadPhoto({ photo, filename })}
                    className="rounded bg-gray-100 px-3 py-1.5 text-xs text-gray-700 active:bg-gray-200"
                  >
                    저장
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}
      </details>

      <details className="mt-5">
        <summary className="cursor-pointer text-xs text-gray-400">복사될 텍스트 미리보기</summary>
        <pre className="mt-2 whitespace-pre-wrap rounded bg-gray-50 p-3 text-xs text-gray-600">{text}</pre>
      </details>
    </section>
  )
}
