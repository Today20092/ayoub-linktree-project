import type { CollectionEntry } from 'astro:content'

import { eventGalleries } from '../data/event-galleries'
import {
  getEventGallery,
  getGalleryInvite,
  getGallerySettings,
  getHiddenFilenames,
  listEventGalleries,
  listGalleryInvites,
  listGalleryPhotos,
  listGuestPhotos,
  listPublishedGuestPhotos,
  publicEventCover,
  publicEventFlyer,
  publicGalleryPhoto,
  publicGuestPhoto,
  type EventGallery,
  type GalleryInvite,
  type GalleryPhoto,
  type GallerySettings,
  type GuestPhoto,
} from './gallery-data'

type StaticEvent = CollectionEntry<'portfolio'>

type StaticContentAdapter = {
  get(eventSlug: string): Promise<StaticEvent | undefined>
  list(): Promise<StaticEvent[]>
}

type GalleryRecordAdapter = {
  getEvent(eventSlug: string): Promise<EventGallery | undefined>
  listEvents(): Promise<EventGallery[]>
  getSettings(eventSlug: string): Promise<GallerySettings | null>
  getHiddenFilenames(eventSlug: string): Promise<Set<string>>
  listPublishedGuests(eventSlug: string): Promise<GuestPhoto[]>
  listGuests(eventSlug: string): Promise<GuestPhoto[]>
  listPhotos(eventSlug: string): Promise<GalleryPhoto[]>
  listInvites(eventSlug: string): Promise<GalleryInvite[]>
  getInvite(token: string): Promise<GalleryInvite | null>
}

type GalleryReaderDependencies = {
  staticContent: StaticContentAdapter
  records: GalleryRecordAdapter
}

function validStaticEvent(event: StaticEvent | undefined) {
  return event?.data.eventGallery ? event : undefined
}

function metadata(
  staticEvent: StaticEvent | undefined,
  dynamicEvent: EventGallery | undefined,
) {
  return {
    title: dynamicEvent?.title ?? staticEvent?.data.title ?? 'Event gallery',
    summary:
      dynamicEvent?.summary ??
      staticEvent?.data.galleryDescription ??
      staticEvent?.data.summary ??
      '',
    category:
      dynamicEvent?.category ??
      staticEvent?.data.category ??
      'Event Photography',
    eventDate: dynamicEvent?.event_date
      ? new Date(`${dynamicEvent.event_date}T00:00:00Z`)
      : staticEvent?.data.eventDate,
    eventTime: dynamicEvent?.event_time ?? staticEvent?.data.eventTime,
    eventVenue: dynamicEvent?.event_venue ?? staticEvent?.data.eventVenue,
  }
}

