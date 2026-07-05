import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { PHOTO_ROLE_LABEL, type PhotoRole, type ReviewPhoto } from '../types'
import { PhotoImg } from './PhotoImg'

interface Props {
  photo: ReviewPhoto
  onRoleChange: (role: PhotoRole) => void
  onCaptionChange: (caption: string) => void
  onRemove: () => void
}

const ROLE_OPTIONS: PhotoRole[] = ['hero', 'interior', 'menu', 'food', 'etc']

export function SortablePhotoItem({ photo, onRoleChange, onCaptionChange, onRemove }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: photo.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex gap-3 rounded-lg border border-gray-200 bg-white p-2"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label="순서 변경"
        className="flex w-8 shrink-0 cursor-grab touch-none items-center justify-center text-gray-400 active:cursor-grabbing"
      >
        ☰
      </button>

      <PhotoImg
        dataUrl={photo.dataUrl}
        className="h-20 w-20 shrink-0 rounded object-cover"
      />

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex gap-1">
          {ROLE_OPTIONS.map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => onRoleChange(role)}
              className={`rounded-full px-2.5 py-1 text-xs ${
                photo.role === role
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {PHOTO_ROLE_LABEL[role]}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={photo.caption}
          onChange={(e) => onCaptionChange(e.target.value)}
          placeholder={photo.role === 'menu' ? '메뉴 코멘트' : '이 사진에 대한 코멘트'}
          className="w-full rounded border border-gray-200 px-2 py-1 text-sm"
        />
      </div>

      <button
        type="button"
        onClick={onRemove}
        aria-label="사진 삭제"
        className="shrink-0 self-start px-1 text-gray-400"
      >
        ✕
      </button>
    </div>
  )
}
