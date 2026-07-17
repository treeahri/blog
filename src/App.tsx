import { useState } from 'react'
import { ReviewMode } from './components/ReviewMode'
import { HotIssueMode } from './hot-issue/HotIssueMode'
import { IpoMode } from './ipo/IpoMode'

type Mode = 'review' | 'ipo' | 'hot-issue'

const MODE_KEY = 'app-mode'

function loadMode(): Mode {
  const stored = localStorage.getItem(MODE_KEY)
  return stored === 'ipo' || stored === 'hot-issue' ? stored : 'review'
}

const MODE_TITLE: Record<Mode, string> = {
  review: '맛집 후기 템플릿 도구',
  ipo: '공모주 템플릿 도구',
  'hot-issue': '핫이슈 템플릿 도구',
}

function App() {
  const [mode, setMode] = useState<Mode>(loadMode)

  function switchMode(next: Mode) {
    setMode(next)
    localStorage.setItem(MODE_KEY, next)
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-base font-semibold">{MODE_TITLE[mode]}</h1>
          <div className="flex rounded-full border border-gray-200 p-0.5 text-xs">
            {(
              [
                ['review', '맛집'],
                ['ipo', '공모주'],
                ['hot-issue', '핫이슈'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => switchMode(value)}
                className={`rounded-full px-3 py-1 font-medium ${
                  mode === value ? 'bg-green-600 text-white' : 'text-gray-400'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* keyed mount so only the active mode's draft hook hydrates */}
      {mode === 'review' ? (
        <ReviewMode key="review" />
      ) : mode === 'ipo' ? (
        <IpoMode key="ipo" />
      ) : (
        <HotIssueMode key="hot-issue" />
      )}
    </div>
  )
}

export default App
