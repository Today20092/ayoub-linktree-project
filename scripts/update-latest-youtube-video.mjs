import { readFile, writeFile } from 'node:fs/promises'
import { parse } from 'yaml'

const siteConfigPath = new URL(
  '../src/data/site.yaml',
  import.meta.url,
)
const outputPath = new URL(
  '../src/data/latest-youtube-videos.json',
  import.meta.url,
)

const textFrom = (xml, tagName) => {
  const match = xml.match(
    new RegExp(`<${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tagName}>`),
  )
  return match ? decodeXml(match[1].trim()) : ''
}

const attrFrom = (xml, tagName, attrName) => {
  const match = xml.match(
    new RegExp(`<${tagName}[^>]*\\s${attrName}="([^"]+)"`),
  )
  return match ? decodeXml(match[1]) : ''
}

const decodeXml = (value) =>
  value
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')

const decodeJsonString = (value) => {
  if (!value) return ''

  try {
    return JSON.parse(`"${value.replaceAll('"', '\\"')}"`)
  } catch {
    return decodeXml(value.replaceAll('\\u0026', '&'))
  }
}

const entriesFromFeed = (feed) =>
  [...feed.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map((match) => {
    const entry = match[1]
    const videoId = textFrom(entry, 'yt:videoId')

    return {
      videoId,
      title: textFrom(entry, 'title'),
      url: `https://www.youtube.com/watch?v=${videoId}`,
      thumbnail: attrFrom(entry, 'media:thumbnail', 'url'),
      published: textFrom(entry, 'published'),
      updated: textFrom(entry, 'updated'),
    }
  })

const uniqueVideos = (videos) => {
  const seen = new Set()

  return videos.filter((video) => {
    if (!video.videoId || seen.has(video.videoId)) return false
    seen.add(video.videoId)
    return true
  })
}

const videosFromVideosTab = async (videosUrl) => {
  if (!videosUrl) return []

  const response = await fetch(videosUrl, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (compatible; AyoubLinktree/1.0; +https://ayoubabed.xyz/)',
    },
  })

  if (!response.ok) {
    throw new Error(
      `YouTube videos tab request failed for ${videosUrl}: ${response.status} ${response.statusText}`,
    )
  }

  const html = await response.text()
  const videoIds = [
    ...new Set(
      [...html.matchAll(/watch\?v=([a-zA-Z0-9_-]{11})/g)].map(
        (match) => match[1],
      ),
    ),
  ]
  const videos = (
    await Promise.all(
      videoIds.map((videoId) => videoMetadataFromWatchPage(videoId)),
    )
  ).filter((video) => video && !video.isShort)

  return uniqueVideos(videos)
}

const latestVideoIdFromVideosTab = async (videosUrl) =>
  (await videosFromVideosTab(videosUrl))[0]?.videoId ?? ''

const videoMetadataFromWatchPage = async (videoId) => {
  if (!videoId) return null

  const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (compatible; AyoubLinktree/1.0; +https://ayoubabed.xyz/)',
    },
  })

  if (!response.ok) {
    throw new Error(
      `YouTube watch page request failed for ${videoId}: ${response.status} ${response.statusText}`,
    )
  }

  const html = await response.text()
  const title = html.match(
    /"videoDetails":\{"videoId":"[^"]+","title":"([^"]+)"/,
  )?.[1]
  const published = html.match(/"publishDate":"([^"]+)"/)?.[1] ?? ''
  const thumbnail =
    html.match(/"thumbnailUrl":"([^"]+)"/)?.[1] ??
    `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
  const isShort =
    html.includes(`/shorts/${videoId}`) ||
    html.includes(`\\/shorts\\/${videoId}`)

  if (!title) return null

  return {
    videoId,
    title: decodeJsonString(title),
    url: `https://www.youtube.com/watch?v=${videoId}`,
    thumbnail: decodeXml(thumbnail),
    published,
    updated: published,
    isShort,
  }
}

const videosWithFallbackThumbnails = (videos) =>
  uniqueVideos(videos).map((video) => {
    const { isShort, ...videoData } = video

    return {
      ...videoData,
      thumbnail:
        video.thumbnail ||
        `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`,
    }
  })

const fetchLatestVideo = async (channel, previousLatestVideo) => {
  const { id, channelId, videosUrl, name } = channel
  const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`
  const response = await fetch(feedUrl)
  let channelTitle = previousLatestVideo?.channelTitle ?? name

  if (response.ok) {
    const feed = await response.text()
    const feedEntries = entriesFromFeed(feed)
    const feedChannelTitle = textFrom(feed, 'title')

    if (feedEntries.length > 0) {
      channelTitle = feedChannelTitle || channelTitle

      const videosTabEntries = await videosFromVideosTab(videosUrl).catch(
        (error) => {
          console.warn(error.message)
          return []
        },
      )
      const latestVideoId = videosTabEntries[0]?.videoId ?? ''

      const latestEntry =
        feedEntries.find((entry) => entry.videoId === latestVideoId) ??
        videosWithFallbackThumbnails(videosTabEntries)[0]

      if (latestEntry) {
        const videos = videosWithFallbackThumbnails(
          videosTabEntries.map((video) => {
            const feedEntry = feedEntries.find(
              (entry) => entry.videoId === video.videoId,
            )

            return {
              ...video,
              title: feedEntry?.title || video.title,
              thumbnail: feedEntry?.thumbnail || video.thumbnail,
              published: feedEntry?.published || video.published,
              updated: feedEntry?.updated || video.updated,
            }
          }),
        )

        return [
          id,
          {
            channelId,
            channelTitle,
            ...latestEntry,
            videos,
          },
        ]
      }
    }
  }

  if (!response.ok) {
    console.warn(
      `YouTube feed request failed for ${channelId}: ${response.status} ${response.statusText}`,
    )
  } else {
    console.warn(`No videos found in YouTube feed for ${channelId}`)
  }

  try {
    const latestVideoId = await latestVideoIdFromVideosTab(videosUrl)
    const latestVideo = await videoMetadataFromWatchPage(latestVideoId)

    if (latestVideo && !latestVideo.isShort) {
      const { isShort, ...latestVideoData } = latestVideo

      return [
        id,
        {
          channelId,
          channelTitle,
          ...latestVideoData,
          videos: videosWithFallbackThumbnails([latestVideoData]),
        },
      ]
    }

    if (latestVideo?.isShort) {
      console.warn(`Skipping short video for ${name}`)
    }
  } catch (error) {
    console.warn(error.message)
  }

  if (previousLatestVideo) {
    console.warn(`Using cached YouTube data for ${name}`)
    return [id, previousLatestVideo]
  }

  return null
}

const siteConfig = parse(await readFile(siteConfigPath, 'utf8'))
const channels = siteConfig.youtubeChannels ?? []
const previousLatestVideos = JSON.parse(
  await readFile(outputPath, 'utf8').catch(() => '{}'),
)

const entries = await Promise.allSettled(
  channels.map((channel) =>
    fetchLatestVideo(channel, previousLatestVideos[channel.id]),
  ),
)

const latestVideos = { ...previousLatestVideos }

for (const entry of entries) {
  if (entry.status === 'fulfilled' && entry.value) {
    const [id, video] = entry.value
    latestVideos[id] = video
  }
}

await writeFile(outputPath, `${JSON.stringify(latestVideos, null, 2)}\n`)

for (const channel of channels) {
  if (latestVideos[channel.id]) {
    console.log(`${channel.name}: ${latestVideos[channel.id].title}`)
  } else {
    console.warn(`Skipped ${channel.name} - unable to fetch latest video`)
  }
}
