'use client'

import { useState, useEffect } from 'react'
import { Rss, Bookmark, FileText, Search, X, Loader2 } from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import BookmarksTab from '@/components/BookmarksTab'
import NotesTab from '@/components/NotesTab'
import FeedTab from '@/components/FeedTab'
import type { Space, TabType } from '@/lib/types'
import { createClient } from '@/lib/supabase'

export default function Home() {
  const [spaces, setSpaces] = useState<Space[]>([])
  const [activeSpaceId, setActiveSpaceId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('feed')
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadSpaces()
  }, [])

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
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <div className={`
        fixed lg:relative z-50 lg:z-auto h-full transition-transform duration-200
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <Sidebar
          spaces={spaces}
          activeSpaceId={activeSpaceId}
          onSelectSpace={(id) => { setActiveSpaceId(id); setSidebarOpen(false) }}
          onAddSpace={addSpace}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="flex-shrink-0 flex items-center gap-3 px-4 lg:px-5 py-3.5 bg-bg-surface border-b border-border-subtle">
          {/* Mobile menu */}
          <button className="lg:hidden text-text-muted hover:text-text-primary" onClick={() => setSidebarOpen(true)}>
            <svg width="18" height="14" viewBox="0 0 18 14" fill="none">
              <path d="M0 1h18M0 7h18M0 13h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>

          {activeSpace ? (
            <div className="font-serif text-base font-medium text-text-primary flex items-center gap-2">
              <span>{activeSpace.emoji}</span>
              <span>{activeSpace.name}</span>
            </div>
          ) : (
            <div className="font-serif text-base text-text-muted">seleccioná un espacio</div>
          )}

          {/* Tabs */}
          {activeSpace && (
            <div className="flex gap-1 ml-auto">
              <TabBtn active={activeTab === 'feed'} onClick={() => setActiveTab('feed')} icon={<Rss size={13} />} label="novedades" />
              <TabBtn active={activeTab === 'bookmarks'} onClick={() => setActiveTab('bookmarks')} icon={<Bookmark size={13} />} label="guardados" />
              <TabBtn active={activeTab === 'notes'} onClick={() => setActiveTab('notes')} icon={<FileText size={13} />} label="notas" />
            </div>
          )}
        </header>

        {/* Content */}
        {!activeSpace ? (
          <EmptyHome onAdd={() => {}} />
        ) : (
          <div className="flex-1 overflow-hidden flex flex-col">
            {activeTab === 'feed' && <FeedTab key={activeSpaceId} spaceId={activeSpaceId!} />}
            {activeTab === 'bookmarks' && <BookmarksTab key={activeSpaceId} spaceId={activeSpaceId!} />}
            {activeTab === 'notes' && <NotesTab key={activeSpaceId} spaceId={activeSpaceId!} />}
          </div>
        )}
      </div>
    </div>
  )
}

function TabBtn({ active, onClick, icon, label }: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
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

function EmptyHome({ onAdd }: { onAdd: () => void }) {
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
