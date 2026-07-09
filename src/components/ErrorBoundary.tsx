import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

/**
 * Without this, any render-time crash unmounts the whole tree and the user
 * just sees a white page with no way to tell us what went wrong.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="mx-auto max-w-xl p-6">
        <h1 className="mb-2 text-lg font-bold text-red-700">앗, 화면을 그리다가 오류가 났어요</h1>
        <p className="mb-4 text-sm text-gray-600">
          아래 내용을 복사해서 개발자에게 전달해 주세요. 새로고침하면 작성 중이던 내용은 유지돼요.
        </p>
        <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg bg-gray-100 p-3 text-xs text-gray-800">
          {this.state.error.message}
          {'\n\n'}
          {this.state.error.stack}
        </pre>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-4 w-full rounded-lg bg-gray-800 py-2.5 text-sm font-medium text-white"
        >
          새로고침
        </button>
      </div>
    )
  }
}
