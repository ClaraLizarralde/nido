'use client'

import { useState, useEffect } from 'react'
import { Plus, Star, Clock, Tag, X, ExternalLink, Loader2, Trash2 } from 'lucide-react'
import type { Bookmark, Space } from '@/lib/types'
import { createClient } from '@/lib/supabase'
import { fetchUrlMetadata, getDomain, getFaviconUrl, formatRelativeTime } from '@/lib/utils'

interface BookmarksTabProps {
  spaceId: string | null
  allSpaces: Space[] | null
}

export default function BookmarksTab({ spaceId, allSpaces }: BookmarksTabProps) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [filter, setFilter] = useState<'all' | 'favorites' | 'read-later'>('all')
  const [searchTag, setSearchTag] = useState('')
  const supabase = createClient()

  useEffect(() => {
    loadBookmarks()
  }, [spaceId])

  async function loadBookmarks() {
    setLoading(true)
    let query = supabase.from('bookmarks').select('*').order('created_at', { ascending: false })
    if (spaceId) {
      query = query.eq('space_id', spaceId)
    }
    const { data } = await query
    setBookmarks(data || [])
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

  const filtered = bookmarks.filter(b => {
    if (filter === 'favorites' && !b.is_favorite) return false
    if (filter === 'read-later' && !b.is_read_later) return false
    if (searchTag && !b.tags.some(t => t.toLowerCase().includes(searchTag.toLowerCase()))) return false
    return true
  })

  const allTags = Array.from(new Set(bookmarks.flatMap(b => b.tags)))

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="sticky top-0 z-10 bg-bg-base border-b border-border-subtle px-5 py-3 flex items-center gap-3 flex-wrap">
        <div className="flex gap-1">
          {(['all', 'favorites', 'read-later'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1.5 rounded-md transition-all
                ${filter === f ? 'bg-accent-soft text-accent' : 'text-text-muted hover:text-text-secondary'}`}>
              {f === 'all' ? 'todos' : f === 'favorites' ? '★ favoritos' : '⏱ ver después'}
            </button>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap">
          {allTags.slice(0, 6).map(tag => (
            <button key={tag} onClick={() => setSearchTag(searchTag === tag ? '' : tag)}
              className={`text-xs px-2 py-0.5 rounded flex items-center gap-1 transition-all
                ${searchTag === tag ? 'bg-accent-soft text-accent' : 'bg-bg-elevated text-text-muted hover:text-text-secondary'}`}>
              <Tag size={9} />
              {tag}
            </button>
          ))}
        </div>
        {spaceId && (
          <button onClick={() => setShowAdd(true)}
            className="ml-auto flex items-center gap-1.5 text-xs px-3 py-1.5 bg-accent text-white rounded-lg hover:opacity-90 font-medium">
            <Plus size={13} />
            agregar link
          </button>
        )}
      </div>

      <div className="p-5">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 size={20} className="text-text-muted animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <EmptyState onAdd={spaceId ? () => setShowAdd(true) : null} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map(b => (
              <BookmarkCard
                key={b.id}
                bookmark={b}
                spaceName={allSpaces ? allSpaces.find(s => s.id === b.space_id)?.name : undefined}
                onFavorite={() => toggleFavorite(b.id, b.is_favorite)}
                onReadLater={() => toggleReadLater(b.id, b.is_read_later)}
                onDelete={() => deleteBookmark(b.id)}
              />
            ))}
          </div>
        )}
      </div>

      {showAdd && spaceId && (
        <AddBookmarkModal
          spaceId={spaceId}
          onClose={() => setShowAdd(false)}
          onAdded={(b) => { setBookmarks(prev => [b, ...prev]); setShowAdd(false) }}
        />
      )}
    </div>
  )
}

function BookmarkCard({ bookmark: b, spaceName, onFavorite, onReadLater, onDelete }: {
  bookmark: Bookmark
  spaceName?: string
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
      className={`group relative bg-bg-surface border rounded-xl overflow-hidden cursor-pointer transition-all
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
          {spaceName && (
            <span className="ml-auto text-[10px] px-1.5 py-0.5 bg-bg-elevated text-text-muted rounded">{spaceName}</span>
          )}
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
            <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-bg-elevated text-text-muted rounded">
              {tag}
            </span>
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

function EmptyState({ onAdd }: { onAdd: (() => void) | null }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="text-4xl mb-4">🔖</div>
      <div className="text-text-secondary text-sm mb-1">Sin links guardados</div>
      <div className="text-text-muted text-xs mb-5">Guardá links de lo que encontrás por internet</div>
      {onAdd && (
        <button onClick={onAdd}
          className="flex items-center gap-2 text-sm px-4 py-2 bg-accent text-white rounded-lg hover:opacity-90">
          <Plus size={14} /> agregar primer link
        </button>
      )}
    </div>
  )
}

function AddBookmarkModal({ spaceId, onClose, onAdded }: {
  spaceId: string
  onClose: () => void
  onAdded: (b: Bookmark) => void
}) {
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [image, setImage] = useState('')
  const [tags, setTags] = useState('')
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(false)
  const supabase = createClient()

  async function handleUrlBlur() {
    if (!url) return
    setFetching(true)
    const meta = await fetchUrlMetadata(url)
    if (meta) {
      if (meta.title) setTitle(meta.title)
      if (meta.description) setDescription(meta.description)
      if (meta.image) setImage(meta.image)
    }
    setFetching(false)
  }

  async function handleSave() {
    if (!url || !title) return
    setLoading(true)
    const tagArray = tags.split(',').map(t => t.trim()).filter(Boolean)
    const { data } = await supabase.from('bookmarks').insert({
      space_id: spaceId,
      url, title, description,
      ima