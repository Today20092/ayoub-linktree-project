/** Keep thumbnails large enough to tap, including the two-pixel gutters. */
export function galleryColumns(width: number): number[] {
  return [2, 3, 5, 7].filter(
    (columns) => (width - (columns - 1) * 2) / columns >= 44,
  )
}

/** One-pixel grid rows plus two-pixel gutters reserve each photo's natural height. */
export function masonryRowSpan(
  width: number,
  height: number,
  tileWidth: number,
) {
  return Math.ceil(((tileWidth * height) / width + 2) / 3)
}

export function parseGalleryPreferences(
  saved: string | null,
): { view: 'grid' | 'masonry'; columns: number } | undefined {
  try {
    const value = JSON.parse(saved ?? 'null')
    if (
      value &&
      !Array.isArray(value) &&
      (value.view === 'grid' || value.view === 'masonry') &&
      [2, 3, 5, 7].includes(value.columns)
    )
      return { view: value.view, columns: value.columns }
  } catch {
    // Ignore invalid saved preferences; the gallery still works with defaults.
  }
}

export function nextGalleryPhoto(
  current: number,
  direction: -1 | 1,
  visible: number[],
) {
  if (direction === 1)
    return visible.find((index) => index > current) ?? visible[0]
  return visible.findLast((index) => index < current) ?? visible.at(-1)
}
