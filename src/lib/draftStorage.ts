import { get, set, del } from 'idb-keyval'
import type { ReviewFormData, ReviewPhoto } from '../types'

const DRAFT_KEY = 'review-draft-v1'

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
