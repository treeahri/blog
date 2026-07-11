import { useState } from 'react'
import { loadGitHubSettings } from '../lib/github'
import { IpoForm } from './IpoForm'
import { IpoPreview } from './IpoPreview'
import { useIpoDraft } from './useIpoDraft'

type Tab = 'edit' | 'preview'

export function IpoMode() {
  const draft = useIpoDraft()
  const [tab, setTab] = useState<Tab>('edit')
  const [loadStatus, setLoadStatus] = useState<string | null>(null)

  async function handleLoadFromRepo() {
    const settings = loadGitHubSettings()
    if (!settings) {
      setLoadStatus('먼저 미리보기 탭 하단에서 GitHub 설정을 해주세요.')
      return
    }
    setLoadStatus('불러오는 중…')
    try {
      const result = await draft.loadFromRepo(settings)
      setLoadStatus(
        result === 'loaded'
          ? '저장소의 공모주 데이터를 불러왔어요.'
          : result === 'empty'
            ? '저장소에 준비된 데이터(ipo/current.json)가 없어요.'
            : null,
      )
    } catch (err) {
      setLoadStatus(err instanceof Error ? err.message : '불러오기에 실패했어요.')
    }
  }

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

  const { data } = draft

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

      <div className="mx-auto max-w-xl px-4 pt-4">
        <button
          type="button"
          onClick={handleLoadFromRepo}
          className="w-full rounded-lg border border-green-300 bg-white py-2.5 text-sm font-medium text-green-800 active:bg-green-50"
        >
          저장소에서 불러오기 (ipo/current.json)
        </button>
        {loadStatus && <p className="mt-2 text-xs text-gray-500">{loadStatus}</p>}

        {data.status === 'ready' && data.generatedAt && (
          <p className="mt-2 text-xs text-gray-400">
            {data.stock.name} · 데이터 기준{' '}
            {data.generatedAt.slice(0, 16).replace('T', ' ')} ({data.generatedBy})
            {data.sources.length > 0 && <> · 출처: {data.sources.map((s) => s.name).join(', ')}</>}
          </p>
        )}
        {data.notes.length > 0 && (
          <div className="mt-2 rounded border border-amber-300 bg-amber-50 p-2 text-xs text-amber-800">
            <p className="font-semibold">확인이 필요한 항목</p>
            <ul className="mt-1 list-disc pl-4">
              {data.notes.map((note, i) => (
                <li key={i}>{note}</li>
              ))}
            </ul>
          </div>
        )}
        {data.status === 'none' && (
          <p className="mt-2 rounded border border-gray-200 bg-white p-2 text-xs text-gray-500">
            {data.statusMessage}
          </p>
        )}
      </div>

      {tab === 'edit' ? (
        <main className="mx-auto max-w-xl px-4 py-5">
          <IpoForm draft={draft} />
        </main>
      ) : (
        <main className="py-5">
          <IpoPreview draft={draft} />
        </main>
      )}
    </>
  )
}
