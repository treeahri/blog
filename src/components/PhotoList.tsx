import {
  DndContext,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useState } from 'react'
import type { PhotoRole, ReviewPhoto } from '../types'
import { PhotoImg } from './PhotoImg'
import { SortablePhotoItem } from './SortablePhotoItem'

interface Props {
  photos: ReviewPhoto[]
  onReorder: (activeId: string, overId: string) => void
  onRoleChange: (id: string, role: PhotoRole) => void
  onCaptionChange: (id: string, caption: string) => void
  onRemove: (id: string) => void
}

export function PhotoList({ photos, onReorder, onRoleChange, onCaptionChange, onRemove }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
  )
  const [previewPhoto, setPreviewPhoto] = useState<ReviewPhoto | null>(null)

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      onReorder(String(active.id), String(over.id))
    }
  }

  if (photos.length === 0) {
    return <p className="py-4 text-center text-sm text-gray-400">추가된 사진이 없습니다</p>
  }

  return (
    <>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={photos.map((p) => p.id)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-2">
            {photos.map((photo) => (
              <SortablePhotoItem
                key={photo.id}
                photo={photo}
                onRoleChange={(role) => onRoleChange(photo.id, role)}
                onCaptionChange={(caption) => onCaptionChange(photo.id, caption)}
                onRemove={() => onRemove(photo.id)}
                onImageClick={() => setPreviewPhoto(photo)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {previewPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setPreviewPhoto(null)}
        >
          <button
            type="button"
            onClick={() => setPreviewPhoto(null)}
            aria-label="닫기"
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-xl text-white"
          >
            ✕
          </button>
          <PhotoImg
            dataUrl={previewPhoto.dataUrl}
            className="max-h-full max-w-full rounded object-contain"
          />
        </div>
      )}
    </>
  )
}
