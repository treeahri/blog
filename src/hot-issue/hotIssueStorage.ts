import { del, get, set } from 'idb-keyval'
import { readRepoFile, type GitHubSettings } from '../lib/github'
import { normalizeHotIssueData, type HotIssueData } from './types'

const DRAFT_KEY = 'hot-issue-draft-v1'
const DATA_PATH = 'hot-issue/current.json'

export async function loadHotIssueDraft(): Promise<HotIssueData | undefined> {
  const persisted = await get(DRAFT_KEY)
  if (!persisted) return undefined
  return normalizeHotIssueData(persisted)
}

export async function saveHotIssueDraft(data: HotIssueData): Promise<void> {
  await set(DRAFT_KEY, data)
}

export async function clearHotIssueDraft(): Promise<void> {
  await del(DRAFT_KEY)
}

/** Fetches the routine/skill-prepared data, or null if none was ever committed. */
export async function loadHotIssueDataFromGitHub(settings: GitHubSettings): Promise<HotIssueData | null> {
  const content = await readRepoFile(settings, DATA_PATH)
  if (!content) return null
  return normalizeHotIssueData(JSON.parse(content))
}
