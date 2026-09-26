export type RemoteEventGalleryImage = {
  src: string
  width: number
  height: number
  alt: string
  filename: string
  featured: boolean
}

// Legacy fallback for galleries that have not yet moved into their MDX manifest.
export const eventGalleries: Record<string, RemoteEventGalleryImage[]> = {}
