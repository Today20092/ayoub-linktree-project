import { readFile, writeFile } from 'node:fs/promises'

const channelsPath = new URL('../src/data/youtube-channels.json', import.meta.url)
const outputPath = new URL('../src/data/latest-youtube-videos.json', import.meta.url)

const textFrom = (xml, tagName) => {
  const match = xml.match(new RegExp(`<${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tagName}>`))
  return match ? decodeXml(match[1].trim()) : ''
}

const attrFrom = (xml, tagName, attrName) => {
  const match = xml.match(new RegExp(`<${tagName}[^>]*\\s${attrName}="([^"]+)"`))
  return match ? decodeXml(match[1]) : ''
}

const decodeXml = (value) =>
  value
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')

const fetchLatestVideo = async ({ id, channelId }) => {
  const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`
  const response = await fetch(feedUrl)

  if (!response.ok) {
    throw new Error(`YouTube feed request failed for ${channelId}: ${response.status} ${response.statusText}`)
  }

  const feed = await response.text()
  const entry = feed.match(/<entry>([\s\S]*?)<\/entry>/)?.[1]

  if (!entry) {
    throw new Error(`No videos found in YouTube feed for ${channelId}`)
  }

  const videoId = textFrom(entry, 'yt:videoId')

  return [
    id,
    {
      channelId,
      channelTitle: textFrom(feed, 'title'),
      videoId,
      title: textFrom(entry, 'title'),
      url: `https://www.youtube.com/watch?v=${videoId}`,
      thumbnail: attrFrom(entry, 'media:thumbnail', 'url'),
      published: textFrom(entry, 'published'),
      updated: textFrom(entry, 'updated'),
    },
  ]
}

const channels = JSON.parse(await readFile(channelsPath, 'utf8'))
const entries = await Promise.all(channels.map(fetchLatestVideo))
const latestVideos = Object.fromEntries(entries)

await writeFile(outputPath, `${JSON.stringify(latestVideos, null, 2)}\n`)

for (const channel of channels) {
  console.log(`${channel.name}: ${latestVideos[channel.id].title}`)
}
