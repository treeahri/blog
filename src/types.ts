export type PhotoRole = 'hero' | 'interior' | 'menu' | 'food' | 'etc'

export interface ReviewPhoto {
  id: string
  dataUrl: string
  role: PhotoRole
  caption: string
}

export interface ReviewFormData {
  restaurantName: string
  visitYear: string
  visitMonth: string
  hours: string
  parking: string
  priceRange: string
  intro: string
  menuNote: string
  summary: string
  hashtags: string
}

export const PHOTO_ROLE_LABEL: Record<PhotoRole, string> = {
  hero: '대표',
  interior: '매장',
  menu: '메뉴판',
  food: '음식',
  etc: '기타',
}

export function createEmptyFormData(): ReviewFormData {
  const now = new Date()
  return {
    restaurantName: '',
    visitYear: String(now.getFullYear()),
    visitMonth: String(now.getMonth() + 1).padStart(2, '0'),
    hours: '',
    parking: '',
    priceRange: '',
    intro: '안녕하세요. 예스데이입니다.',
    menuNote: '',
    summary: '',
    hashtags: '',
  }
}
