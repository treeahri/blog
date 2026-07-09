import { useEffect, useMemo, useState } from 'react'
import { clearDraft, loadDraft, saveDraft } from '../lib/draftStorage'
import { processImageFile } from '../lib/image'
import {
  createEmptyFormData,
  type PhotoRole,
  type ReviewFormData,
  type ReviewPhoto,
} from '../types'

export function useReviewDraft() {
  const [photos, setPhotos] = useState<ReviewPhoto[]>([])
  const [form, setForm] = useState<ReviewFormData>(createEmptyFormData)
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    let cancelled = false
    loadDraft().then((persisted) => {
      if (cancelled) return
      if (persisted) {
        setPhotos(persisted.photos)
        setForm(persisted.form)
      }
      setIsHydrated(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!isHydrated) return
    const timeout = setTimeout(() => {
      saveDraft({ photos, form })
    }, 400)
    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos, form, isHydrated])

  // crypto.randomUUID only exists on secure origins (https/localhost), so
  // opening the dev server over LAN http would break photo adding without
  // the fallback.
  function newPhotoId(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  }

  async function addPhotos(files: FileList | File[]) {
    const list = Array.from(files)
    const newPhotos = await Promise.all(
      list.map(async (file): Promise<ReviewPhoto> => ({
        id: newPhotoId(),
        dataUrl: await processImageFile(file),
        role: 'food',
        caption: '',
      })),
    )
    setPhotos((prev) => [...prev, ...newPhotos])
  }

  function removePhoto(id: string) {
    setPhotos((prev) => prev.filter((p) => p.id !== id))
  }

  function setPhotoRole(id: string, role: PhotoRole) {
    setPhotos((prev) =>
      prev.map((p) => {
        if (p.id === id) return { ...p, role }
        // only one hero photo at a time
        if (role === 'hero' && p.role === 'hero') return { ...p, role: 'food' }
        return p
      }),
    )
  }

  function setPhotoCaption(id: string, caption: string) {
    setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, caption } : p)))
  }

  function reorderPhotos(activeId: string, overId: string) {
    setPhotos((prev) => {
      const activeIndex = prev.findIndex((p) => p.id === activeId)
      const overIndex = prev.findIndex((p) => p.id === overId)
      if (activeIndex === -1 || overIndex === -1) return prev
      const next = prev.slice()
      const [moved] = next.splice(activeIndex, 1)
      next.splice(overIndex, 0, moved)
      return next
    })
  }

  function updateForm(patch: Partial<ReviewFormData>) {
    setForm((prev) => ({ ...prev, ...patch }))
  }

  async function resetDraft() {
    setPhotos([])
    setForm(createEmptyFormData())
    await clearDraft()
  }

  // A synced snapshot may come from an older app version, so missing form
  // fields fall back to defaults instead of crashing the preview.
  function loadSnapshot(snapshot: { photos: ReviewPhoto[]; form: ReviewFormData }) {
    setPhotos((snapshot.photos ?? []).filter((p) => p?.dataUrl))
    setForm({ ...createEmptyFormData(), ...snapshot.form })
  }

  const heroPhoto = useMemo(() => photos.find((p) => p.role === 'hero'), [photos])
  const interiorPhotos = useMemo(() => photos.filter((p) => p.role === 'interior'), [photos])
  const menuPhotos = useMemo(() => photos.filter((p) => p.role === 'menu'), [photos])
  const foodPhotos = useMemo(() => photos.filter((p) => p.role === 'food'), [photos])
  const etcPhotos = useMemo(() => photos.filter((p) => p.role === 'etc'), [photos])

  return {
    photos,
    form,
    isHydrated,
    heroPhoto,
    interiorPhotos,
    menuPhotos,
    foodPhotos,
    etcPhotos,
    addPhotos,
    removePhoto,
    setPhotoRole,
    setPhotoCaption,
    reorderPhotos,
    updateForm,
    resetDraft,
    loadSnapshot,
  }
}

export type ReviewDraft = ReturnType<typeof useReviewDraft>
