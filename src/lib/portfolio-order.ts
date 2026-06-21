import type { CollectionEntry } from 'astro:content'

const PINNED_PROJECT_ID = 'ya-hala'

export function sortPortfolioProjects(
  a: CollectionEntry<'portfolio'>,
  b: CollectionEntry<'portfolio'>,
) {
  if (a.id === PINNED_PROJECT_ID) return -1
  if (b.id === PINNED_PROJECT_ID) return 1

  return a.data.order - b.data.order
}
