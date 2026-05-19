'use client'

import { useState, useEffect } from 'react'
import { Plus, Rss, RefreshCw, X, Loader2, ExternalLink, Trash2 } from 'lucide-react'
import type { FeedSource, FeedItem } from '@/lib/types'
import { createClient } from '@/lib/supabase'
import { getFaviconUrl, formatRelativeTime } from '@/lib/utils'

interface FeedTabProps {
  spaceId: string
}

export default function FeedTab({ spaceId }: FeedTabProps) {
  const [sources, setSources] = useState<FeedSource[]>([])
  const [items, setItems] = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showAddSource, setShowAddSource] = useState(false)
  const [activeSource, setActiveSource] = useState<string | 'all'>('all')
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [spaceId])

  async function loadData() {
    setLoading(true)
    const [{ data: srcs }, { data: its }] = await Promise.all([
      supabase.from('feed_sources').select('*').eq('space_id', spaceId).order('created_at'),
      supabase.from('feed_items').select('*, feed_sources(name, favicon_url)').eq('space_id', spaceId).order('published_at', { ascending: false }).limit(100)
    ])
    setSources(srcs || [])
    setItems(its || [])
    setLoading(false)
  }

  async function refreshFeeds() {
    setRefreshing(true)
    for (const source of sources) {
      try {
        await fetchAndSaveFeed(source)
      } catch (e) { /* continue */ }
    }
    await loadData()
    setRefreshing(false)
  }

  async function fetchAndSaveFeed(source: FeedSource) {
    const res = await fetch(`/api/feed?url=${encodeURIComponent(source.url)}`)
    const xml = await res.text()

    // Simple XML parser
    const parser = new DOMParser()
    const doc = parser.parseFromString(xml, 'text/xml')
    const entries = Array.from(doc.querySelectorAll('item, entry'))

    const newItems = entries.slice(0, 20).map(entry => {
      const getEl = (names: string[]) => {
        for (const n of names) {
          const el = entry.querySelector(n)
          if (el?.textContent) return el.textContent.trim()
        }
        return ''
      }
      const getAttr = (name: string, attr: string) => entry.querySelector(name)?.getAttribute(attr) || ''

      const link = getAttr('link', 'href') || getEl(['link', 'guid'])
      const pubDate = getEl(['pubDate', 'published', 'updated', 'dc\\:date'])

      return {
        feed_source_id: source.id,
        space_id: spaceId,
        title: getEl(['title']),
        url: link,
        description: getEl(['description', 'summary', 'content']).replace(/<[^>]+>/g, '').slice(0, 300),
        published_at: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
        is_read: false,
      }
    }).filter(i => i.title && i.url)

    if (newItems.length > 0) {
      await supabase.from('feed_items').upsert(newItems, { onConflict: 'url' })
    }
  }

  async function addSource(name: string, url: string, type: FeedSource['type']) {
    const { data } = await supabase.from('feed_sources').insert({
      space_id: spaceId, name, url, type,
      favicon_url: `https://www.google.com/s2/favicons?domain=${new URL(url).origin}&sz=32`
    }).select().single()
    if (data) {
      setSources(prev => [...prev, data])
      await fetchAndSaveFeed(data)
      await loadData()
    }
    setShowAddSource(false)
  }

  async function deleteSource(id: string) {
    await supabase.from('feed_sources').delete().eq('id', id)
    await supabase.from('feed_items').delete().eq('feed_source_id', id)
    setSources(prev => prev.filter(s => s.id !== id))
    setItems(prev => prev.filter(i => i.feed_source_id !== id))
  }

  async function markRead(id: string) {
    await supabase.from('feed_items').update({ is_read: true }).eq('id', id)
    setItems(prev => prev.map(i => i.id === id ? { ...i, is_read: true } : i))
  }

  const filtered = activeSource === 'all' ? items : items.filter(i => i.feed_source_id === activeSource)
  const unreadCount = items.filter(i => !i.is_read).length

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Sources sidebar */}
      <div className="w-44 flex-shrink-0 border-r border-border-subtle flex flex-col overflow-hidden">
        <div className="p-3 border-b border-border-subtle">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-text-muted uppercase tracking-widest font-medium">fuentes</span>
            <button onClick={refreshFeeds} disabled={refreshing}
              className="text-text-muted hover:text-text-secondary disabled:opacity-40">
              <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          <button onClick={() => setActiveSource('all')}
            className={`w-full flex items-center gap-2 px-3 py-2 text-xs transition-all
              ${activeSource === 'all' ? 'text-accent bg-accent-soft' : 'text-text-muted hover:text-text-secondary hover:bg-bg-elevated'}`}>
            <Rss size={11} />
            <span className="flex-1 text-left">todos</span>
            {unreadCount > 0 && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-accent text-white">{unreadCount}</span>}
          </button>

          {sources.map(src => {
            const srcUnread = items.filter(i => i.feed_source_id === src.id && !i.is_read).length
            return (
              <button key={src.id} onClick={() => setActiveSource(src.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-xs group transition-all
                  ${activeSource === src.id ? 'text-accent bg-accent-soft' : 'text-text-muted hover:text-text-secondary hover:bg-bg-elevated'}`}>
                {src.favicon_url
                  ? <img src={src.favicon_url} alt="" className="w-3.5 h-3.5 rounded-sm flex-shrink-0" />
                  : <Rss size={11} className="flex-shrink-0" />
                }
                <span className="flex-1 text-left truncate">{src.name}</span>
                {srcUnread > 0 && <span className="text-[9px] w-4 h-4 flex items-center justify-center rounded-full bg-accent/20 text-accent">{srcUnread}</span>}
                <button onClick={e => { e.stopPropagation(); deleteSource(src.id) }}
                  className="opacity-0 group-hover:opacity-100 hover:text-red-400 ml-1 flex-shrink-0">
                  <X size={10} />
                </button>
              </button>
            )
          })}
        </div>
        <div className="p-2 border-t border-border-subtle">
          <button onClick={() => setShowAddSource(true)}
            className="w-full flex items-center justify-center gap-1.5 text-xs py-2 bg-bg-elevated hover:bg-bg-overlay rounded-lg text-text-muted hover:text-text-secondary border border-border-subtle">
            <Plus size={12} /> agregar feed
          </button>
        </div>
      </div>

      {/* Feed items */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 size={20} className="text-text-muted animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <EmptyFeed onAdd={() => setShowAddSource(true)} hasSources={sources.length > 0} />
        ) : (
          <div className="divide-y divide-border-subtle">
            {filtered.map(item => (
              <FeedItemRow key={item.id} item={item} onRead={() => markRead(item.id)} />
            ))}
          </div>
        )}
      </div>

      {showAddSource && (
        <AddSourceModal onClose={() => setShowAddSource(false)} onAdd={addSource} />
      )}
    </div>
  )
}

function FeedItemRow({ item, onRead }: { item: FeedItem; onRead: () => void }) {
  const source = item.feed_sources as any

  return (
    <div
      className={`flex gap-3 px-5 py-4 hover:bg-bg-elevated transition-all cursor-pointer group
        ${!item.is_read ? '' : 'opacity-60'}`}
      onClick={() => { onRead(); window.open(item.url, '_blank') }}
    >
      {!item.is_read && (
        <div className="w-1.5 h-1.5 rounded-full bg-rss-dot mt-2 flex-shrink-0" />
      )}
      {item.is_read && <div className="w-1.5 flex-shrink-0" />}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          {source?.favicon_url && <img src={source.favicon_url} alt="" className="w-3 h-3 rounded-sm flex-shrink-0" />}
          <span className="text-[10px] text-text-muted">{source?.name}</span>
          <span className="text-[10px] text-text-muted ml-auto flex-shrink-0">{formatRelativeTime(item.published_at)}</span>
        </div>
        <h4 className={`text-sm leading-snug mb-1 ${!item.is_read ? 'text-text-primary font-medium' : 'text-text-secondary'}`}>
          {item.title}
        </h4>
        {item.description && (
          <p className="text-xs text-text-muted line-clamp-2 leading-relaxed">{item.description}</p>
        )}
      </div>

      <ExternalLink size={12} className="text-text-muted opacity-0 group-hover:opacity-100 flex-shrink-0 mt-1" />
    </div>
  )
}

function EmptyFeed({ onAdd, hasSources }: { onAdd: () => void; hasSources: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="text-4xl mb-4">📡</div>
      <div className="text-text-secondary text-sm mb-1">
        {hasSources ? 'Sin artículos por ahora' : 'Sin feeds agregados'}
      </div>
      <div className="text-text-muted text-xs mb-5">
        {hasSources ? 'Refrescá para buscar novedades' : 'Agregá blogs, YouTube, noticias que querés seguir'}
      </div>
      {!hasSources && (
        <button onClick={onAdd}
          className="flex items-center gap-2 text-sm px-4 py-2 bg-accent text-white rounded-lg hover:opacity-90">
          <Plus size={14} /> agregar primer feed
        </button>
      )}
    </div>
  )
}

function AddSourceModal({ onClose, onAdd }: {
  onClose: () => void
  onAdd: (name: string, url: string, type: FeedSource['type']) => void
}) {
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [type, setType] = useState<FeedSource['type']>('rss')
  const [loading, setLoading] = useState(false)

  const EXAMPLES = [
    { name: 'Pitchfork', url: 'https://pitchfork.com/rss/news/feed.json', type: 'rss' as const },
    { name: 'Hacker News', url: 'https://hnrss.org/frontpage', type: 'rss' as const },
    { name: 'NASA', url: 'https://www.nasa.gov/rss/dyn/breaking_news.rss', type: 'rss' as const },
  ]

  async function handleSave() {
    if (!name || !url) return
    setLoading(true)
    await onAdd(name, url, type)
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-bg-surface border border-border-default rounded-2xl w-full max-w-md p-5 animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-serif text-base font-medium text-text-primary">agregar feed</h3>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary"><X size={16} /></button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-text-muted mb-1 block">nombre</label>
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder="ej. Pitchfork, 3Blue1Brown..."
              className="w-full bg-bg-elevated border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent-border" />
          </div>
          <div>
            <label className="text-xs text-text-muted mb-1 block">URL del feed (RSS/Atom)</label>
            <input value={url} onChange={e => setUrl(e.target.value)}
              placeholder="https://..."
              className="w-full bg-bg-elevated border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent-border" />
          </div>
          <div>
            <label className="text-xs text-text-muted mb-1 block">tipo</label>
            <div className="flex gap-2">
              {(['rss', 'youtube', 'blog'] as const).map(t => (
                <button key={t} onClick={() => setType(t)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-all
                    ${type === t ? 'bg-accent-soft border-accent-border text-accent' : 'border-border-subtle text-text-muted hover:text-text-secondary'}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-border-subtle pt-3">
            <div className="text-xs text-text-muted mb-2">ejemplos rápidos</div>
            <div className="flex flex-col gap-1">
              {EXAMPLES.map(ex => (
                <button key={ex.url} onClick={() => { setName(ex.name); setUrl(ex.url); setType(ex.type) }}
                  className="text-left text-xs text-text-muted hover:text-accent px-2 py-1 rounded hover:bg-accent-soft">
                  {ex.name}
                </button>
              ))}
            </div>
          </div>

          <button onClick={handleSave} disabled={!name || !url || loading}
            className="w-full py-2.5 bg-accent text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-2">
            {loading && <Loader2 size={14} className="animate-spin" />}
            {loading ? 'cargando feed...' : 'agregar feed'}
          </button>
        </div>
      </div>
    </div>
  )
}
