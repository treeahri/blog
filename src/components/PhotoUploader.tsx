import { useRef } from 'react'

interface Props {
  onFilesSelected: (files: FileList) => void
}

export function PhotoUploader({ onFilesSelected }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            onFilesSelected(e.target.files)
          }
          e.target.value = ''
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="w-full rounded-lg border-2 border-dashed border-gray-300 py-8 text-sm text-gray-500 active:bg-gray-50"
      >
        + 사진 추가하기
      </button>
    </div>
  )
}
