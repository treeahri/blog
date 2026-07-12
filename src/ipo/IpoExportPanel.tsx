import { useRef, useState } from 'react'
import { GitHubSetupForm } from '../components/GitHubSetupForm'
import {
  clearGitHubSettings,
  clearUploadedPhotos,
  loadGitHubSettings,
  uploadPhotoToGitHub,
  type GitHubSettings,
} from '../lib/github'
import { IpoCardDeck } from './cards/IpoCards'
import { buildIpoHtml, buildIpoText, copyTextToClipboard } from './export'
import { blobToBase64, captureCardPng, downloadBlob } from './rasterize'
import type { IpoDraft } from './useIpoDraft'

interface Props {
  draft: IpoDraft
}

type Phase =
  | { step: 'idle' }
  | { step: 'rendering' }
  | { step: 'uploading'; done: number; total: number }
  | { step: 'downloading' }
  | { step: 'copied' }
  | { step: 'downloaded' }
  | { step: 'error'; message: string }

/** Blog post now embeds all six cards, same deck the Instagram download uses. */
const BLOG_CARD_COUNT = 6

export function IpoExportPanel({ draft }: Props) {
  const { data } = draft
  const [settings, setSettings] = useState<GitHubSettings | null>(loadGitHubSettings)
  const [phase, setPhase] = useState<Phase>({ step: 'idle' })
  const [cleanupStatus, setCleanupStatus] = useState<string | null>(null)
  const [titleCopied, setTitleCopied] = useState(false)
  const [exporting, setExporting] = useState(false)
  const cardRefs = useRef(new Map<number, HTMLElement>())

  const slug = data.slug || 'ipo'
  const ready = data.status === 'ready' && data.stock.name.trim() !== ''

  /** Mounts the hidden deck, captures the first `count` cards, then unmounts. */
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

  function handleOneShotCopy() {
    if (!settings || !ready) return
    if (typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write) {
      setPhase({ step: 'error', message: '이 브라우저는 한 번에 복사를 지원하지 않아요.' })
      return
    }
    setPhase({ step: 'rendering' })
    setCleanupStatus(null)

    const folder = `posts/ipo-${slug}-${timestamp()}`
    const htmlPromise = (async () => {
      const blobs = await captureCards(BLOG_CARD_COUNT)
      const urlByCardIndex = new Map<number, string>()
      setPhase({ step: 'uploading', done: 0, total: blobs.length })
      // Sequential on purpose: parallel commits to the same branch conflict.
      for (const [i, blob] of blobs.entries()) {
        const path = `${folder}/ipo_${slug}_card${i + 1}.png`
        const uploaded = await uploadPhotoToGitHub(settings, path, await blobToBase64(blob))
        urlByCardIndex.set(i + 1, uploaded.url)
        setPhase({ step: 'uploading', done: i + 1, total: blobs.length })
      }
      return new Blob([buildIpoHtml(data, urlByCardIndex)], { type: 'text/html' })
    })()

    // clipboard.write is called synchronously with promise values so the
    // user-gesture window survives rendering+upload time (Safari requirement).
    navigator.clipboard
      .write([
        new ClipboardItem({
          'text/html': htmlPromise,
          'text/plain': new Blob([buildIpoText(data)], { type: 'text/plain' }),
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
      const blobs = await captureCards(6)
      setPhase({ step: 'downloading' })
      // Spaced out — firing 6 downloads in the same tick makes some browsers
      // block everything after the first as a "multiple downloads" popup.
      for (const [i, blob] of blobs.entries()) {
        downloadBlob(blob, `ipo_${slug}_card${i + 1}.png`)
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
      // IPO mode only clears its own card uploads — 맛집 사진은 건드리지 않는다.
      // 한 달 이내 업로드는 남겨둔다 (네이버 웹 에디터가 원본 URL을 계속 참조할
      // 수 있어 너무 일찍 지우면 이미 발행한 글의 카드 이미지가 깨질 수 있다).
      await clearUploadedPhotos(settings, ['posts/ipo-'], { olderThanDays: 30 })
      setCleanupStatus('한 달 넘게 지난 공모주 카드를 정리했어요. (최근 한 달·맛집 사진·ipo/ 데이터는 그대로예요)')
    } catch (err) {
      setCleanupStatus(err instanceof Error ? err.message : '삭제에 실패했어요. 다시 시도해주세요.')
    }
  }

  async function handleWipeIpoData() {
    if (!settings) return
    if (
      !window.confirm(
        '공모주 카드와 ipo/ 데이터(current.json·아카이브 전체)를 저장소 기록까지 완전히 삭제할까요? 되돌릴 수 없어요.',
      )
    ) {
      return
    }
    setCleanupStatus('삭제 중…')
    try {
      await clearUploadedPhotos(settings, ['posts/ipo-', 'ipo/'])
      setCleanupStatus('공모주 카드와 ipo/ 데이터를 기록까지 모두 삭제했어요.')
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
      <div className="rounded-lg border border-green-200 bg-green-50/50 p-3">
        <p className="mb-2 text-xs font-semibold text-green-800">블로그 발행 (텍스트+카드 6장)</p>

        {!settings ? (
          <GitHubSetupForm onSave={(s) => setSettings(s)} />
        ) : (
          <>
            <button
              type="button"
              onClick={handleOneShotCopy}
              disabled={busy || !ready}
              className="w-full rounded-lg bg-green-600 py-3 text-sm font-medium text-white active:bg-green-700 disabled:opacity-50"
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
              className="mt-2 w-full rounded border border-green-300 py-2 text-xs text-green-800 active:bg-green-100 disabled:opacity-50"
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
              한 달 지난 공모주 카드 정리 (발행 후에!)
            </button>
            <button
              type="button"
              onClick={handleWipeIpoData}
              className="mt-2 w-full rounded border border-red-200 py-2 text-xs text-red-500 active:bg-red-50"
            >
              공모주 데이터(JSON)까지 완전 삭제
            </button>
            {cleanupStatus && <p className="mt-2 text-xs text-gray-500">{cleanupStatus}</p>}

            <button type="button" onClick={handleResetSettings} className="mt-2 text-xs text-gray-400 underline">
              GitHub 설정 다시 하기
            </button>
          </>
        )}
      </div>

      <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50/50 p-3">
        <p className="mb-2 text-xs font-semibold text-amber-800">인스타그램용 (카드 6장)</p>
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
              : '전체 이미지 6장 다운로드'}
        </button>
      </div>

      {/* Hidden full-size deck for rasterization — mounted only while exporting
          so the DOM stays light; fixed off-screen, never transformed. */}
      {exporting && (
        <div style={{ position: 'fixed', left: -20000, top: 0, zIndex: -1 }} aria-hidden>
          <IpoCardDeck data={data} onCardRef={(i, el) => {
            if (el) cardRefs.current.set(i, el)
            else cardRefs.current.delete(i)
          }} />
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
