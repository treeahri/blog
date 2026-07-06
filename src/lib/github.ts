/**
 * Uploads photos to the user's own public GitHub repo so they get public URLs
 * the Naver editor can fetch when rich HTML is pasted. The token is a
 * fine-grained PAT scoped to that one repo, kept only in this browser.
 */

export interface GitHubSettings {
  owner: string
  repo: string
  token: string
}

export interface UploadedPhoto {
  path: string
  sha: string
  url: string
}

export interface UploadBatch {
  folder: string
  files: UploadedPhoto[]
}

const SETTINGS_KEY = 'github-upload-settings'
const LAST_UPLOAD_KEY = 'github-last-upload'

export function loadGitHubSettings(): GitHubSettings | null {
  return readJson<GitHubSettings>(SETTINGS_KEY, (v) => Boolean(v.owner && v.repo && v.token))
}

export function saveGitHubSettings(settings: GitHubSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

export function clearGitHubSettings() {
  localStorage.removeItem(SETTINGS_KEY)
}

export function loadLastUpload(): UploadBatch | null {
  return readJson<UploadBatch>(LAST_UPLOAD_KEY, (v) => Array.isArray(v.files))
}

export function saveLastUpload(batch: UploadBatch) {
  localStorage.setItem(LAST_UPLOAD_KEY, JSON.stringify(batch))
}

export function clearLastUpload() {
  localStorage.removeItem(LAST_UPLOAD_KEY)
}

function readJson<T>(key: string, isValid: (value: T) => boolean): T | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const value = JSON.parse(raw) as T
    return isValid(value) ? value : null
  } catch {
    return null
  }
}

function apiUrl(settings: GitHubSettings, path: string): string {
  return `https://api.github.com/repos/${settings.owner}/${settings.repo}${path}`
}

function contentsUrl(settings: GitHubSettings, path: string): string {
  const encodedPath = path.split('/').map(encodeURIComponent).join('/')
  return apiUrl(settings, `/contents/${encodedPath}`)
}

function headers(settings: GitHubSettings): HeadersInit {
  return {
    Authorization: `Bearer ${settings.token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

async function errorMessage(res: Response): Promise<string> {
  const hint =
    res.status === 401
      ? ' — 토큰이 잘못됐거나 만료됐어요.'
      : res.status === 404
        ? ' — 아이디/저장소 이름을 확인하거나, 토큰에 해당 저장소 Contents 쓰기 권한이 있는지 확인하세요.'
        : ''
  return `GitHub 요청 실패 (${res.status})${hint}`
}

/** base64-encodes a unicode string (e.g. Korean text) the way GitHub's Contents API expects. */
function b64EncodeUnicode(text: string): string {
  return btoa(encodeURIComponent(text).replace(/%([0-9A-F]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16))))
}

function b64DecodeUnicode(base64: string): string {
  const binary = atob(base64.replace(/\n/g, ''))
  return decodeURIComponent(
    binary
      .split('')
      .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
      .join(''),
  )
}

async function readFileSha(settings: GitHubSettings, path: string): Promise<string | undefined> {
  const res = await fetch(contentsUrl(settings, path), { headers: headers(settings) })
  if (res.status === 404) return undefined
  if (!res.ok) throw new Error(await errorMessage(res))
  const json = await res.json()
  return json.sha
}

/** Reads a text file from the repo, or null if it doesn't exist yet. */
export async function readRepoFile(settings: GitHubSettings, path: string): Promise<string | null> {
  const res = await fetch(contentsUrl(settings, path), { headers: headers(settings) })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(await errorMessage(res))
  const json = await res.json()
  return b64DecodeUnicode(json.content)
}

/** Writes (creates or overwrites) a text file in the repo. */
export async function writeRepoFile(
  settings: GitHubSettings,
  path: string,
  content: string,
  message: string,
): Promise<void> {
  const sha = await readFileSha(settings, path)
  const res = await fetch(contentsUrl(settings, path), {
    method: 'PUT',
    headers: headers(settings),
    body: JSON.stringify({ message, content: b64EncodeUnicode(content), ...(sha ? { sha } : {}) }),
  })
  if (!res.ok) throw new Error(await errorMessage(res))
}

export async function uploadPhotoToGitHub(
  settings: GitHubSettings,
  path: string,
  base64Content: string,
): Promise<UploadedPhoto> {
  const res = await fetch(contentsUrl(settings, path), {
    method: 'PUT',
    headers: headers(settings),
    body: JSON.stringify({ message: `사진 업로드: ${path}`, content: base64Content }),
  })
  if (!res.ok) throw new Error(await errorMessage(res))
  const json = await res.json()
  return { path, sha: json.content.sha, url: json.content.download_url }
}

async function githubJson<T>(
  settings: GitHubSettings,
  path: string,
  init?: { method: string; body: unknown },
): Promise<T> {
  const res = await fetch(apiUrl(settings, path), {
    method: init?.method ?? 'GET',
    headers: headers(settings),
    body: init ? JSON.stringify(init.body) : undefined,
  })
  if (!res.ok) throw new Error(await errorMessage(res))
  return res.json() as Promise<T>
}

interface TreeEntry {
  path: string
  mode: string
  type: string
  sha: string
}

/**
 * Wipes every uploaded photo (and the synced draft) from the repo and rewrites
 * the branch to a single parentless commit of whatever is left (README and the
 * like). Photos live under posts/ and the draft snapshot under drafts/, so we
 * drop all blobs under either prefix regardless of which batch they came from
 * — tracking only the last upload stranded earlier ones forever.
 * A plain Contents-API delete would keep every photo browsable in the public
 * repo's history; resetting the history is what actually hides deleted photos
 * from visitors. (Orphaned objects may linger on GitHub's servers until garbage
 * collection, but nothing in the repo links to them anymore.)
 */
export async function clearUploadedPhotos(settings: GitHubSettings): Promise<void> {
  const repo = await githubJson<{ default_branch: string }>(settings, '')
  const branch = repo.default_branch
  const head = await githubJson<{ object: { sha: string } }>(settings, `/git/ref/heads/${branch}`)
  const headCommit = await githubJson<{ tree: { sha: string } }>(
    settings,
    `/git/commits/${head.object.sha}`,
  )
  const oldTree = await githubJson<{ truncated: boolean; tree: TreeEntry[] }>(
    settings,
    `/git/trees/${headCommit.tree.sha}?recursive=1`,
  )
  // A truncated listing would silently drop the missing files from the new
  // snapshot, so refuse rather than lose data (needs ~100k files to happen).
  if (oldTree.truncated) throw new Error('저장소에 파일이 너무 많아 자동 정리를 못 해요.')
  const remaining = oldTree.tree
    .filter(
      (entry) =>
        entry.type === 'blob' && !entry.path.startsWith('posts/') && !entry.path.startsWith('drafts/'),
    )
    .map(({ path, mode, type, sha }) => ({ path, mode, type, sha }))
  const newTree = await githubJson<{ sha: string }>(settings, '/git/trees', {
    method: 'POST',
    // The API rejects an empty tree, so keep a placeholder when nothing remains.
    body: {
      tree: remaining.length > 0
        ? remaining
        : [{ path: '.gitkeep', mode: '100644', type: 'blob', content: '' }],
    },
  })
  const newCommit = await githubJson<{ sha: string }>(settings, '/git/commits', {
    method: 'POST',
    body: { message: '사진 정리 (기록 초기화)', tree: newTree.sha, parents: [] },
  })
  await githubJson(settings, `/git/refs/heads/${branch}`, {
    method: 'PATCH',
    body: { sha: newCommit.sha, force: true },
  })
}
