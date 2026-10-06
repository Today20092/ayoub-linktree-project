/** @param {Record<string, any>} generated */
export function productionGalleryConfig(generated) {
  if (
    generated.d1_databases?.length !== 1 ||
    generated.d1_databases[0].binding !== 'GALLERY_DB' ||
    generated.r2_buckets?.length !== 2 ||
    !generated.r2_buckets.some(
      (bucket) => bucket.binding === 'GALLERY_PUBLIC',
    ) ||
    !generated.r2_buckets.some((bucket) => bucket.binding === 'GALLERY_PENDING')
  )
    throw new Error(
      'Unexpected gallery bindings; production deployment stopped.',
    )
  return {
    ...generated,
    name: 'ayoub-linktree-project',
    topLevelName: 'ayoub-linktree-project',
    d1_databases: [
      {
        binding: 'GALLERY_DB',
        database_name: 'ayoub-gallery-data',
        database_id: '30b7489f-2cf5-441a-9c62-a479df0822fe',
      },
    ],
    r2_buckets: [
      { binding: 'GALLERY_PUBLIC', bucket_name: 'alphabravomedia-galleries' },
      {
        binding: 'GALLERY_PENDING',
        bucket_name: 'alphabravomedia-gallery-uploads',
      },
    ],
    previews: undefined,
    env: undefined,
  }
}
