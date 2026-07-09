import { useEffect, useState } from 'react'
import { dataUrlToFile } from '../lib/image'

interface Props {
  dataUrl: string
  alt?: string
  className?: string
}

/**
 * Renders via a blob: object URL instead of the raw data: URI. Some mobile
 * browsers only place a real image on the clipboard (for "copy image" /
 * paste into Naver) when the <img> is backed by a blob URL rather than an
 * inline base64 data URI.
 */
export function PhotoImg({ dataUrl, alt = '', className }: Props) {
  const [objectUrl, setObjectUrl] = useState<string>()

  useEffect(() => {
    const file = dataUrlToFile(dataUrl, 'photo.jpg')
    const url = URL.createObjectURL(file)
    setObjectUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [dataUrl])

  if (!objectUrl) return null
  return <img src={objectUrl} alt={alt} className={className} loading="lazy" decoding="async" />
}
