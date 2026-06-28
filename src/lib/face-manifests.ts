export type FaceBox = {
  x: number
  y: number
  width: number
  height: number
}

export type FaceCluster = {
  id: string
  representative: {
    src: string
    filename: string
    bbox: FaceBox
  }
  filenames: string[]
}

export type FaceManifest = {
  eventSlug: string
  version: string
  namespace: string
  model: string
  dimensions: 1024
  threshold: number
  vectorIds: string[]
  clusters: FaceCluster[]
}

const modules = import.meta.glob<{ default: FaceManifest }>(
  '../data/face-galleries/*.json',
  { eager: true },
)

export const faceManifests = Object.fromEntries(
  Object.values(modules).map(({ default: manifest }) => [
    manifest.eventSlug,
    manifest,
  ]),
) as Record<string, FaceManifest>
