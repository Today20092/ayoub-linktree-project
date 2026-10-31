export const GALLERY_PAGE_SIZE = 40

export function galleryPagePath(
  pathname: string,
  page: number,
  share?: string,
) {
  const query = new URLSearchParams()
  if (page > 1) query.set('page', String(page))
  if (share) query.set('share', share)
  return pathname + (query.size ? `?${query}` : '')
}

export function galleryPage(params: URLSearchParams, count: number) {
  const value = params.get('page')
  const page = value === null ? 1 : Number(value)
  if (
    params.getAll('page').length > 1 ||
    (value !== null && !/^[1-9]\d*$/.test(value)) ||
    !Number.isSafeInteger(page) ||
    page > Math.max(1, Math.ceil(count / GALLERY_PAGE_SIZE))
  )
    return undefined
  const photo = params.get('photo')
  if (photo !== null) {
    if (
      params.getAll('photo').length > 1 ||
      !/^[1-9]\d*$/.test(photo) ||
      !Number.isSafeInteger(Number(photo)) ||
      Number(photo) > count
    )
      return undefined
    return Math.floor((Number(photo) - 1) / GALLERY_PAGE_SIZE) + 1
  }
  return page
}
