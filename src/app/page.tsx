'use client'

import { useState, useEffect } from 'react'
import { LayoutGrid, Rss, Bookmark, FileText, Upload, Loader2 } from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import BookmarksTab from '@/components/BookmarksTab'
import NotesTab from '@/components/NotesTab'
import FeedTab from '@/components/FeedTab'
import TodoTab from '@/components/TodoTab'
import GlobalSearch from '@/components/GlobalSearch'
import ImportModal from '@/components/ImportModal'
import type { Space, TabType } from '@/lib/types'
import { createClient } from '@/lib/supabase'

export default function Home() {
  const [spaces, setSpaces] = useState<Space[]>([])
  const [activeSpaceId, setActiveSpaceId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('todo')
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const supabase = createClient()

  useEffect(() => { loadSpaces() }, [])

  async function loadSpaces() {
    const { data } = await supabase.from('spaces').select('*').order('order_index')
    if (data && data.length > 0) {
      setSpaces(data)
      setActiveSpaceId(data[0].id)
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

  function handleSelectSpace(id: string) {
    setActiveSpaceId(id)
    setActiveTab('todo')
    setSidebarOpen(false)
  }

  const activeSpace = spaces.find(s => s.id === activeSpaceId)

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
    <div className="h-screen flex bg-bg-base overflow-hidden">
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
            <div className="font-serif text-base text-text-muted">nido</div>
          )}

          {activeSpace && (
            <div className="flex gap-1 ml-3">
              <TabBtn active={activeTab === 'todo'}      onClick={() => setActiveTab('todo')}      icon={<LayoutGrid size={13} />} label="todo" />
              <TabBtn active={activeTab === 'bookmarks'} onClick={() => setActiveTab('bookmarks')} icon={<Bookmark size={13} />}   label="links" />
              <TabBtn active={activeTab === 'feed'}      onClick={() => setActiveTab('feed')}      icon={<Rss size={13} />}        label="rss" />
              <TabBtn active={activeTab === 'notes'}     onClick={() => setActiveTab('notes')}     icon={<FileText size={13} />}   label="notas" />
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

        {!activeSpace ? (
          <EmptyHome />
        ) : (
          <div className="flex-1 overflow-hidden flex flex-col">
            {activeTab === 'todo'      && <TodoTab      key={activeSpaceId} spaceId={activeSpaceId!} />}
            {activeTab === 'bookmarks' && <BookmarksTab key={activeSpaceId} spaceId={activeSpaceId!} allSpaces={spaces} />}
            {activeTab === 'feed'      && <FeedTab      key={activeSpaceId} spaceId={activeSpaceId!} allSpaces={null} />}
            {activeTab === 'notes'     && <NotesTab     key={activeSpaceId} spaceId={activeSpaceId!} allSpaces={spaces} />}
          </div>
        )}
      </div>

      {showImport && (
        <ImportModal
          spaces={spaces}
          onClose={() => setShowImport(false)}
          onImported={() => {
            setShowImport(false)
            setActiveTab('bookmarks')
          }}
        />
      )}
    </div>
  )
}

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

function EmptyHome() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center max-w-xs">
        <div className="text-5xl mb-4">🪴</div>
        <div className="font-serif text-lg text-text-primary mb-2">bienvenida a nido</div>
        <div className="text-text-muted text-sm leading-relaxed mb-6">
          Tu hogar personal de internet. Organizá lo que encontrás, lo que seguís, lo que querés recordar.
        </div>
        <div className="text-xs text-text-muted">creá tu primer espacio desde el panel izquierdo →</div>
      </div>
    </div>
  )
}