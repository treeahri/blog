import { useRef, useState } from 'react'
import { GitHubSetupForm } from '../components/GitHubSetupForm'
import {
  clearGitHubSettings,
  clearUploadedPhotos,
  loadGitHubSettings,
  uploadPhotoToGitHub,
  type GitHubSettings,
} from '../lib/github'
import { blobToBase64, captureCardPng, downloadBlob } from '../lib/rasterize'
import { HotIssueCardDeck } from './cards/HotIssueCards'
import { buildHotIssueHtml, buildHotIssueText, copyTextToClipboard } from './export'
import { saveHotIssueDataToGitHub } from './hotIssueStorage'
import { HOT_ISSUE_SLIDE_TYPE_LABEL } from './types'
import type { HotIssueDraft } from './useHotIssueDraft'

interface Props {
  draft: HotIssueDraft
}

type Phase =
  | { step: 'idle' }
  | { step: 'rendering' }
  | { step: 'uploading'; done: number; total: number }
  | { step: 'downloading' }
  | { step: 'copied' }
  | { step: 'downloaded' }
  | { step: 'error'; message: string }

export function HotIssueExportPanel({ draft }: Props) {
  const { data } = draft
  const [settings, setSettings] = useState<GitHubSettings | null>(loadGitHubSettings)
  const [phase, setPhase] = useState<Phase>({ step: 'idle' })
  const [cleanupStatus, setCleanupStatus] = useState<string | null>(null)
  const [titleCopied, setTitleCopied] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [syncStatus, setSyncStatus] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [fallbackTextCopied, setFallbackTextCopied] = useState(false)
  const [copiedCardIndices, setCopiedCardIndices] = useState<ReadonlySet<number>>(new Set())
  const [fallbackStatus, setFallbackStatus] = useState<string | null>(null)
  const cardRefs = useRef(new Map<number, HTMLElement>())

  const slug = data.slug || 'hot-issue'
  const cardCount = data.slides.length
  const ready = cardCount > 0 && data.meta.topic.trim() !== ''

  /** Mounts the hidden deck, captures every slide, then unmounts. */
  async function captureCards(count: number): Promise<Blob[]> {
    setExporting(true)
    try {
      // Wait a frame so the freshly mounted deck has laid out.
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
      const blobs: Blob[] = []
      for (let i = 0; i < count; i++) {
        const el = cardRefs.current.get(i)
        if (!el) throw new Error(`카드 ${i + 1} 요소를 찾지 못했어요.`)
        blobs.push(await captureCardPng(el))
      }
      return blobs
    } finally {
      setExporting(false)
    }
  }

  /** Mounts the hidden deck, captures one slide, then unmounts. */
  async function captureSingleCard(index: number): Promise<Blob> {
    setExporting(true)
    try {
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
      const el = cardRefs.current.get(index)
      if (!el) throw new Error(`카드 ${index + 1} 요소를 찾지 못했어요.`)
      return await captureCardPng(el)
    } finally {
      setExporting(false)
    }
  }

  function handleCopyCard(index: number) {
    if (typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write) {
      setFallbackStatus('이 브라우저는 카드 복사를 지원하지 않아요. 대신 저장 버튼으로 받아 에디터에 끌어다 놓아주세요.')
      return
    }
    setFallbackStatus(null)
    // Passed as a promise (not awaited first) so the user-gesture window survives capture time (Safari requirement).
    const pngPromise = captureSingleCard(index)
    navigator.clipboard
      .write([new ClipboardItem({ 'image/png': pngPromise })])
      .then(() => setCopiedCardIndices((prev) => new Set(prev).add(index)))
      .catch((err: unknown) => {
        setFallbackStatus(err instanceof Error ? err.message : '복사에 실패했어요. 다시 시도해주세요.')
      })
  }

  async function handleDownloadSingleCard(index: number) {
    try {
      const blob = await captureSingleCard(index)
      downloadBlob(blob, `hot-issue_${slug}_card${index + 1}.png`)
    } catch (err) {
      setFallbackStatus(err instanceof Error ? err.message : '다운로드에 실패했어요. 다시 시도해주세요.')
    }
  }

  async function handleCopyFullText() {
    if (await copyTextToClipboard(buildHotIssueText(data))) {
      setFallbackTextCopied(true)
      setFallbackStatus('텍스트를 복사했어요. 네이버 에디터에 붙여넣은 뒤, 아래에서 카드를 하나씩 복사해 (📷 카드 N) 자리에 붙여넣으세요.')
    }
  }

  function handleOneShotCopy() {
    if (!settings || !ready) return
    if (typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write) {
      setPhase({ step: 'error', message: '이 브라우저는 한 번에 복사를 지원하지 않아요.' })
      return
    }
    setPhase({ step: 'rendering' })
    setCleanupStatus(null)

    const folder = `posts/hot-issue-${slug}-${timestamp()}`
    const htmlPromise = (async () => {
      const blobs = await captureCards(cardCount)
      const urlByCardIndex = new Map<number, string>()
      setPhase({ step: 'uploading', done: 0, total: blobs.length })
      // Sequential on purpose: parallel commits to the same branch conflict.
      for (const [i, blob] of blobs.entries()) {
        const path = `${folder}/hot-issue_${slug}_card${i + 1}.png`
        const uploaded = await uploadPhotoToGitHub(settings, path, await blobToBase64(blob))
        urlByCardIndex.set(i + 1, uploaded.url)
        setPhase({ step: 'uploading', done: i + 1, total: blobs.length })
      }
      return new Blob([buildHotIssueHtml(data, urlByCardIndex)], { type: 'text/html' })
    })()

    // clipboard.write is called synchronously with promise values so the
    // user-gesture window survives rendering+upload time (Safari requirement).
    navigator.clipboard
      .write([
        new ClipboardItem({
          'text/html': htmlPromise,
          'text/plain': new Blob([buildHotIssueText(data)], { type: 'text/plain' }),
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

  async function handleDownloadAll() {
    if (!ready) return
    try {
      setPhase({ step: 'rendering' })
      const blobs = await captureCards(cardCount)
      setPhase({ step: 'downloading' })
      // Spaced out — firing many downloads in the same tick makes some browsers
      // block everything after the first as a "multiple downloads" popup.
      for (const [i, blob] of blobs.entries()) {
        downloadBlob(blob, `hot-issue_${slug}_card${i + 1}.png`)
        if (i < blobs.length - 1) await new Promise((resolve) => setTimeout(resolve, 300))
      }
      setPhase({ step: 'downloaded' })
    } catch (err) {
      setPhase({
        step: 'error',
        message: err instanceof Error ? err.message : '다운로드에 실패했어요. 다시 시도해주세요.',
      })
    }
  }

  /** Overwrites hot-issue/current.json with the in-app draft (e.g. after attaching photos on mobile). */
  async function handleSaveDraft() {
    if (!settings) return
    setSyncing(true)
    setSyncStatus('저장 중…')
    try {
      await saveHotIssueDataToGitHub(settings, data)
      setSyncStatus('저장소에 초안을 저장했어요. 다른 기기에서 "저장소에서 불러오기"를 누르면 이어서 작업할 수 있어요.')
    } catch (err) {
      setSyncStatus(err instanceof Error ? err.message : '저장에 실패했어요.')
    } finally {
      setSyncing(false)
    }
  }

  async function handleCopyTitle() {
    if (await copyTextToClipboard(data.body.postTitle)) {
      setTitleCopied(true)
      setTimeout(() => setTitleCopied(false), 2000)
    }
  }

  async function handleCleanup() {
    if (!settings) return
    setCleanupStatus('삭제 중…')
    try {
      // 핫이슈 모드는 posts/hot-issue-* 업로드만 정리한다 — 맛집·공모주 사진은 그대로.
      await clearUploadedPhotos(settings, ['posts/hot-issue-'], { olderThanDays: 30 })
      setCleanupStatus('한 달 넘게 지난 핫이슈 카드를 정리했어요. (최근 한 달·다른 모드 데이터는 그대로예요)')
    } catch (err) {
      setCleanupStatus(err instanceof Error ? err.message : '삭제에 실패했어요. 다시 시도해주세요.')
    }
  }

  async function handleWipeHotIssueData() {
    if (!settings) return
    if (
      !window.confirm(
        '핫이슈 카드와 hot-issue/ 데이터를 저장소 기록까지 완전히 삭제할까요? 되돌릴 수 없어요.',
      )
    ) {
      return
    }
    setCleanupStatus('삭제 중…')
    try {
      await clearUploadedPhotos(settings, ['posts/hot-issue-', 'hot-issue/'])
      setCleanupStatus('핫이슈 카드와 hot-issue/ 데이터를 기록까지 모두 삭제했어요.')
    } catch (err) {
      setCleanupStatus(err instanceof Error ? err.message : '삭제에 실패했어요. 다시 시도해주세요.')
    }
  }

  function handleResetSettings() {
    clearGitHubSettings()
    setSettings(null)
    setPhase({ step: 'idle' })
  }

  const busy = phase.step === 'rendering' || phase.step === 'uploading' || phase.step === 'downloading'

  return (
    <div className="mx-auto max-w-xl px-4">
      {settings && (
        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50/50 p-3">
          <p className="mb-2 text-xs font-semibold text-blue-800">기기 간 초안 동기화</p>
          <p className="mb-2 text-xs text-gray-600">
            예: 모바일에서 사진 첨부 후 저장 → 데스크톱에서 불러와 이어서 발행.
          </p>
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={syncing}
            className="w-full rounded-lg border border-blue-300 bg-white py-2.5 text-sm font-medium text-blue-700 active:bg-blue-50 disabled:opacity-50"
          >
            {syncing ? '저장 중…' : '초안 저장 (저장소에 덮어쓰기)'}
          </button>
          {syncStatus && <p className="mt-2 text-xs text-gray-500">{syncStatus}</p>}
        </div>
      )}

      <div className="rounded-lg border border-sky-200 bg-sky-50/50 p-3">
        <p className="mb-2 text-xs font-semibold text-sky-800">블로그 발행 (텍스트+카드 {cardCount}장)</p>

        {!settings ? (
          <GitHubSetupForm onSave={(s) => setSettings(s)} />
        ) : (
          <>
            <button
              type="button"
              onClick={handleOneShotCopy}
              disabled={busy || !ready}
              className="w-full rounded-lg bg-sky-600 py-3 text-sm font-medium text-white active:bg-sky-700 disabled:opacity-50"
            >
              {phase.step === 'rendering'
                ? '카드 이미지 만드는 중…'
                : phase.step === 'uploading'
                  ? `카드 업로드 중… (${phase.done}/${phase.total})`
                  : phase.step === 'copied'
                    ? '복사 완료 ✓ (다시 복사)'
                    : '한 번에 복사'}
            </button>

            <button
              type="button"
              onClick={handleCopyTitle}
              disabled={!ready}
              className="mt-2 w-full rounded border border-sky-300 py-2 text-xs text-sky-800 active:bg-sky-100 disabled:opacity-50"
            >
              {titleCopied ? '제목 복사됨 ✓' : '글 제목만 복사'}
            </button>

            {phase.step === 'copied' && (
              <p className="mt-2 text-xs text-gray-600">
                네이버 에디터에 붙여넣으면 글과 카드가 순서대로 들어가요. 제목은 위의 "글 제목만
                복사"로 따로 붙여넣으세요. 발행을 마친 뒤 아래 버튼으로 업로드한 카드를 정리하세요.
              </p>
            )}
            {phase.step === 'error' && <p className="mt-2 text-xs text-red-600">{phase.message}</p>}

            <button
              type="button"
              onClick={handleCleanup}
              className="mt-2 w-full rounded border border-gray-300 py-2 text-xs text-gray-600 active:bg-gray-50"
            >
              한 달 지난 핫이슈 카드 정리 (발행 후에!)
            </button>
            <button
              type="button"
              onClick={handleWipeHotIssueData}
              className="mt-2 w-full rounded border border-red-200 py-2 text-xs text-red-500 active:bg-red-50"
            >
              핫이슈 데이터(JSON)까지 완전 삭제
            </button>
            {cleanupStatus && <p className="mt-2 text-xs text-gray-500">{cleanupStatus}</p>}

            <button type="button" onClick={handleResetSettings} className="mt-2 text-xs text-gray-400 underline">
              GitHub 설정 다시 하기
            </button>
          </>
        )}
      </div>

      <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50/50 p-3">
        <p className="mb-2 text-xs font-semibold text-amber-800">인스타그램용 (카드 {cardCount}장)</p>
        <button
          type="button"
          onClick={handleDownloadAll}
          disabled={busy || !ready}
          className="w-full rounded-lg border border-amber-400 bg-white py-3 text-sm font-medium text-amber-800 active:bg-amber-100 disabled:opacity-50"
        >
          {phase.step === 'downloading'
            ? '다운로드 중…'
            : phase.step === 'downloaded'
              ? '다운로드 완료 ✓ (다시 받기)'
              : `전체 이미지 ${cardCount}장 다운로드`}
        </button>
      </div>

      <details className="mt-4">
        <summary className="cursor-pointer text-xs font-medium text-gray-500">
          예비 방식: 텍스트 따로, 카드 하나씩 복사
        </summary>

        <ol className="my-3 list-decimal space-y-1 pl-5 text-xs text-gray-500">
          <li>아래 버튼으로 글 전체 텍스트를 복사해 네이버 에디터에 붙여넣기</li>
          <li>에디터에서 「(📷 카드 N …)」 줄을 지우고 그 자리를 클릭</li>
          <li>여기서 해당 번호의 카드를 복사한 뒤 에디터에 붙여넣기(⌘V) — 카드 수만큼 반복</li>
        </ol>

        <button
          type="button"
          onClick={handleCopyFullText}
          disabled={!ready}
          className="w-full rounded-lg bg-sky-600 py-3 text-sm font-medium text-white active:bg-sky-700 disabled:opacity-50"
        >
          {fallbackTextCopied ? '텍스트 복사됨 ✓ (다시 복사)' : '1단계 · 전체 텍스트 복사'}
        </button>

        {fallbackStatus && <p className="mt-3 text-xs text-gray-600">{fallbackStatus}</p>}

        {cardCount > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-xs font-medium text-gray-500">2단계 · 카드 하나씩 복사해 붙여넣기</p>
            <div className="flex flex-col gap-2">
              {data.slides.map((slide, i) => {
                const copied = copiedCardIndices.has(i)
                return (
                  <div key={slide.id} className="flex items-center gap-3 rounded border border-gray-200 p-2">
                    <span className="flex-1 truncate text-sm text-gray-600">
                      카드 {i + 1} — {HOT_ISSUE_SLIDE_TYPE_LABEL[slide.type]}
                      {copied && <span className="ml-1 text-green-600">✓</span>}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyCard(i)}
                      className={`rounded px-3 py-1.5 text-xs font-medium ${
                        copied
                          ? 'bg-green-50 text-green-700 active:bg-green-100'
                          : 'bg-sky-600 text-white active:bg-sky-700'
                      }`}
                    >
                      {copied ? '다시 복사' : '복사'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadSingleCard(i)}
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

      {/* Hidden full-size deck for rasterization — mounted only while exporting
          so the DOM stays light; fixed off-screen, never transformed. */}
      {exporting && (
        <div style={{ position: 'fixed', left: -20000, top: 0, zIndex: -1 }} aria-hidden>
          <HotIssueCardDeck
            data={data}
            onCardRef={(i, el) => {
              if (el) cardRefs.current.set(i, el)
              else cardRefs.current.delete(i)
            }}
          />
        </div>
      )}
    </div>
  )
}

function timestamp(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
}
