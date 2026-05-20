'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, Home, Trash2, Edit3, Check, X } from 'lucide-react'
import type { Space } from '@/lib/types'

interface SidebarProps {
  spaces: Space[]
  activeSpaceId: string | null
  onSelectSpace: (id: string | 'inicio') => void
  onAddSpace: (name: string, emoji: string) => void
  onDeleteSpace: (id: string) => void
  onRenameSpace: (id: string, name: string, emoji: string) => void
}

const EMOJI_OPTIONS = ['🎵','🍳','📚','💻','🎨','🌍','🎬','🌿','✈️','💡','🎮','📸','🔬','🏃','🛋️','🎯']

export default function Sidebar({ spaces, activeSpaceId, onSelectSpace, onAddSpace, onDeleteSpace, onRenameSpace }: SidebarProps) {
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmoji, setNewEmoji] = useState('🌿')
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editEmoji, setEditEmoji] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)



useEffect(() => {
  function handleOpenAdd() {
    setAdding(true)
  }
  window.addEventListener('nido:open-add-space', handleOpenAdd)
  return () => window.removeEventListener('nido:open-add-space', handleOpenAdd)
}, [])

  const filtered = spaces.filter(s => s.name.toLowerCase().includes(search.toLowerCase()))

  function handleAdd() {
    if (!newName.trim()) return
    onAddSpace(newName.trim(), newEmoji)
    setNewName('')
    setNewEmoji('🌿')
    setAdding(false)
  }

  function startEdit(space: Space, e: React.MouseEvent) {
    e.stopPropagation()
    setEditingId(space.id)
    setEditName(space.name)
    setEditEmoji(space.emoji)
  }

  function handleRename() {
    if (!editName.trim() || !editingId) return
    onRenameSpace(editingId, editName.trim(), editEmoji)
    setEditingId(null)
  }

  function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    setConfirmDelete(id)
  }

  return (
    <aside className="w-52 flex-shrink-0 bg-bg-surface border-r border-border-subtle flex flex-col h-full">
      <div className="px-4 pt-5 pb-4 border-b border-border-subtle">
        <div className="font-serif text-lg font-medium text-text-primary tracking-tight">nido</div>
        <div className="text-xs text-text-muted mt-0.5">tu internet, organizado</div>
      </div>

      <div className="px-2 pt-3">
        <button
          onClick={() => onSelectSpace('inicio')}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all
            ${activeSpaceId === 'inicio'
              ? 'bg-accent-soft text-accent font-medium'
              : 'text-text-secondary hover:bg-bg-elevated hover:text-text-primary'
            }`}
        >
          <Home size={15} />
          <span>Inicio</span>
        </button>
      </div>

      <div className="px-3 pt-3">
        <div className="flex items-center gap-2 bg-bg-elevated border border-border-subtle rounded-lg px-3 py-1.5">
          <Search size={12} className="text-text-muted" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="buscar espacios..."
            className="bg-transparent text-xs text-text-secondary placeholder:text-text-muted outline-none w-full"
          />
        </div>
      </div>

      <div className="px-4 pt-4 pb-1.5 text-[10px] font-medium tracking-widest text-text-muted uppercase">
        espacios
      </div>

      <nav className="flex-1 overflow-y-auto px-2">
        {filtered.map(space => (
          <div key={space.id} className="mb-0.5">
            {editingId === space.id ? (
              <div className="px-2 py-3 bg-bg-elevated rounded-lg border border-border-subtle animate-fade-in">
                <div className="flex flex-wrap gap-1 mb-2">
                  {EMOJI_OPTIONS.map(e => (
                    <button key={e} onClick={() => setEditEmoji(e)}
                      className={`text-sm p-1 rounded transition-all ${editEmoji === e ? 'bg-accent-soft ring-1 ring-accent-border' : 'hover:bg-bg-overlay'}`}>
                      {e}
                    </button>
                  ))}
                </div>
                <input
                  autoFocus
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setEditingId(null) }}
                  className="w-full bg-bg-base border border-border-subtle rounded-md px-2.5 py-1.5 text-xs text-text-primary outline-none focus:border-accent-border mb-2"
                />
                <div className="flex gap-1.5">
                  <button onClick={handleRename}
                    className="flex-1 text-xs py-1.5 bg-accent text-white rounded-md font-medium hover:opacity-90 flex items-center justify-center gap-1">
                    <Check size={11} /> guardar
                  </button>
                  <button onClick={() => setEditingId(null)}
                    className="flex-1 text-xs py-1.5 bg-bg-overlay text-text-secondary rounded-md hover:bg-bg-overlay/80 flex items-center justify-center gap-1">
                    <X size={11} /> cancelar
                  </button>
                </div>
              </div>
            ) : confirmDelete === space.id ? (
              <div className="px-3 py-2.5 bg-bg-elevated rounded-lg border border-red-400/20 animate-fade-in">
                <p className="text-xs text-text-secondary mb-2 leading-relaxed">
                  ¿Borrar <strong>{space.emoji} {space.name}</strong>? Se borra todo su contenido.
                </p>
                <div className="flex gap-1.5">
                  <button onClick={() => { onDeleteSpace(space.id); setConfirmDelete(null) }}
                    className="flex-1 text-xs py-1.5 bg-red-500/80 text-white rounded-md hover:opacity-90">
                    borrar
                  </button>
                  <button onClick={() => setConfirmDelete(null)}
                    className="flex-1 text-xs py-1.5 bg-bg-overlay text-text-secondary rounded-md">
                    cancelar
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => onSelectSpace(space.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm relative group transition-all
                  ${activeSpaceId === space.id
                    ? 'bg-accent-soft text-accent font-medium'
                    : 'text-text-secondary hover:bg-bg-elevated hover:text-text-primary'
                  }`}
              >
                {activeSpaceId === space.id && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-accent rounded-r" />
                )}
                <span className="text-base w-5 text-center">{space.emoji}</span>
                <span className="flex-1 text-left truncate">{space.name}</span>
                <div className="hidden group-hover:flex items-center gap-0.5 flex-shrink-0">
                  <span onClick={(e) => startEdit(space, e)}
                    className="p-1 rounded hover:bg-bg-overlay text-text-muted hover:text-text-primary">
                    <Edit3 size={11} />
                  </span>
                  <span onClick={(e) => handleDelete(space.id, e)}
                    className="p-1 rounded hover:bg-bg-overlay text-text-muted hover:text-red-400">
                    <Trash2 size={11} />
                  </span>
                </div>
              </button>
            )}
          </div>
        ))}

        {adding && (
          <div className="mt-2 px-2 py-3 bg-bg-elevated rounded-lg border border-border-subtle animate-fade-in">
            <div className="flex flex-wrap gap-1.5 mb-2">
              {EMOJI_OPTIONS.map(e => (
                <button key={e} onClick={() => setNewEmoji(e)}
                  className={`text-base p-1 rounded transition-all ${newEmoji === e ? 'bg-accent-soft ring-1 ring-accent-border' : 'hover:bg-bg-overlay'}`}>
                  {e}
                </button>
              ))}
            </div>
            <input
              autoFocus
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setAdding(false) }}
              placeholder="nombre del espacio"
              className="w-full bg-bg-base border border-border-subtle rounded-md px-2.5 py-1.5 text-xs text-text-primary placeholder:text-text-muted outline-none focus:border-accent-border mb-2"
            />
            <div className="flex gap-1.5">
              <button onClick={handleAdd}
                className="flex-1 text-xs py-1.5 bg-accent text-white rounded-md font-medium hover:opacity-90">
                crear
              </button>
              <button onClick={() => setAdding(false)}
                className="flex-1 text-xs py-1.5 bg-bg-overlay text-text-secondary rounded-md">
                cancelar
              </button>
            </div>
          </div>
        )}
      </nav>

<div className="p-3 border-t border-border-subtle space-y-2">
        <button
          onClick={() => setAdding(true)}
          className="w-full flex items-center justify-center gap-2 py-2 bg-bg-elevated hover:bg-bg-overlay border border-border-subtle rounded-lg text-xs text-text-secondary hover:text-text-primary transition-all"
        >
          <Plus size={13} />
          nuevo espacio
        </button>
        <button
          onClick={async () => {
            const { createClient } = await import('@/lib/supabase')
            const supabase = createClient()
            await supabase.auth.signOut()
            window.location.href = '/login'
          }}
          className="w-full flex items-center justify-center gap-2 py-2 hover:bg-bg-elevated rounded-lg text-xs text-text-muted hover:text-text-secondary transition-all"
        >
          salir
        </button>
      </div>
    </aside>
  )
}