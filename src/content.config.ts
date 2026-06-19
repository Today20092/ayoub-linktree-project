import { defineCollection } from 'astro:content'
import { glob } from 'astro/loaders'
import { z } from 'astro/zod'

const portfolioLink = z.object({
  label: z.string(),
  url: z.string().url(),
})

const portfolioImage = z.object({
  src: z.string(),
  alt: z.string(),
  caption: z.string().optional(),
})

const portfolioVideo = z.object({
  youtubeId: z.string(),
  label: z.string(),
  title: z.string(),
  publishedAt: z.string(),
  description: z.string(),
  comparisonRole: z.enum(['before', 'after']).optional(),
})

const portfolio = defineCollection({
  loader: glob({
    base: './src/content/portfolio',
    pattern: '**/*.{md,mdx}',
  }),
  schema: z.object({
    order: z.number().int().nonnegative(),
    title: z.string(),
    status: z.enum(['complete', 'placeholder']),
    category: z.string(),
    summary: z.string(),
    thumbnail: z.string(),
    heroImage: z.string(),
    imageAlt: z.string(),
    imageWidth: z.number().int().positive(),
    imageHeight: z.number().int().positive(),
    services: z.array(z.string()).default([]),
    links: z.array(portfolioLink).default([]),
    role: z.string().optional(),
    collaborators: z.array(z.string()).default([]),
    duration: z.string().optional(),
    tools: z.array(z.string()).default([]),
    outcomes: z.array(z.string()).default([]),
    gallery: z.array(portfolioImage).default([]),
    videos: z.array(portfolioVideo).default([]),
  }),
})

export const collections = { portfolio }
