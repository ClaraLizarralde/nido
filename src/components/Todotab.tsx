'use client'

import { useState, useEffect, useMemo } from 'react'
import { Star, Clock, ExternalLink, Trash2, Loader2, FileText, Rss } from 'lucide-react'
import type { Bookmark, Note, FeedItem } from '@/lib/types'
import { createClient } from '@/lib/supabase'
import { getDomain, getFaviconUrl, formatRelativeTime } from '@/lib/utils'

interface TodoTabProps {
  spaceId: string
}

type SpaceItem =
  | { kind: 'bookmark'; date: string; data: Bookmark }
  | { kind: 'note';     date: string; data: Note }
  | { kind: 'feed';     date: string; data: FeedItem }

export default function TodoTab({ spaceId }: TodoTabProps) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [feedItems, setFeedItems] = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => { loadAll() }, [spaceId])

  async function loadAll() {
    setLoading(true)
    const [bRes, nRes, fRes] = await Promise.all([
      supabase.from('bookmarks').select('*').eq('space_id', spaceId).order('created_at', { ascending: false }),
      supabase.from('notes').select('*').eq('space_id', spaceId).order('updated_at', { ascending: false }),
      supabase.from('feed_items').select('*, feed_sources(*)').eq('space_id', spaceId).order('published_at', { ascending: false }).limit(30),
    ])
    setBookmarks(bRes.data || [])
    setNotes(nRes.data || [])
    setFeedItems(fRes.data || [])
    setLoading(false)
  }

  async function toggleFavorite(id: string, current: boolean) {
    await supabase.from('bookmarks').update({ is_favorite: !current }).eq('id', id)
    setBookmarks(prev => prev.map(b => b.id === id ? { ...b, is_favorite: !current } : b))
  }

  async function toggleReadLater(id: string, current: boolean) {
    await supabase.from('bookmarks').update({ is_read_later: !current }).eq('id', id)
    setBookmarks(prev => prev.map(b => b.id === id ? { ...b, is_read_later: !current } : b))
  }

  async function deleteBookmark(id: string) {
    await supabase.from('bookmarks').delete().eq('id', id)
    setBookmarks(prev => prev.filter(b => b.id !== id))
  }

  const allItems = useMemo((): SpaceItem[] => {
    const merged: SpaceItem[] = [
      ...bookmarks.map(b => ({ kind: 'bookmark' as const, date: b.created_at, data: b })),
      ...notes.map(n    => ({ kind: 'note'     as const, date: n.updated_at,  data: n })),
      ...feedItems.map(f => ({ kind: 'feed'    as const, date: f.published_at || f.created_at, data: f })),
    ]
    return merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [bookmarks, notes, feedItems])

  if (loading) {
    return (
      <div className="flex-1 flex justify-center items-center">
        <Loader2 size={20} className="text-text-muted animate-spin" />
      </div>
    )
  }

  if (allItems.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center py-20">
        <div className="text-4xl mb-4">🪴</div>
        <div className="text-text-secondary text-sm mb-1">Este espacio está vacío</div>
        <div className="text-text-muted text-xs">Agregá links, notas o fuentes RSS desde las otras pestañas</div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {allItems.map(item => {
          if (item.kind === 'bookmark') return (
            <BookmarkCard
              key={`b-${item.data.id}`}
              bookmark={item.data}
              onFavorite={() => toggleFavorite(item.data.id, item.data.is_favorite)}
              onReadLater={() => toggleReadLater(item.data.id, item.data.is_read_later)}
              onDelete={() => deleteBookmark(item.data.id)}
            />
          )
          if (item.kind === 'note') return (
            <NoteCard key={`n-${item.data.id}`} note={item.data} />
          )
          if (item.kind === 'feed') return (
            <FeedCard key={`f-${item.data.id}`} item={item.data} />
          )
        })}
      </div>
    </div>
  )
}

// ——— Bookmark card ———

