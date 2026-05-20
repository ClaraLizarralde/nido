'use client'

import { useState, useEffect, useRef } from 'react'
import { Plus, Star, Clock, Tag, X, ExternalLink, Loader2, Trash2, FolderInput, LayoutGrid, List } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import type { Bookmark, Space } from '@/lib/types'
import { createClient } from '@/lib/supabase'
import { fetchUrlMetadata, getDomain, getFaviconUrl, formatRelativeTime } from '@/lib/utils'

interface BookmarksTabProps {
  spaceId: string | null
  allSpaces: Space[] | null
  openAddOnMount?: boolean
}

export default function BookmarksTab({ spaceId, allSpaces, openAddOnMount }: BookmarksTabProps) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [orderedBookmarks, setOrderedBookmarks] = useState<Bookmark[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [filter, setFilter] = useState<'all' | 'favorites' | 'read-later'>('all')
  const [searchTag, setSearchTag] = useState('')
  const [viewMode, setViewMode] = useState<'card' | 'list'>('list')
  const supabase = createClient()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  )

  useEffect(() => { loadBookmarks() }, [spaceId])

  // BUG FIX: escuchar el evento del FAB para abrir el modal de agregar
 useEffect(() => {
  if (openAddOnMount) setShowAdd(true)
}, [openAddOnMount])

  // Sincronizar orderedBookmarks cuando cambian los bookmarks
  useEffect(() => { setOrderedBookmarks(bookmarks) }, [bookmarks])

  async function loadBookmarks() {
    setLoading(true)
    let query = supabase.from('bookmarks').select('*').order('order_index', { ascending: true, nullsFirst: false })
    if (spaceId) query = query.eq('space_id', spaceId)
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

  async function moveBookmark(id: string, targetSpaceId: string) {
    await supabase.from('bookmarks').update({ space_id: targetSpaceId }).eq('id', id)
    setBookmarks(prev => prev.filter(b => b.id !== id))
  }

  // BUG FIX: drag & drop para la vista lista
  async function handleDragEnd(event: DragEndEvent) {
  const { active, over } = event
  if (!over || active.id === over.id) return
  const oldIndex = orderedBookmarks.findIndex(b => b.id === active.id)
  const newIndex = orderedBookmarks.findIndex(b => b.id === over.id)
  const reordered = arrayMove(orderedBookmarks, oldIndex, newIndex)
  setOrderedBookmarks(reordered)

  // Persistir en Supabase
  await Promise.all(
    reordered.map((b, index) =>
      supabase.from('bookmarks').update({ order_index: index }).eq('id', b.id)
    )
  )
}

  const displayBookmarks = orderedBookmarks.length > 0 ? orderedBookmarks : bookmarks

  const filtered = displayBookmarks.filter(b => {
    if (filter === 'favorites' && !b.is_favorite) return false
    if (filter === 'read-later' && !b.is_read_later) return false
    if (searchTag && !b.tags.some(t => t.toLowerCase().includes(searchTag.toLowerCase()))) return false
    return true
  })

  const allTags = Array.from(new Set(bookmarks.flatMap(b => b.tags)))
  const otherSpaces = (allSpaces || []).filter(s => s.id !== spaceId)

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

        {/* toggle de vista */}
        <div className="flex gap-0.5 ml-auto bg-bg-elevated rounded-lg p-0.5">
          <button onClick={() => setViewMode('card')}
            className={`p-1.5 rounded-md transition-all ${viewMode === 'card' ? 'bg-bg-surface text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
            title="vista cards">
            <LayoutGrid size={13} />
          </button>
          <button onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-bg-surface text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
            title="vista lista">
            <List size={13} />
          </button>
        </div>

        {spaceId && (
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-accent text-white rounded-lg hover:opacity-90 font-medium">
            <Plus size={13} /> agregar link
          </button>
        )}
      </div>

      <div className="p-5">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 size={20} className="text-text-muted animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <EmptyState onAdd={spaceId ? () => setShowAdd(true) : null} />
        ) : viewMode === 'card' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map(b => (
              <BookmarkCard
                key={b.id}
                bookmark={b}
                otherSpaces={otherSpaces}
                onFavorite={() => toggleFavorite(b.id, b.is_favorite)}
                onReadLater={() => toggleReadLater(b.id, b.is_read_later)}
                onDelete={() => deleteBookmark(b.id)}
                onMove={(targetId) => moveBookmark(b.id, targetId)}
              />
            ))}
          </div>
        ) : (
          // BUG FIX: vista lista con drag & drop (igual que NotesTab)
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={filtered.map(b => b.id)} strategy={verticalListSortingStrategy}>
              <div className="flex flex-col divide-y divide-border-subtle">
                {filtered.map(b => (
                  <SortableBookmarkRow
                    key={b.id}
                    bookmark={b}
                    otherSpaces={otherSpaces}
                    onFavorite={() => toggleFavorite(b.id, b.is_favorite)}
                    onReadLater={() => toggleReadLater(b.id, b.is_read_later)}
                    onDelete={() => deleteBookmark(b.id)}
                    onMove={(targetId) => moveBookmark(b.id, targetId)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
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

// ─── Fila sortable (BUG FIX: drag & drop para links) ─────────────────────────

function SortableBookmarkRow({ bookmark: b, otherSpaces, onFavorite, onReadLater, onDelete, onMove }: {
  bookmark: Bookmark
  otherSpaces: Space[]
  onFavorite: () => void
  onReadLater: () => void
  onDelete: () => void
  onMove: (targetSpaceId: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: b.id })
  const [hovered, setHovered] = useState(false)
  const [showMove, setShowMove] = useState(false)
  const moveRef = useRef<HTMLDivElement>(null)
  const favicon = getFaviconUrl(b.url)

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  useEffect(() => {
    if (!showMove) return
    function handleClick(e: MouseEvent) {
      if (moveRef.current && !moveRef.current.contains(e.target as Node)) {
        setShowMove(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showMove])

  return (
    <div
      ref={setNodeRef}
      style={style}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setShowMove(false) }}
      className={`group flex items-center gap-3 py-2.5 px-1 transition-colors
        ${b.is_favorite ? 'bg-amber-note-border/10' : 'hover:bg-bg-elevated/50'}`}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="text-text-muted/30 hover:text-text-muted cursor-grab active:cursor-grabbing touch-none shrink-0"
        tabIndex={-1}
        aria-label="arrastrar"
      >
        <svg width="12" height="14" viewBox="0 0 12 14" fill="currentColor">
          <circle cx="3" cy="2.5" r="1.2"/><circle cx="9" cy="2.5" r="1.2"/>
          <circle cx="3" cy="7"   r="1.2"/><circle cx="9" cy="7"   r="1.2"/>
          <circle cx="3" cy="11.5" r="1.2"/><circle cx="9" cy="11.5" r="1.2"/>
        </svg>
      </button>

      {/* favicon */}
      <div className="w-7 h-7 rounded-md bg-bg-elevated flex items-center justify-center flex-shrink-0 overflow-hidden">
        {favicon
          ? <img src={favicon} alt="" className="w-4 h-4" />
          : <span className="text-[10px] text-text-muted">{getDomain(b.url).charAt(0).toUpperCase()}</span>
        }
      </div>

      {/* título + meta */}
      <div className="flex-1 min-w-0">
        <a href={b.url} target="_blank" rel="noopener noreferrer"
          className="text-sm text-text-primary hover:text-accent font-medium truncate block leading-snug">
          {b.title}
        </a>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-text-muted truncate">{getDomain(b.url)}</span>
          {b.tags.slice(0, 3).map(tag => (
            <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-bg-elevated text-text-muted rounded hidden sm:inline">{tag}</span>
          ))}
          {b.is_read_later && (
            <span className="text-[9px] px-1.5 py-0.5 border border-border-subtle text-text-muted rounded">ver después</span>
          )}
        </div>
      </div>

      {/* fecha */}
      <span className="text-[10px] text-text-muted flex-shrink-0 hidden sm:block">{formatRelativeTime(b.created_at)}</span>

      {/* acciones */}
      <div className={`flex gap-1 flex-shrink-0 transition-opacity ${hovered ? 'opacity-100' : 'opacity-0'}`}>
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
        {otherSpaces.length > 0 && (
          <div className="relative" ref={moveRef}>
            <ActionBtn onClick={() => setShowMove(v => !v)} title="mover a...">
              <FolderInput size={11} />
            </ActionBtn>
            {showMove && (
              <div className="absolute top-7 right-0 z-20 bg-bg-surface border border-border-default rounded-xl shadow-lg py-1.5 w-44">
                <div className="text-[10px] text-text-muted px-3 py-1 border-b border-border-subtle mb-1">mover a...</div>
                {otherSpaces.map(space => (
                  <button key={space.id}
                    onClick={() => { onMove(space.id); setShowMove(false) }}
                    className="w-full text-left flex items-center gap-2 px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-elevated transition-colors">
                    <span>{space.emoji}</span>
                    <span>{space.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        <ActionBtn onClick={onDelete} title="eliminar" danger>
          <Trash2 size={11} />
        </ActionBtn>
      </div>
    </div>
  )
}

// ─── Modo card ────────────────────────────────────────────────────────────────

function BookmarkCard({ bookmark: b, otherSpaces, onFavorite, onReadLater, onDelete, onMove }: {
  bookmark: Bookmark
  otherSpaces: Space[]
  onFavorite: () => void
  onReadLater: () => void
  onDelete: () => void
  onMove: (targetSpaceId: string) => void
}) {
  const [hovered, setHovered] = useState(false)
  const [showMove, setShowMove] = useState(false)
  const moveRef = useRef<HTMLDivElement>(null)
  const favicon = getFaviconUrl(b.url)

  useEffect(() => {
    if (!showMove) return
    function handleClick(e: MouseEvent) {
      if (moveRef.current && !moveRef.current.contains(e.target as Node)) {
        setShowMove(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showMove])

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setShowMove(false) }}
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
        {otherSpaces.length > 0 && (
          <div className="relative" ref={moveRef}>
            <ActionBtn onClick={() => setShowMove(v => !v)} title="mover a...">
              <FolderInput size={11} />
            </ActionBtn>
            {showMove && (
              <div className="absolute top-7 right-0 z-20 bg-bg-surface border border-border-default rounded-xl shadow-lg py-1.5 w-44">
                <div className="text-[10px] text-text-muted px-3 py-1 border-b border-border-subtle mb-1">mover a...</div>
                {otherSpaces.map(space => (
                  <button key={space.id}
                    onClick={() => { onMove(space.id); setShowMove(false) }}
                    className="w-full text-left flex items-center gap-2 px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-elevated transition-colors">
                    <span>{space.emoji}</span>
                    <span>{space.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
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

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ onAdd }: { onAdd: (() => void) | null }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="text-4xl mb-4">🔗</div>
      <div className="text-text-secondary text-sm mb-1">Sin links guardados</div>
      <div className="text-text-muted text-xs mb-5">Guardá artículos, herramientas, referencias</div>
      {onAdd && (
        <button onClick={onAdd}
          className="flex items-center gap-2 text-sm px-4 py-2 bg-accent text-white rounded-lg hover:opacity-90">
          <Plus size={14} /> agregar primer link
        </button>
      )}
    </div>
  )
}

// ─── Shared ActionBtn ─────────────────────────────────────────────────────────

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

// ─── Add Bookmark Modal ───────────────────────────────────────────────────────

function AddBookmarkModal({ spaceId, onClose, onAdded }: {
  spaceId: string
  onClose: () => void
  onAdded: (b: Bookmark) => void
}) {
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState('')
  const [isFavorite, setIsFavorite] = useState(false)
  const [isReadLater, setIsReadLater] = useState(false)
  const [loadingMeta, setLoadingMeta] = useState(false)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  async function handleUrlBlur() {
    if (!url || !url.startsWith('http')) return
    setLoadingMeta(true)
    const meta = await fetchUrlMetadata(url)
    if (meta) {
      if (meta.title) setTitle(meta.title)
      if (meta.description) setDescription(meta.description)
    }
    setLoadingMeta(false)
  }

  async function handleSave() {
    if (!url || !title) return
    setSaving(true)
    const tagArray = tags.split(',').map(t => t.trim()).filter(Boolean)
    const favicon = getFaviconUrl(url)
    const { data, error } = await supabase.from('bookmarks').insert({
      space_id: spaceId,
      url, title, description,
      favicon_url: favicon,
      tags: tagArray,
      is_favorite: isFavorite,
      is_read_later: isReadLater,
    }).select().single()
    setSaving(false)
    if (data) onAdded(data)
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="bg-bg-surface border border-border-default rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border-subtle">
          <h3 className="font-serif text-base font-medium text-text-primary">agregar link</h3>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary"><X size={16} /></button>
        </div>

        <div className="px-5 py-4 space-y-3">
          <div>
            <label className="text-xs text-text-muted mb-1.5 block">URL</label>
            <input
              autoFocus
              value={url}
              onChange={e => setUrl(e.target.value)}
              onBlur={handleUrlBlur}
              placeholder="https://..."
              className="w-full bg-bg-elevated border border-border-subtle rounded-xl px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent-border"
            />
          </div>

          <div>
            <label className="text-xs text-text-muted mb-1.5 block flex items-center gap-2">
              título
              {loadingMeta && <Loader2 size={11} className="animate-spin" />}
            </label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              placeholder="se autocompleta con la URL"
              className="w-full bg-bg-elevated border border-border-subtle rounded-xl px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent-border" />
          </div>

          <div>
            <label className="text-xs text-text-muted mb-1.5 block">descripción</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
              className="w-full bg-bg-elevated border border-border-subtle rounded-xl px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent-border" />
          </div>

          <div>
            <label className="text-xs text-text-muted mb-1.5 block">tags (separados por coma)</label>
            <input value={tags} onChange={e => setTags(e.target.value)}
              placeholder="diseño, referencia..."
              className="w-full bg-bg-elevated border border-border-subtle rounded-xl px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent-border" />
          </div>

          <div className="flex gap-3">
            <button onClick={() => setIsFavorite(!isFavorite)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm transition-all
                ${isFavorite ? 'bg-amber-note-bg border-amber-note-border text-amber-note' : 'bg-bg-elevated border-border-subtle text-text-muted'}`}>
              ★ favorito
            </button>
            <button onClick={() => setIsReadLater(!isReadLater)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm transition-all
                ${isReadLater ? 'bg-accent-soft border-accent-border text-accent' : 'bg-bg-elevated border-border-subtle text-text-muted'}`}>
              ⏱ ver después
            </button>
          </div>
        </div>

        <div className="px-5 pb-5">
          <button onClick={handleSave} disabled={!title || !url || saving}
            className="w-full py-3.5 bg-accent text-white rounded-xl font-medium text-sm hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-2">
            {saving ? <Loader2 size={16} className="animate-spin" /> : null}
            {saving ? 'guardando...' : 'guardar en nido'}
          </button>
        </div>
      </div>
    </div>
  )
}