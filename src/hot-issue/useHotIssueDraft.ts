import { useEffect, useState } from 'react'
import type { GitHubSettings } from '../lib/github'
import {
  clearHotIssueDraft,
  loadHotIssueDataFromGitHub,
  loadHotIssueDraft,
  saveHotIssueDraft,
} from './hotIssueStorage'
import {
  createEmptyHotIssueData,
  createEmptySlide,
  type HotIssueData,
  type HotIssueImageBlock,
  type HotIssueSlideType,
} from './types'

export function useHotIssueDraft() {
  const [data, setData] = useState<HotIssueData>(createEmptyHotIssueData)
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    let cancelled = false
    loadHotIssueDraft().then((persisted) => {
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
      saveHotIssueDraft(data)
    }, 400)
    return () => clearTimeout(timeout)
  }, [data, isHydrated])

  function updateMeta(patch: Partial<HotIssueData['meta']>) {
    setData((prev) => ({ ...prev, meta: { ...prev.meta, ...patch } }))
  }

  function updateBody(patch: Partial<HotIssueData['body']>) {
    setData((prev) => ({ ...prev, body: { ...prev.body, ...patch } }))
  }

  function addSlide(type: HotIssueSlideType) {
    setData((prev) => ({ ...prev, slides: [...prev.slides, createEmptySlide(type)] }))
  }

  function removeSlide(id: string) {
    setData((prev) => ({ ...prev, slides: prev.slides.filter((s) => s.id !== id) }))
  }

  /** Shallow-patches one slide by id. Caller passes only the fields valid for that slide's type. */
  function updateSlide(id: string, patch: Record<string, unknown>) {
    setData((prev) => ({
      ...prev,
      slides: prev.slides.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }))
  }

  function reorderSlides(activeId: string, overId: string) {
    setData((prev) => {
      const activeIndex = prev.slides.findIndex((s) => s.id === activeId)
      const overIndex = prev.slides.findIndex((s) => s.id === overId)
      if (activeIndex === -1 || overIndex === -1) return prev
      const next = prev.slides.slice()
      const [moved] = next.splice(activeIndex, 1)
      next.splice(overIndex, 0, moved)
      return { ...prev, slides: next }
    })
  }

  function setChecklistItem(slideId: string, index: number, value: string) {
    setData((prev) => ({
      ...prev,
      slides: prev.slides.map((s) =>
        s.id === slideId && s.type === 'checklist'
          ? { ...s, items: s.items.map((item, i) => (i === index ? value : item)) }
          : s,
      ),
    }))
  }

  function addChecklistItem(slideId: string) {
    setData((prev) => ({
      ...prev,
      slides: prev.slides.map((s) =>
        s.id === slideId && s.type === 'checklist' ? { ...s, items: [...s.items, ''] } : s,
      ),
    }))
  }

  function removeChecklistItem(slideId: string, index: number) {
    setData((prev) => ({
      ...prev,
      slides: prev.slides.map((s) =>
        s.id === slideId && s.type === 'checklist'
          ? { ...s, items: s.items.filter((_, i) => i !== index) }
          : s,
      ),
    }))
  }

  function setCompareSide(slideId: string, side: 'left' | 'right', patch: Partial<HotIssueImageBlock>) {
    setData((prev) => ({
      ...prev,
      slides: prev.slides.map((s) =>
        s.id === slideId && s.type === 'imageCompare' ? { ...s, [side]: { ...s[side], ...patch } } : s,
      ),
    }))
  }

  async function resetDraft() {
    setData(createEmptyHotIssueData())
    await clearHotIssueDraft()
  }

  /** Pulls the skill-prepared JSON from the repo, warning before clobbering local edits. */
  async function loadFromRepo(settings: GitHubSettings): Promise<'loaded' | 'empty' | 'cancelled'> {
    const fresh = await loadHotIssueDataFromGitHub(settings)
    if (!fresh) return 'empty'
    // generatedAt comparison misses edits made on top of the same generation
    // (e.g. a photo attached after loading), so compare actual content.
    const hasLocalEdits = data.status === 'ready' && JSON.stringify(data) !== JSON.stringify(fresh)
    if (hasLocalEdits && !window.confirm('저장소의 최신 데이터로 바꿀까요? 지금 수정 중인 내용은 사라져요.')) {
      return 'cancelled'
    }
    setData(fresh)
    return 'loaded'
  }

  return {
    data,
    isHydrated,
    updateMeta,
    updateBody,
    addSlide,
    removeSlide,
    updateSlide,
    reorderSlides,
    setChecklistItem,
    addChecklistItem,
    removeChecklistItem,
    setCompareSide,
    resetDraft,
    loadFromRepo,
  }
}

export type HotIssueDraft = ReturnType<typeof useHotIssueDraft>
