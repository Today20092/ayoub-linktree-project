export type FaceManifest = {
  eventSlug: string
  version: string
  namespace: string
  model: string
  dimensions: 1024
  threshold: number
  vectorIds: string[]
  faceCount: number
  photoCount: number
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