export function createGalleryReader({
  staticContent,
  records,
}: GalleryReaderDependencies) {
  async function resolve(eventSlug: string, includeHidden: boolean) {
    const [staticRow, dynamicEvent] = await Promise.all([
      staticContent.get(eventSlug),
      records.getEvent(eventSlug),
    ])
    const staticEvent = validStaticEvent(staticRow)
    if (!staticEvent && !dynamicEvent) return
    if (!includeHidden && dynamicEvent?.status === 'hidden') return

    return {
      eventSlug,
      staticEvent,
      dynamicEvent,
      visibility: dynamicEvent?.status ?? ('published' as const),
      comingSoon:
        dynamicEvent?.status === 'coming_soon' ||
        Boolean(dynamicEvent?.coming_soon),
      ...metadata(staticEvent, dynamicEvent),
      flyer: dynamicEvent ? publicEventFlyer(dynamicEvent) : undefined,
      cover: dynamicEvent ? publicEventCover(dynamicEvent) : undefined,
      featuredImage: staticEvent?.data.featuredImage,
      featuredImageSrc: staticEvent
        ? typeof staticEvent.data.featuredImage === 'string'
          ? staticEvent.data.featuredImage
          : staticEvent.data.featuredImage.src
        : undefined,
      imageAlt: staticEvent?.data.imageAlt,
    }
  }

  function gallerySlugs(
    staticEvents: StaticEvent[],
    dynamicEvents: EventGallery[],
  ) {
    return [
      ...new Set([
        ...staticEvents
          .filter(({ data }) => data.eventGallery)
          .map(({ id }) => id),
        ...dynamicEvents.map(({ event_slug }) => event_slug),
      ]),
    ]
  }

  function staticProfessionalImages(
    gallery: NonNullable<Awaited<ReturnType<typeof resolve>>>,
  ) {
    const inlineImages = gallery.staticEvent
      ? gallery.staticEvent.data.gallery.filter(
          (image): image is Extract<typeof image, { filename: string }> =>
            'filename' in image,
        )
      : []
    return inlineImages.length > 0
      ? inlineImages
      : (eventGalleries[gallery.eventSlug] ?? [])
  }

  async function publicDetail(eventSlug: string) {
    const gallery = await resolve(eventSlug, false)
    if (!gallery) return
    const [settings, hiddenFilenames, publishedGuests, uploadedPhotos] =
      await Promise.all([
        records.getSettings(eventSlug),
        records.getHiddenFilenames(eventSlug),
        records.listPublishedGuests(eventSlug),
        records.listPhotos(eventSlug),
      ])
    const staticImages = staticProfessionalImages(gallery)
    const uploadedImages = gallery.comingSoon
      ? []
      : uploadedPhotos.map(publicGalleryPhoto)
    const professionalImages = [
      ...staticImages.filter((image) => !hiddenFilenames.has(image.filename)),
      ...uploadedImages.filter((image) => image.source === 'admin'),
    ]
    const guestImages = gallery.comingSoon
      ? []
      : [
          ...publishedGuests.map(publicGuestPhoto),
          ...uploadedImages.filter((image) => image.source === 'guest'),
        ]
    const staticFlyer =
      typeof gallery.featuredImage === 'object' &&
      gallery.featuredImage !== null &&
      !('filename' in gallery.featuredImage)
        ? gallery.featuredImage
        : undefined
    const remoteFeaturedImage =
      typeof gallery.featuredImage === 'object' &&
      gallery.featuredImage !== null &&
      'filename' in gallery.featuredImage &&
      !hiddenFilenames.has(gallery.featuredImage.filename)
        ? gallery.featuredImage
        : undefined
    const allImages = [...professionalImages, ...guestImages]

    return {
      ...gallery,
      settings,
      hiddenFilenames,
      professionalImages,
      guestImages,
      allImages,
      ogImage:
        gallery.cover?.src ??
        allImages[0]?.src ??
        gallery.flyer?.src ??
        gallery.featuredImageSrc ??
        '/og.jpg',
      flyerImage: staticFlyer ?? gallery.flyer,
      heroImage: gallery.cover ?? remoteFeaturedImage ?? professionalImages[0],
    }
  }

  async function adminDetail(eventSlug: string) {
    const gallery = await resolve(eventSlug, true)
    if (!gallery) return
    const [settings, guests, hiddenFilenames, uploadedPhotos, invites] =
      await Promise.all([
        records.getSettings(eventSlug),
        records.listGuests(eventSlug),
        records.getHiddenFilenames(eventSlug),
        records.listPhotos(eventSlug),
        records.listInvites(eventSlug),
      ])
    const professionalImages = staticProfessionalImages(gallery)

    return {
      ...gallery,
      settings,
      guests,
      uploadedPhotos,
      invites,
      professional: professionalImages.map((image) => ({
        src: image.src,
        alt: image.alt,
        filename: image.filename,
        width: image.width,
        height: image.height,
        hidden: hiddenFilenames.has(image.filename),
      })),
    }
  }

  async function listPublic() {
    const [staticEvents, dynamicEvents] = await Promise.all([
      staticContent.list(),
      records.listEvents(),
    ])
    const slugs = gallerySlugs(staticEvents, dynamicEvents)
    const galleries = await Promise.all(
      slugs.map(async (eventSlug) => {
        const detail = await publicDetail(eventSlug)
        if (!detail) return
        const staticEvent = detail.staticEvent
        const requestedCover =
          detail.cover ??
          staticEvent?.data.thumbnail ??
          staticEvent?.data.featuredImage ??
          detail.flyer
        const requestedCoverIsHidden =
          typeof requestedCover === 'object' &&
          requestedCover !== null &&
          'filename' in requestedCover &&
          detail.hiddenFilenames.has(requestedCover.filename)
        const coverAsset = requestedCoverIsHidden
          ? detail.allImages[0]
          : (requestedCover ?? detail.allImages[0])
        const isRemote =
          typeof coverAsset === 'object' &&
          coverAsset !== null &&
          'filename' in coverAsset
        return {
          id: eventSlug,
          title: detail.title,
          category: detail.category,
          eventDate: detail.eventDate,
          photoCount: detail.comingSoon ? 0 : detail.allImages.length,
          isRemote,
          cover: isRemote ? (coverAsset as { src: string }).src : coverAsset,
          coverAlt: isRemote
            ? (coverAsset as { alt: string }).alt
            : coverAsset
              ? (staticEvent?.data.imageAlt ?? `${detail.title} gallery`)
              : 'No published photographs',
          coverWidth: isRemote
            ? (coverAsset as { width: number }).width
            : (staticEvent?.data.imageWidth ?? 1200),
          coverHeight: isRemote
            ? (coverAsset as { height: number }).height
            : (staticEvent?.data.imageHeight ?? 800),
        }
      }),
    )
    return galleries
      .filter((gallery) => gallery)
      .sort((a, b) => {
        const aTime = a.eventDate?.getTime() ?? 0
        const bTime = b.eventDate?.getTime() ?? 0
        return bTime - aTime
      })
  }

  async function listAdmin() {
    const [staticEvents, dynamicEvents] = await Promise.all([
      staticContent.list(),
      records.listEvents(),
    ])
    const slugs = gallerySlugs(staticEvents, dynamicEvents)
    return Promise.all(
      slugs.map(async (eventSlug) => {
        const [gallery, settings, guests, photos] = await Promise.all([
          resolve(eventSlug, true),
          records.getSettings(eventSlug),
          records.listGuests(eventSlug),
          records.listPhotos(eventSlug),
        ])
        if (!gallery) throw new Error(`Gallery disappeared: ${eventSlug}`)
        const cover =
          gallery.staticEvent?.data.thumbnail ??
          gallery.staticEvent?.data.featuredImage ??
          gallery.flyer
        return {
          event: gallery.staticEvent ?? { id: eventSlug },
          settings,
          pending: guests.filter(({ status }) => status === 'pending').length,
          published:
            guests.filter(({ status }) => status === 'published').length +
            (gallery.staticEvent ? 0 : photos.length),
          cover,
          coverAlt:
            gallery.staticEvent?.data.imageAlt ?? `${gallery.title} flyer`,
          category: gallery.category,
          title: gallery.title,
          eventDate: gallery.eventDate,
          visibilityStatus: gallery.visibility,
        }
      }),
    )
  }

  return {
    get(eventSlug: string) {
      return resolve(eventSlug, false)
    },
    getPublicDetail: publicDetail,
    getAdminDetail: adminDetail,
    listPublic,
    listAdmin,
    async getUploadContext(eventSlug: string) {
      const [gallery, settings] = await Promise.all([
        resolve(eventSlug, false),
        records.getSettings(eventSlug),
      ])
      if (!gallery) return
      return { gallery, settings }
    },
    async getInviteContext(eventSlug: string, token: string) {
      const [gallery, invite] = await Promise.all([
        resolve(eventSlug, false),
        records.getInvite(token),
      ])
      if (!gallery || invite?.event_slug !== eventSlug) return
      return { gallery, invite }
    },
  }
}

function databaseRecords(database: D1Database): GalleryRecordAdapter {
  return {
    getEvent: (eventSlug) => getEventGallery(database, eventSlug),
    listEvents: () => listEventGalleries(database),
    getSettings: (eventSlug) => getGallerySettings(database, eventSlug),
    getHiddenFilenames: (eventSlug) => getHiddenFilenames(database, eventSlug),
    listPublishedGuests: (eventSlug) =>
      listPublishedGuestPhotos(database, eventSlug),
    listGuests: (eventSlug) => listGuestPhotos(database, eventSlug),
    listPhotos: (eventSlug) => listGalleryPhotos(database, eventSlug),
    listInvites: (eventSlug) => listGalleryInvites(database, eventSlug),
    getInvite: (token) => getGalleryInvite(database, token),
  }
}

export function galleryReader(database: D1Database) {
  return createGalleryReader({
    staticContent: {
      async get(eventSlug) {
        const { getEntry } = await import('astro:content')
        return getEntry('portfolio', eventSlug)
      },
      async list() {
        const { getCollection } = await import('astro:content')
        return getCollection('portfolio')
      },
    },
    records: databaseRecords(database),
  })
}
