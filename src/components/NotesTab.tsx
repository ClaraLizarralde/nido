'use client'

import { useState, useEffect } from 'react'
import { Plus, X, Loader2, Trash2, Edit3, Check } from 'lucide-react'
import type { Note } from '@/lib/types'
import { createClient } from '@/lib/supabase'
import { formatRelativeTime } from '@/lib/utils'

interface NotesTabProps {
  spaceId: string
}

export default function NotesTab({ spaceId }: NotesTabProps) {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    loadNotes()
  }, [spaceId])

  async function loadNotes() {
    setLoading(true)
    const { data } = await supabase
      .from('notes')
      .select('*')
      .eq('space_id', spaceId)
      .order('updated_at', { ascending: false })
    setNotes(data || [])
    setLoading(false)
  }

  async function addNote(title: string, content: string, tags: string[]) {
    const { data } = await supabase.from('notes').insert({
      space_id: spaceId, title, content, tags
    }).select().single()
    if (data) setNotes(prev => [data, ...prev])
    setShowAdd(false)
  }

  async function updateNote(id: string, title: string, content: string) {
    await supabase.from('notes').update({ title, content, updated_at: new Date().toISOString() }).eq('id', id)
    setNotes(prev => prev.map(n => n.id === id ? { ...n, title, content, updated_at: new Date().toISOString() } : n))
    setEditing(null)
  }

  async function deleteNote(id: string) {
    await supabase.from('notes').delete().eq('id', id)
    setNotes(prev => prev.filter(n => n.id !== id))
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="sticky top-0 z-10 bg-bg-base border-b border-border-subtle px-5 py-3 flex items-center">
        <span className="text-xs text-text-muted">{notes.length} nota{notes.length !== 1 ? 's' : ''}</span>
        <button onClick={() => setShowAdd(true)}
          className="ml-auto flex items-center gap-1.5 text-xs px-3 py-1.5 bg-accent text-white rounded-lg hover:opacity-90 font-medium">
          <Plus size={13} />
          nueva nota
        </button>
      </div>

      <div className="p-5">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 size={20} className="text-text-muted animate-spin" /></div>
        ) : (
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-3 space-y-3">
            {showAdd && (
              <div className="break-inside-avoid mb-3">
                <NoteForm onSave={addNote} onCancel={() => setShowAdd(false)} />
              </div>
            )}
            {notes.length === 0 && !showAdd && <EmptyNotes onAdd={() => setShowAdd(true)} />}
            {notes.map(note => (
              <div key={note.id} className="break-inside-avoid mb-3">
                {editing === note.id ? (
                  <NoteForm
                    initialTitle={note.title}
                    initialContent={note.content}
                    onSave={(title, content) => updateNote(note.id, title, content)}
                    onCancel={() => setEditing(null)}
                  />
                ) : (
                  <NoteCard note={note} onEdit={() => setEditing(note.id)} onDelete={() => deleteNote(note.id)} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function NoteCard({ note, onEdit, onDelete }: { note: Note; onEdit: () => void; onDelete: () => void }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative bg-amber-note-bg border border-amber-note-border rounded-xl p-4 group"
      style={{ borderLeft: '3px solid rgba(245,166,35,0.4)' }}
    >
      <h4 className="font-medium text-sm text-text-primary mb-2 leading-snug">{note.title}</h4>
      <p className="text-xs text-text-secondary leading-relaxed whitespace-pre-wrap">{note.content}</p>

      {note.tags?.length > 0 && (
        <div className="flex gap-1.5 flex-wrap mt-3">
          {note.tags.map(tag => (
            <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-bg-elevated text-text-muted rounded">{tag}</span>
          ))}
        </div>
      )}

      <div className="mt-3 text-[10px] text-text-muted">{formatRelativeTime(note.updated_at)}</div>

      <div className={`absolute top-2 right-2 flex gap-1 transition-opacity ${hovered ? 'opacity-100' : 'opacity-0'}`}>
        <button onClick={onEdit} className="p-1.5 rounded-md bg-bg-base/80 backdrop-blur border border-border-subtle text-text-muted hover:text-text-primary">
          <Edit3 size={10} />
        </button>
        <button onClick={onDelete} className="p-1.5 rounded-md bg-bg-base/80 backdrop-blur border border-border-subtle text-text-muted hover:text-red-400">
          <Trash2 size={10} />
        </button>
      </div>
    </div>
  )
}

function NoteForm({ initialTitle = '', initialContent = '', onSave, onCancel }: {
  initialTitle?: string
  initialContent?: string
  onSave: (title: string, content: string, tags: string[]) => void
  onCancel: () => void
}) {
  const [title, setTitle] = useState(initialTitle)
  const [content, setContent] = useState(initialContent)
  const [tags, setTags] = useState('')

  return (
    <div className="bg-amber-note-bg border border-amber-note-border rounded-xl p-4 animate-fade-in"
      style={{ borderLeft: '3px solid rgba(245,166,35,0.5)' }}>
      <input
        autoFocus
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="título de la nota..."
        className="w-full bg-transparent text-sm font-medium text-text-primary placeholder:text-text-muted outline-none mb-2"
      />
      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder="escribí lo que quieras..."
        rows={4}
        className="w-full bg-transparent text-xs text-text-secondary placeholder:text-text-muted outline-none leading-relaxed"
      />
      <input
        value={tags}
        onChange={e => setTags(e.target.value)}
        placeholder="tags (coma separados)"
        className="w-full bg-transparent text-xs text-text-muted placeholder:text-text-muted outline-none mt-2 border-t border-amber-note-border pt-2"
      />
      <div className="flex gap-2 mt-3">
        <button
          onClick={() => onSave(title, content, tags.split(',').map(t => t.trim()).filter(Boolean))}
          disabled={!title}
          className="flex items-center gap-1 text-xs px-3 py-1.5 bg-accent text-white rounded-lg hover:opacity-90 disabled:opacity-40"
        >
          <Check size={12} /> guardar
        </button>
        <button onClick={onCancel} className="text-xs px-3 py-1.5 text-text-muted hover:text-text-secondary rounded-lg">
          cancelar
        </button>
      </div>
    </div>
  )
}

function EmptyNotes({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
      <div className="text-4xl mb-4">📝</div>
      <div className="text-text-secondary text-sm mb-1">Sin notas</div>
      <div className="text-text-muted text-xs mb-5">Guardá ideas, listas, referencias, mini diarios</div>
      <button onClick={onAdd}
        className="flex items-center gap-2 text-sm px-4 py-2 bg-accent text-white rounded-lg hover:opacity-90">
        <Plus size={14} /> nueva nota
      </button>
    </div>
  )
}
