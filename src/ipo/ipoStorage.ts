import { del, get, set } from 'idb-keyval'
import { readRepoFile, type GitHubSettings } from '../lib/github'
import { normalizeIpoData, type IpoData } from './types'

const DRAFT_KEY = 'ipo-draft-v1'
const DATA_PATH = 'ipo/current.json'

export async function loadIpoDraft(): Promise<IpoData | undefined> {
  const persisted = await get(DRAFT_KEY)
  if (!persisted) return undefined
  return normalizeIpoData(persisted)
}

export async function saveIpoDraft(data: IpoData): Promise<void> {
  await set(DRAFT_KEY, data)
}

export async function clearIpoDraft(): Promise<void> {
  await del(DRAFT_KEY)
}

/** Fetches the routine-prepared IPO data, or null if none was ever committed. */
export async function loadIpoDataFromGitHub(settings: GitHubSettings): Promise<IpoData | null> {
  const content = await readRepoFile(settings, DATA_PATH)
  if (!content) return null
  return normalizeIpoData(JSON.parse(content))
}
