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
