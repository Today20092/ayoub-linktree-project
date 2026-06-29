import { defineCollection } from 'astro:content'
import { glob } from 'astro/loaders'
import { z } from 'astro/zod'

const portfolioLink = z.object({
  label: z.string(),
  url: z.url(),
})

const portfolioLocation = z.object({
  address: z.string(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  plusCode: z.string(),
  googleMapsUrl: z.url(),
})

const portfolioVideo = z.object({
  youtubeId: z.string(),
  label: z.string(),
  title: z.string(),
  publishedAt: z.string(),
  description: z.string(),
  comparisonRole: z.enum(['before', 'after']).optional(),
})

const upcomingPortfolioVideo = z.object({
  label: z.string(),
  title: z.string(),
  description: z.string(),
})

const portfolio = defineCollection({
  loader: glob({
    base: './src/content/portfolio',
    pattern: '**/*.{md,mdx}',
  }),
  schema: ({ image }) => {
    const portfolioAsset = image()
    const localPortfolioImage = z.object({
      src: portfolioAsset,
      alt: z.string(),
      caption: z.string().optional(),
    })
    const remotePortfolioImage = z.object({
      src: z.url(),
      width: z.number().int().positive(),
      height: z.number().int().positive(),
      alt: z.string(),
      filename: z.string().min(1),
      caption: z.string().optional(),
      featured: z.boolean().default(false),
    })
    const portfolioImage = z.union([remotePortfolioImage, localPortfolioImage])
    const portfolioDisplayImage = z.union([
      remotePortfolioImage,
      portfolioAsset,
    ])

    return z.object({
      order: z.number().int().nonnegative(),
      title: z.string(),
      seoTitle: z.string().optional(),
      seoDescription: z.string().optional(),
      status: z.enum(['complete', 'placeholder']),
      category: z.string(),
      summary: z.string(),
      featuredImage: portfolioDisplayImage,
      thumbnail: portfolioDisplayImage.optional(),
      heroImage: portfolioDisplayImage.optional(),
      heroVideo: z.string().optional(),
      imageAlt: z.string(),
      imageWidth: z.number().int().positive(),
      imageHeight: z.number().int().positive(),
      services: z.array(z.string()).default([]),
      links: z.array(portfolioLink).default([]),
      location: portfolioLocation.optional(),
      role: z.string().optional(),
      collaborators: z.array(z.string()).default([]),
      duration: z.string().optional(),
      tools: z.array(z.string()).default([]),
      outcomes: z.array(z.string()).default([]),
      galleryHeading: z.string().optional(),
      galleryLayout: z.enum(['stack', 'masonry']).default('stack'),
      eventGallery: z.boolean().default(false),
      eventDate: z.coerce.date().optional(),
      galleryDescription: z.string().optional(),
      downloadAllUrl: z.url().optional(),
      gallery: z.array(portfolioImage).default([]),
      videos: z.array(portfolioVideo).default([]),
      upcomingVideo: upcomingPortfolioVideo.optional(),
    })
  },
})

export const collections = { portfolio }