function BookmarkCard({ bookmark: b, onFavorite, onReadLater, onDelete }: {
  bookmark: Bookmark
  onFavorite: () => void
  onReadLater: () => void
  onDelete: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const favicon = getFaviconUrl(b.url)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`group relative bg-bg-surface border rounded-xl overflow-hidden transition-all
        ${b.is_favorite ? 'border-amber-note-border' : 'border-border-subtle hover:border-border-default'}`}
    >
      {b.image_url ? (
        <div className="h-28 overflow-hidden">
          <img src={b.image_url} alt="" className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="h-16 bg-bg-elevated flex items-center justify-center">
          {favicon && <img src={favicon} alt="" className="w-6 h-6 opacity-50" />}
        </div>
      )}

      <div className="p-3">
        <div className="flex items-center gap-1.5 mb-1.5">
          {favicon && <img src={favicon} alt="" className="w-3.5 h-3.5 rounded-sm" />}
          <span className="text-[10px] text-text-muted">{getDomain(b.url)}</span>
        </div>
        <a href={b.url} target="_blank" rel="noopener noreferrer"
          className="block text-sm font-medium text-text-primary hover:text-accent leading-snug mb-1.5 line-clamp-2">
          {b.title}
        </a>
        {b.description && (
          <p className="text-xs text-text-muted line-clamp-2 mb-2 leading-relaxed">{b.description}</p>
        )}
        <div className="flex items-center gap-1.5 flex-wrap">
          {b.tags.slice(0, 3).map(tag => (
            <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-bg-elevated text-text-muted rounded">{tag}</span>
          ))}
          <span className="ml-auto text-[10px] text-text-muted">{formatRelativeTime(b.created_at)}</span>
        </div>
      </div>

      <div className={`absolute top-2 right-2 flex gap-1 transition-opacity ${hovered ? 'opacity-100' : 'opacity-0'}`}>
        <ActionBtn onClick={onFavorite} active={b.is_favorite} title="favorito">
          <Star size={11} fill={b.is_favorite ? 'currentColor' : 'none'} />
        </ActionBtn>
        <ActionBtn onClick={onReadLater} active={b.is_read_later} title="ver después">
          <Clock size={11} />
        </ActionBtn>
        <a href={b.url} target="_blank" rel="noopener noreferrer"
          className="p-1.5 rounded-md bg-bg-base/80 backdrop-blur text-text-muted hover:text-text-primary border border-border-subtle">
          <ExternalLink size={11} />
        </a>
        <ActionBtn onClick={onDelete} title="eliminar" danger>
          <Trash2 size={11} />
        </ActionBtn>
      </div>

      {b.is_read_later && (
        <div className="absolute top-2 left-2 text-[9px] px-1.5 py-0.5 bg-bg-base/80 backdrop-blur text-text-secondary rounded border border-border-subtle">
          ver después
        </div>
      )}
    </div>
  )
}

// ——— Note card ———

function NoteCard({ note }: { note: Note }) {
  const preview = note.content
    .replace(/#{1,6}\s/g, '')   // saca los # de markdown
    .replace(/\*\*/g, '')        // saca negritas
    .replace(/\n/g, ' ')
    .trim()
    .slice(0, 120)

  return (
    <div className="relative bg-amber-note/10 border border-amber-note-border border-l-2 border-l-amber-note rounded-xl p-3 flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        <FileText size={11} className="text-amber-note flex-shrink-0" />
        <span className="text-xs font-medium text-text-primary line-clamp-1">{note.title || 'sin título'}</span>
      </div>
      {preview && (
        <p className="text-xs text-text-muted leading-relaxed line-clamp-3">{preview}</p>
      )}
      <div className="flex items-center gap-1.5 flex-wrap mt-auto">
        {note.tags.slice(0, 3).map(tag => (
          <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-bg-elevated text-text-muted rounded">{tag}</span>
        ))}
        <span className="ml-auto text-[10px] text-text-muted">{formatRelativeTime(note.updated_at)}</span>
      </div>
    </div>
  )
}

// ——— Feed item card ———

function FeedCard({ item }: { item: FeedItem }) {
  const sourceName = item.feed_sources?.name ?? 'feed'
  const favicon = item.feed_sources?.favicon_url

  return (
    <div className="relative bg-bg-surface border border-border-subtle hover:border-border-default rounded-xl overflow-hidden transition-all">
      {item.image_url && (
        <div className="h-24 overflow-hidden">
          <img src={item.image_url} alt="" className="w-full h-full object-cover" />
        </div>
      )}
      <div className="p-3">
        <div className="flex items-center gap-1.5 mb-1.5">
          {favicon
            ? <img src={favicon} alt="" className="w-3.5 h-3.5 rounded-sm" />
            : <Rss size={11} className="text-text-muted" />
          }
          <span className="text-[10px] text-text-muted">{sourceName}</span>
          {!item.is_read && (
            <span className="ml-auto w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
          )}
        </div>
        <a href={item.url} target="_blank" rel="noopener noreferrer"
          className="block text-sm font-medium text-text-primary hover:text-accent leading-snug mb-1.5 line-clamp-2">
          {item.title}
        </a>
        {item.description && (
          <p className="text-xs text-text-muted line-clamp-2 mb-2 leading-relaxed">{item.description}</p>
        )}
        <div className="flex items-center justify-end">
          <span className="text-[10px] text-text-muted">{formatRelativeTime(item.published_at || item.created_at)}</span>
        </div>
      </div>
    </div>
  )
}

// ——— Shared button ———

function ActionBtn({ children, onClick, active, title, danger }: {
  children: React.ReactNode
  onClick: () => void
  active?: boolean
  title?: string
  danger?: boolean
}) {
  return (
    <button onClick={e => { e.preventDefault(); onClick() }} title={title}
      className={`p-1.5 rounded-md bg-bg-base/80 backdrop-blur border border-border-subtle transition-colors
        ${danger ? 'text-text-muted hover:text-red-400'
          : active ? 'text-amber-note' : 'text-text-muted hover:text-text-primary'}`}>
      {children}
    </button>
  )
}