'use client'

import { useState, useEffect } from 'react'
import { Plus, Star, Clock, Tag, X, ExternalLink, Loader2, Trash2 } from 'lucide-react'
import type { Bookmark } from '@/lib/types'
import { createClient } from '@/lib/supabase'
import { fetchUrlMetadata, getDomain, getFaviconUrl, formatRelativeTime } from '@/lib/utils'

interface BookmarksTabProps {
  spaceId: string
}

export default function BookmarksTab({ spaceId }: BookmarksTabProps) {
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
    const { data } = await supabase
      .from('bookmarks')
      .select('*')
      .eq('space_id', spaceId)
      .order('created_at', { ascending: false })
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

  const allTags = [...new Set(bookmarks.flatMap(b => b.tags))]

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Toolbar */}
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
        <button onClick={() => setShowAdd(true)}
          className="ml-auto flex items-center gap-1.5 text-xs px-3 py-1.5 bg-accent text-white rounded-lg hover:opacity-90 font-medium">
          <Plus size={13} />
          agregar link
        </button>
      </div>

      <div className="p-5">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 size={20} className="text-text-muted animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <EmptyState onAdd={() => setShowAdd(true)} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map(b => (
              <BookmarkCard
                key={b.id}
                bookmark={b}
                onFavorite={() => toggleFavorite(b.id, b.is_favorite)}
                onReadLater={() => toggleReadLater(b.id, b.is_read_later)}
                onDelete={() => deleteBookmark(b.id)}
              />
            ))}
          </div>
        )}
      </div>

      {showAdd && (
        <AddBookmarkModal
          spaceId={spaceId}
          onClose={() => setShowAdd(false)}
          onAdded={(b) => { setBookmarks(prev => [b, ...prev]); setShowAdd(false) }}
        />
      )}
    </div>
  )
}

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
      className={`group relative bg-bg-surface border rounded-xl overflow-hidden cursor-pointer transition-all
        ${b.is_favorite ? 'border-amber-note-border' : 'border-border-subtle hover:border-border-default'}`}
    >
      {/* Image / placeholder */}
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
        {/* Domain */}
        <div className="flex items-center gap-1.5 mb-1.5">
          {favicon && <img src={favicon} alt="" className="w-3.5 h-3.5 rounded-sm" />}
          <span className="text-[10px] text-text-muted">{getDomain(b.url)}</span>
        </div>

        {/* Title */}
        <a href={b.url} target="_blank" rel="noopener noreferrer"
          className="block text-sm font-medium text-text-primary hover:text-accent leading-snug mb-1.5 line-clamp-2">
          {b.title}
        </a>

        {/* Description */}
        {b.description && (
          <p className="text-xs text-text-muted line-clamp-2 mb-2 leading-relaxed">{b.description}</p>
        )}

        {/* Tags + time */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {b.tags.slice(0, 3).map(tag => (
            <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-bg-elevated text-text-muted rounded">
              {tag}
            </span>
          ))}
          <span className="ml-auto text-[10px] text-text-muted">{formatRelativeTime(b.created_at)}</span>
        </div>
      </div>

      {/* Actions overlay */}
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

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="text-4xl mb-4">🔖</div>
      <div className="text-text-secondary text-sm mb-1">Sin links guardados</div>
      <div className="text-text-muted text-xs mb-5">Guardá links de lo que encontrás por internet</div>
      <button onClick={onAdd}
        className="flex items-center gap-2 text-sm px-4 py-2 bg-accent text-white rounded-lg hover:opacity-90">
        <Plus size={14} /> agregar primer link
      </button>
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
    const { data, error } = await supabase.from('bookmarks').insert({
      space_id: spaceId,
      url,
      title,
      description,
      image_url: image || null,
      tags: tagArray,
      is_favorite: false,
      is_read_later: false,
    }).select().single()

    if (data) onAdded(data)
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-bg-surface border border-border-default rounded-2xl w-full max-w-md p-5 animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-serif text-base font-medium text-text-primary">agregar link</h3>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary"><X size={16} /></button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-text-muted mb-1 block">URL</label>
            <input value={url} onChange={e => setUrl(e.target.value)} onBlur={handleUrlBlur}
              placeholder="https://..."
              className="w-full bg-bg-elevated border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent-border" />
          </div>

          {fetching && <div className="flex items-center gap-2 text-xs text-text-muted"><Loader2 size={12} className="animate-spin" /> obteniendo info...</div>}

          {image && <img src={image} alt="" className="w-full h-32 object-cover rounded-lg border border-border-subtle" />}

          <div>
            <label className="text-xs text-text-muted mb-1 block">título</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              placeholder="título del link"
              className="w-full bg-bg-elevated border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent-border" />
          </div>

          <div>
            <label className="text-xs text-text-muted mb-1 block">descripción (opcional)</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
              placeholder="breve descripción..."
              className="w-full bg-bg-elevated border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent-border" />
          </div>

          <div>
            <label className="text-xs text-text-muted mb-1 block">tags (separados por coma)</label>
            <input value={tags} onChange={e => setTags(e.target.value)}
              placeholder="diseño, referencia, tool..."
              className="w-full bg-bg-elevated border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent-border" />
          </div>

          <button onClick={handleSave} disabled={!url || !title || loading}
            className="w-full py-2.5 bg-accent text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-2">
            {loading && <Loader2 size={14} className="animate-spin" />}
            guardar link
          </button>
        </div>
      </div>
    </div>
  )
}
