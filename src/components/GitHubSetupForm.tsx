import { useState } from 'react'
import { saveGitHubSettings, type GitHubSettings } from '../lib/github'

export function GitHubSetupForm({ onSave }: { onSave: (settings: GitHubSettings) => void }) {
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
