import { get, set, del } from 'idb-keyval'
import type { ReviewFormData, ReviewPhoto } from '../types'
import { readRepoFile, writeRepoFile, type GitHubSettings } from './github'

const DRAFT_KEY = 'review-draft-v1'
const SYNC_PATH = 'drafts/current.json'

export interface PersistedDraft {
  photos: ReviewPhoto[]
  form: ReviewFormData
}

export async function loadDraft(): Promise<PersistedDraft | undefined> {
  return get(DRAFT_KEY)
}

export async function saveDraft(draft: PersistedDraft): Promise<void> {
  await set(DRAFT_KEY, draft)
}

export async function clearDraft(): Promise<void> {
  await del(DRAFT_KEY)
}

/** Pushes the draft to the user's GitHub repo so another device can pick it up. */
export async function saveDraftToGitHub(settings: GitHubSettings, draft: PersistedDraft): Promise<void> {
  await writeRepoFile(settings, SYNC_PATH, JSON.stringify(draft), '초안 동기화')
}

/** Fetches the most recently synced draft, or null if none was ever saved. */
export async function loadDraftFromGitHub(settings: GitHubSettings): Promise<PersistedDraft | null> {
  const content = await readRepoFile(settings, SYNC_PATH)
  if (!content) return null
  return JSON.parse(content) as PersistedDraft
}
