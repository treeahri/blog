import { del, get, set } from 'idb-keyval'
import { readRepoFile, writeRepoFile, type GitHubSettings } from '../lib/github'
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

/**
 * Overwrites hot-issue/current.json with the in-app draft (e.g. after
 * attaching photos on mobile), so another device — or the skill reading it
 * back — sees the same edits.
 */
export async function saveHotIssueDataToGitHub(settings: GitHubSettings, data: HotIssueData): Promise<void> {
  await writeRepoFile(settings, DATA_PATH, JSON.stringify(data, null, 2), '핫이슈 초안 동기화')
}
