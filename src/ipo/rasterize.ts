import { toBlob } from 'html-to-image'

const CARD_SIZE = 1080

/**
 * Rasterizes one full-size card element to a 1080×1080 PNG. Callers must
 * pass an untransformed element (the hidden export deck), not the scaled
 * preview. WebKit needs a warm-up capture — its first foreignObject paint
 * can come back blank.
 */
export async function captureCardPng(el: HTMLElement): Promise<Blob> {
  await document.fonts.ready
  const options = {
    width: CARD_SIZE,
    height: CARD_SIZE,
    pixelRatio: 1,
    backgroundColor: '#f2ede3',
  }
  const isWebKit = /apple/i.test(navigator.vendor ?? '')
  if (isWebKit) await toBlob(el, options)
  const blob = await toBlob(el, options)
  if (!blob) throw new Error('카드 이미지를 만들지 못했어요. 다시 시도해주세요.')
  return blob
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
