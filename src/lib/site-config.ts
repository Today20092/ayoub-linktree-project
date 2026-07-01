import { parse } from 'yaml'

import siteYaml from '../data/site.yaml?raw'

export type SiteInfo = {
  pageTitle: string
  pageDescription: string
  shareTitle: string
  shareDescription: string
  shareText: string
  siteName: string
  profileName: string
  twitterHandle: string
  profileImage: string
  ogImage: string
  ogImageAlt: string
  ogImageWidth: number
  ogImageHeight: number
  ogImageType: string
}

export type SiteFeatures = {
  showTampaWork: boolean
}

export type SocialLink = {
  id: string
  url: string
  icon: string
  label: string
  color: string
  color2: string
  color3: string
  darkColor?: string
  darkColor2?: string
  darkColor3?: string
}

export type ChannelBranding = {
  logoSrc: string
  accentColor: string
  darkAccentColor: string
  cardBackground: string
  darkCardBackground: string
  cardTint: string
  darkCardTint: string
  logoBackgroundColor: string
  darkLogoBackgroundColor?: string
  logoFit?: 'cover' | 'contain'
  logoPaddingClass?: string
}

export type YoutubeChannel = {
  id: string
  channelId: string
  videosUrl: string
  name: string
  description: string
  branding?: ChannelBranding
}

export type FeaturedEpisode = {
  url: string
  category: string
  title?: string
}

export type SocialReachItem = {
  platform: string
  metric: string
  value: number
}

export type SocialReach = {
  updatedAt: string
  items: SocialReachItem[]
}

export type ActionLink = {
  id: string
  label: string
  url: string
  icon: string
  group: 'primary' | 'youtube' | 'support'
  color?: string
  color2?: string
  color3?: string
  darkColor?: string
  darkColor2?: string
  darkColor3?: string
  textColor?: string
  pulse?: boolean
}

export type SiteConfig = {
  site: SiteInfo
  features: SiteFeatures
  socialLinks: SocialLink[]
  actionLinks: ActionLink[]
  youtubeChannels: YoutubeChannel[]
  featuredEpisodes: FeaturedEpisode[]
  socialReach: SocialReach
}

export const siteConfig = parse(siteYaml) as SiteConfig

export const getBaseUrl = (baseUrl: string) =>
  baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`

export const resolveSiteAsset = (baseUrl: string, assetPath: string) => {
  const normalizedBaseUrl = getBaseUrl(baseUrl)
  return `${normalizedBaseUrl}${assetPath.replace(/^\/+/, '')}`
}
