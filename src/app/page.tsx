'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { LayoutGrid, Rss, BookmarkIcon, FileText, Upload, Loader2, Plus, Link, StickyNote, FolderPlus } from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import BookmarksTab from '@/components/BookmarksTab'
import NotesTab from '@/components/NotesTab'
import FeedTab from '@/components/FeedTab'
import TodoTab from '@/components/TodoTab'
import GlobalSearch from '@/components/GlobalSearch'
import ImportModal from '@/components/ImportModal'
import type { Space, TabType } from '@/lib/types'
import { createClient } from '@/lib/supabase'
import { getDomain, getFaviconUrl, formatRelativeTime } from '@/lib/utils'
import type { Bookmark, Note, FeedItem } from '@/lib/types'

type ExtendedTabType = TabType | 'inicio'

export default function Home() {
  const [spaces, setSpaces] = useState<Space[]>([])
  const [activeSpaceId, setActiveSpaceId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<ExtendedTabType>('todo')
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [showFAB, setShowFAB] = useState(false)
  const [bookmarksKey, setBookmarksKey] = useState(0)
  const [openAddBookmark, setOpenAddBookmark] = useState(false)
  const [openAddNote, setOpenAddNote] = useState(false)
  const fabRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => { loadSpaces() }, [])

  useEffect(() => {
    if (!showFAB) return
    function handleClick(e: MouseEvent) {
      if (fabRef.current && !fabRef.current.contains(e.target as Node)) {
        setShowFAB(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showFAB])

  async function loadSpaces() {
    const { data } = await supabase.from('spaces').select('*').order('order_index')
    if (data && data.length > 0) {
      setSpaces(data)
      setActiveSpaceId('inicio')
    }
    setLoading(false)
  }

  async function addSpace(name: string, emoji: string) {
    const { data } = await supabase.from('spaces').insert({
      name, emoji, order_index: spaces.length
    }).select().single()
    if (data) {
      setSpaces(prev => [...prev, data])
      setActiveSpaceId(data.id)
      setActiveTab('todo')
    }
  }

  async function deleteSpace(id: string) {
    await supabase.from('spaces').delete().eq('id', id)
    setSpaces(prev => prev.filter(s => s.id !== id))
    if (activeSpaceId === id) setActiveSpaceId('inicio')
  }

  async function renameSpace(id: string, name: string, emoji: string) {
    await supabase.from('spaces').update({ name, emoji }).eq('id', id)
    setSpaces(prev => prev.map(s => s.id === id ? { ...s, name, emoji } : s))
  }

  function handleSearchNavigate(spaceId: string, tab: 'bookmarks' | 'notes' | 'feed') {
    setActiveSpaceId(spaceId)
    setActiveTab(tab)
  }

  function handleSelectSpace(id: string | 'inicio') {
    setActiveSpaceId(id)
    if (id !== 'inicio') setActiveTab('todo')
    setSidebarOpen(false)
  }

  function handleFABAction(action: 'link' | 'note' | 'space') {
    setShowFAB(false)
    if (action === 'link') {
      setOpenAddNote(false)
      setOpenAddBookmark(true)
      if (activeSpaceId && activeSpaceId !== 'inicio') setActiveTab('bookmarks')
    } else if (action === 'note') {
      setOpenAddBookmark(false)
      setOpenAddNote(true)
      if (activeSpaceId && activeSpaceId !== 'inicio') setActiveTab('notes')
    } else if (action === 'space') {
      window.dispatchEvent(new CustomEvent('nido:open-add-space'))
    }
  }

  const activeSpace = spaces.find(s => s.id === activeSpaceId)
  const isInicio = activeSpaceId === 'inicio' || !activeSpaceId

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-bg-base">
        <div className="flex flex-col items-center gap-3">
          <div className="font-serif text-2xl text-text-primary">nido</div>
          <Loader2 size={16} className="text-text-muted animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex bg-bg-base">
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <div className={`
        fixed lg:relative z-50 lg:z-auto h-full transition-transform duration-200
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <Sidebar
          spaces={spaces}
          activeSpaceId={activeSpaceId}
          onSelectSpace={handleSelectSpace}
          onAddSpace={addSpace}
          onDeleteSpace={deleteSpace}
          onRenameSpace={renameSpace}
        />
      </div>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="flex-shrink-0 flex items-center gap-2 px-4 lg:px-5 py-3 bg-bg-surface border-b border-border-subtle">
          <button className="lg:hidden text-text-muted hover:text-text-primary mr-1" onClick={() => setSidebarOpen(true)}>
            <svg width="18" height="14" viewBox="0 0 18 14" fill="none">
              <path d="M0 1h18M0 7h18M0 13h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>

          {activeSpace ? (
            <div className="font-serif text-base font-medium text-text-primary flex items-center gap-2 flex-shrink-0">
              <span>{activeSpace.emoji}</span>
              <span className="hidden sm:inline">{activeSpace.name}</span>
            </div>
          ) : (
            <div className="font-serif text-base text-text-primary">🪴 nido</div>
          )}

          {activeSpace && (
            <div className="flex gap-1 ml-3">
              <TabBtn active={activeTab === 'todo'}      onClick={() => setActiveTab('todo')}      icon={<LayoutGrid size={13} />}    label="todo" />
              <TabBtn active={activeTab === 'bookmarks'} onClick={() => setActiveTab('bookmarks')} icon={<BookmarkIcon size={13} />}  label="links" />
              <TabBtn active={activeTab === 'feed'}      onClick={() => setActiveTab('feed')}      icon={<LayoutGrid size={13} />}    label="rss" />
              <TabBtn active={activeTab === 'notes'}     onClick={() => setActiveTab('notes')}     icon={<FileText size={13} />}      label="notas" />
            </div>
          )}

          <div className="ml-auto flex items-center gap-2">
            <GlobalSearch spaces={spaces} onNavigate={handleSearchNavigate} />
            <button
              onClick={() => setShowImport(true)}
              title="importar bookmarks"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-bg-elevated border border-border-subtle rounded-lg text-xs text-text-muted hover:text-text-secondary hover:border-border-default transition-all"
            >
              <Upload size={12} />
              <span className="hidden sm:inline">importar</span>
            </button>
          </div>
        </header>

        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {isInicio ? (
            <InicioTab spaces={spaces} onNavigate={handleSearchNavigate} />
          ) : (
            <>
              {activeTab === 'todo'      && <TodoTab      key={activeSpaceId} spaceId={activeSpaceId!} />}
              {activeTab === 'bookmarks' && <BookmarksTab key={`${activeSpaceId}-${bookmarksKey}`} spaceId={activeSpaceId!} allSpaces={spaces} openAddOnMount={openAddBookmark} />}
              {activeTab === 'feed'      && <FeedTab      key={activeSpaceId} spaceId={activeSpaceId!} allSpaces={null} />}
              {activeTab === 'notes'     && <NotesTab     key={activeSpaceId} spaceId={activeSpaceId!} allSpaces={spaces} openAddOnMount={openAddNote} />}
            </>
          )}
        </div>
      </div>

      {/* FAB */}
      <div ref={fabRef} className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-2">
        {showFAB && (
          <div className="flex flex-col items-end gap-2 mb-2 animate-slide-up">
            <FABOption
              icon={<FolderPlus size={15} />}
              label="nuevo espacio"
              onClick={() => handleFABAction('space')}
            />
            <FABOption
              icon={<StickyNote size={15} />}
              label="nueva nota"
              onClick={() => handleFABAction('note')}
              disabled={isInicio}
            />
            <FABOption
              icon={<Link size={15} />}
              label="nuevo link"
              onClick={() => handleFABAction('link')}
              disabled={isInicio}
            />
          </div>
        )}
        <button
          onClick={() => setShowFAB(v => !v)}
          className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all
            ${showFAB
              ? 'bg-bg-elevated border border-border-default text-text-muted rotate-45'
              : 'bg-accent text-white hover:opacity-90'
            }`}
        >
          <Plus size={22} />
        </button>
      </div>

      {showImport && (
        <ImportModal
          spaces={spaces}
          onClose={() => setShowImport(false)}
          onImported={() => {
            setShowImport(false)
            if (activeSpaceId && activeSpaceId !== 'inicio') {
              setActiveTab('bookmarks')
              setBookmarksKey(k => k + 1)
            } else if (spaces.length > 0) {
              setActiveSpaceId(spaces[0].id)
              setActiveTab('bookmarks')
              setBookmarksKey(k => k + 1)
            }
          }}
        />
      )}
    </div>
  )
}

// ─── InicioTab ────────────────────────────────────────────────────────────────

function InicioTab({ spaces, onNavigate }: {
  spaces: Space[]
  onNavigate: (spaceId: string, tab: 'bookmarks' | 'notes' | 'feed') => void
}) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [feedItems, setFeedItems] = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [bRes, nRes, fRes] = await Promise.all([
        supabase.from('bookmarks').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('notes').select('*').order('updated_at', { ascending: false }).limit(20),
        supabase.from('feed_items').select('*, feed_sources(*)').order('published_at', { ascending: false }).limit(20),
      ])
      setBookmarks(bRes.data || [])
      setNotes(nRes.data || [])
      setFeedItems(fRes.data || [])
      setLoading(false)
    }
    load()
  }, [])

  const spaceMap = useMemo(
    () => Object.fromEntries(spaces.map(s => [s.id, s])),
    [spaces]
  )

  const allItems = useMemo(() => {
    const merged = [
      ...bookmarks.map(b => ({ kind: 'bookmark' as const, date: b.created_at, data: b, space: spaceMap[b.space_id] })),
      ...notes.map(n => ({ kind: 'note' as const, date: n.updated_at, data: n, space: spaceMap[n.space_id] })),
      ...feedItems.map(f => ({ kind: 'feed' as const, date: f.published_at || f.created_at, data: f, space: spaceMap[f.space_id] })),
    ]
    return merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [bookmarks, notes, feedItems, spaceMap])

  if (loading) return (
    <div className="flex-1 flex justify-center items-center">
      <Loader2 size={20} className="text-text-muted animate-spin" />
    </div>
  )

  if (spaces.length === 0) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center max-w-xs">
        <div className="text-5xl mb-4">🪴</div>
        <div className="font-serif text-lg text-text-primary mb-2">bienvenida a nido</div>
        <div className="text-text-muted text-sm leading-relaxed">Creá tu primer espacio desde el panel izquierdo.</div>
      </div>
    </div>
  )

  if (allItems.length === 0) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center max-w-xs">
        <div className="text-5xl mb-4">🌱</div>
        <div className="font-serif text-lg text-text-primary mb-2">nido está vacío</div>
        <div className="text-text-muted text-sm leading-relaxed">Entrá a un espacio y empezá a guardar links, notas o feeds.</div>
      </div>
    </div>
  )

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="sticky top-0 z-10 bg-bg-base border-b border-border-subtle px-5 py-2.5">
        <span className="text-xs text-text-muted">{allItems.length} items recientes · todos los espacios</span>
      </div>
      <div className="p-5 flex flex-col divide-y divide-border-subtle">
        {allItems.map(item => {
          const space = item.space
          if (item.kind === 'bookmark') {
            const b = item.data
            const favicon = getFaviconUrl(b.url)
            return (
              <div key={`b-${b.id}`} className="flex items-center gap-3 py-2.5 hover:bg-bg-elevated/50 rounded-lg px-1 group transition-colors">
                <div className="w-6 h-6 rounded-md bg-bg-elevated flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {favicon ? <img src={favicon} alt="" className="w-4 h-4" /> : <span className="text-[9px] text-text-muted">🔗</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <a href={b.url} target="_blank" rel="noopener noreferrer" className="text-sm text-text-primary hover:text-accent font-medium truncate block leading-snug">{b.title}</a>
                  <span className="text-[10px] text-text-muted truncate">{getDomain(b.url)}</span>
                </div>
                {space && (
                  <button onClick={() => onNavigate(space.id, 'bookmarks')} className="flex items-center gap-1 text-[10px] text-text-muted hover:text-accent flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span>{space.emoji}</span><span className="hidden sm:inline">{space.name}</span>
                  </button>
                )}
                <span className="text-[10px] text-text-muted flex-shrink-0">{formatRelativeTime(b.created_at)}</span>
              </div>
            )
          }
          if (item.kind === 'note') {
            const n = item.data
            return (
              <div key={`n-${n.id}`} className="flex items-center gap-3 py-2.5 hover:bg-bg-elevated/50 rounded-lg px-1 group transition-colors">
                <div className="w-6 h-6 rounded-md bg-amber-note-bg flex items-center justify-center flex-shrink-0">
                  <span className="text-[10px]">📝</span>
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-text-primary font-medium truncate block leading-snug">{n.title || 'sin título'}</span>
                  {n.content && <p className="text-[10px] text-text-muted truncate">{n.content.replace(/#{1,6}\s|(\*\*|\*)/g, '').slice(0, 80)}</p>}
                </div>
                {space && (
                  <button onClick={() => onNavigate(space.id, 'notes')} className="flex items-center gap-1 text-[10px] text-text-muted hover:text-accent flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span>{space.emoji}</span><span className="hidden sm:inline">{space.name}</span>
                  </button>
                )}
                <span className="text-[10px] text-text-muted flex-shrink-0">{formatRelativeTime(n.updated_at)}</span>
              </div>
            )
          }
          if (item.kind === 'feed') {
            const f = item.data
            const src = (f as any).feed_sources
            return (
              <div key={`f-${f.id}`} className="flex items-center gap-3 py-2.5 hover:bg-bg-elevated/50 rounded-lg px-1 group transition-colors">
                <div className="w-6 h-6 rounded-md bg-bg-elevated flex items-center justify-center flex-shrink-0">
                  {src?.favicon_url ? <img src={src.favicon_url} alt="" className="w-4 h-4 rounded-sm" /> : <span className="text-[9px] text-rss-dot">●</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <a href={f.url} target="_blank" rel="noopener noreferrer" className="text-sm text-text-primary hover:text-accent font-medium truncate block leading-snug">{f.title}</a>
                  <span className="text-[10px] text-text-muted">{src?.name}</span>
                </div>
                {space && (
                  <button onClick={() => onNavigate(space.id, 'feed')} className="flex items-center gap-1 text-[10px] text-text-muted hover:text-accent flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span>{space.emoji}</span><span className="hidden sm:inline">{space.name}</span>
                  </button>
                )}
                <span className="text-[10px] text-text-muted flex-shrink-0">{formatRelativeTime(f.published_at || f.created_at)}</span>
              </div>
            )
          }
        })}
      </div>
    </div>
  )
}

// ─── Componentes auxiliares ───────────────────────────────────────────────────

function TabBtn({ active, onClick, icon, label }: {
  active: boolean; onClick: () => void; icon: React.ReactNode; label: string
}) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all
        ${active
          ? 'bg-accent-soft text-accent font-medium border border-accent-border'
          : 'text-text-muted hover:text-text-secondary hover:bg-bg-elevated border border-transparent'
        }`}>
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}

function FABOption({ icon, label, onClick, disabled }: {
  icon: React.ReactNode; label: string; onClick: () => void; disabled?: boolean
}) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl shadow-lg border text-sm font-medium transition-all
        ${disabled
          ? 'bg-bg-elevated border-border-subtle text-text-muted opacity-40 cursor-not-allowed'
          : 'bg-bg-surface border-border-default text-text-primary hover:border-accent-border hover:text-accent'
        }`}
    >
      <span className="text-text-muted">{icon}</span>
      {label}
    </button>
  )
}