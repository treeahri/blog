import { useEffect, useState } from 'react'
import type { GitHubSettings } from '../lib/github'
import { clearIpoDraft, loadIpoDataFromGitHub, loadIpoDraft, saveIpoDraft } from './ipoStorage'
import { computeDdayLine, createEmptyIpoData, type IpoData } from './types'

/** Deep-partial patch helper type for updateData. */
type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends (infer U)[]
    ? U[]
    : T[K] extends object
      ? DeepPartial<T[K]>
      : T[K]
}

export function useIpoDraft() {
  const [data, setData] = useState<IpoData>(createEmptyIpoData)
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    let cancelled = false
    loadIpoDraft().then((persisted) => {
      if (cancelled) return
      if (persisted) setData(persisted)
      setIsHydrated(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!isHydrated) return
    const timeout = setTimeout(() => {
      saveIpoDraft(data)
    }, 400)
    return () => clearTimeout(timeout)
  }, [data, isHydrated])

  function updateData(patch: DeepPartial<IpoData>) {
    setData((prev) => mergePatch(prev, patch) as IpoData)
  }

  /** Replaces one item of a string-array field, e.g. setListItem(['body','summaryLines'], 1, '...'). */
  function setListItem(path: string[], index: number, value: unknown) {
    setData((prev) => updateListAt(prev, path, (list) => list.map((item, i) => (i === index ? value : item))))
  }

  function addListItem(path: string[], value: unknown) {
    setData((prev) => updateListAt(prev, path, (list) => [...list, value]))
  }

  function removeListItem(path: string[], index: number) {
    setData((prev) => updateListAt(prev, path, (list) => list.filter((_, i) => i !== index)))
  }

  async function resetDraft() {
    setData(createEmptyIpoData())
    await clearIpoDraft()
  }

  /**
   * Pulls the routine-prepared JSON from the repo. The D-day line is
   * recomputed from the ISO schedule because the JSON may have been
   * generated days earlier.
   */
  async function loadFromRepo(settings: GitHubSettings): Promise<'loaded' | 'empty' | 'cancelled'> {
    const fresh = await loadIpoDataFromGitHub(settings)
    if (!fresh) return 'empty'
    const hasLocalEdits = data.status === 'ready' && data.generatedAt !== fresh.generatedAt
    if (hasLocalEdits && !window.confirm('저장소의 최신 데이터로 바꿀까요? 지금 수정 중인 내용은 사라져요.')) {
      return 'cancelled'
    }
    if (fresh.status === 'ready' && fresh.schedule.subscriptionStart) {
      fresh.cards.cover.ddayLine = computeDdayLine(fresh.schedule.subscriptionStart)
    }
    setData(fresh)
    return 'loaded'
  }

  return {
    data,
    isHydrated,
    updateData,
    setListItem,
    addListItem,
    removeListItem,
    resetDraft,
    loadFromRepo,
  }
}

export type IpoDraft = ReturnType<typeof useIpoDraft>

function mergePatch(base: unknown, patch: unknown): unknown {
  if (
    typeof patch !== 'object' ||
    patch === null ||
    Array.isArray(patch) ||
    typeof base !== 'object' ||
    base === null ||
    Array.isArray(base)
  ) {
    return patch
  }
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) }
  for (const [key, value] of Object.entries(patch as Record<string, unknown>)) {
    if (value === undefined) continue
    out[key] = mergePatch(out[key], value)
  }
  return out
}

function updateListAt(data: IpoData, path: string[], fn: (list: unknown[]) => unknown[]): IpoData {
  const patch: Record<string, unknown> = {}
  let cursor: Record<string, unknown> = patch
  let source: unknown = data
  for (const [i, key] of path.entries()) {
    source = (source as Record<string, unknown>)[key]
    if (i === path.length - 1) {
      cursor[key] = fn(Array.isArray(source) ? source : [])
    } else {
      const next: Record<string, unknown> = {}
      cursor[key] = next
      cursor = next
    }
  }
  return mergePatch(data, patch) as IpoData
}
