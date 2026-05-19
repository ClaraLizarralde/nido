export interface Space {
  id: string
  name: string
  emoji: string
  color?: string
  created_at: string
  order_index: number
}

export interface Bookmark {
  id: string
  space_id: string
  url: string
  title: string
  description?: string
  image_url?: string
  favicon_url?: string
  tags: string[]
  is_favorite: boolean
  is_read_later: boolean
  created_at: string
}

export interface Note {
  id: string
  space_id: string
  title: string
  content: string
  tags: string[]
  created_at: string
  updated_at: string
}

export interface FeedSource {
  id: string
  space_id: string
  name: string
  url: string
  type: 'rss' | 'youtube' | 'blog'
  favicon_url?: string
  created_at: string
}

export interface FeedItem {
  id: string
  feed_source_id: string
  space_id: string
  title: string
  url: string
  description?: string
  image_url?: string
  published_at: string
  is_read: boolean
  created_at: string
  feed_sources?: FeedSource
}

export type TabType = 'feed' | 'bookmarks' | 'notes'
