export type RowImage = {
  src: string
  width: number
  height: number
  alt: string
  filename: string
  caption?: string
  featured?: boolean
}

export type JustifiedRow = {
  images: RowImage[]
  aspectRatio: number
  isLast: boolean
}

export type JustifiedRowsOptions = {
  targetRowHeight?: number
  maxRowWidth?: number
  gap?: number
}

export function computeJustifiedRows(
  images: RowImage[],
  {
    targetRowHeight = 240,
    maxRowWidth = 1216,
    gap = 8,
  }: JustifiedRowsOptions = {},
): JustifiedRow[] {
  if (images.length === 0) return []

  const rows: JustifiedRow[] = []
  let current: RowImage[] = []
  let currentAspect = 0

  const finalizeRow = (rowImages: RowImage[], isLast: boolean) => {
    const aspectRatio = rowImages.reduce(
      (sum, img) => sum + img.width / img.height,
      0,
    )
    rows.push({ images: rowImages, aspectRatio, isLast })
  }

  for (const image of images) {
    const imageAspect = image.width / image.height
    const candidateAspect = currentAspect + imageAspect
    const candidateWidth =
      candidateAspect * targetRowHeight + gap * current.length

    current.push(image)
    currentAspect = candidateAspect

    if (candidateWidth >= maxRowWidth && current.length > 1) {
      finalizeRow(current, false)
      current = []
      currentAspect = 0
    }
  }

  if (current.length > 0) {
    finalizeRow(current, true)
  }

  return rows
}

export function flattenRowIndices(rows: JustifiedRow[]): Map<string, number> {
  const indexBySrc = new Map<string, number>()
  let runningIndex = 0
  for (const row of rows) {
    for (const image of row.images) {
      indexBySrc.set(image.src, runningIndex)
      runningIndex += 1
    }
  }
  return indexBySrc
}
