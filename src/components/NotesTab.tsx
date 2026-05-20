'use client'

import { useState, useEffect, useRef } from 'react'
import { Plus, X, Loader2, Trash2, Edit3, Check, Eye, Edit, FolderInput, LayoutGrid, List } from 'lucide-react'
import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import type { Note, Space } from '@/lib/types'
import { createClient } from '@/lib/supabase'
import { formatRelativeTime } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'

interface NotesTabProps {
  spaceId: string | null
  allSpaces: Space[] | null
}

export default function NotesTab({ spaceId, allSpaces }: NotesTabProps) {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
  const [orderedNotes, setOrderedNotes] = useState<Note[]>([])
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  )
  const supabase = createClient()

  useEffect(() => { loadNotes() }, [spaceId])
  useEffect(() => { setOrderedNotes(notes) }, [notes])

  async function loadNotes() {
    setLoading(true)
    let query = supabase.from('notes').select('*').order('updated_at', { ascending: false })
    if (spaceId) query = query.eq('space_id', spaceId)
    const { data } = await query
    setNotes(data || [])
    setLoading(false)
  }

  async function addNote(title: string, content: string, tags: string[]) {
    if (!spaceId) return
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

  async function moveNote(id: string, targetSpaceId: string) {
    await supabase.from('notes').update({ space_id: targetSpaceId }).eq('id', id)
    setNotes(prev => prev.filter(n => n.id !== id))
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = orderedNotes.findIndex(n => n.id === active.id)
    const newIndex = orderedNotes.findIndex(n => n.id === over.id)
    setOrderedNotes(arrayMove(orderedNotes, oldIndex, newIndex))
  }

  const displayNotes = orderedNotes.length > 0 ? orderedNotes : notes
  const otherSpaces = (allSpaces || []).filter(s => s.id !== spaceId)

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="sticky top-0 z-10 bg-bg-base border-b border-border-subtle px-5 py-3 flex items-center gap-3">
        <span className="text-xs text-text-muted">{notes.length} nota{notes.length !== 1 ? 's' : ''}</span>
        <div className="flex gap-0.5 ml-auto bg-bg-elevated rounded-lg p-0.5">
          <button onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-bg-surface text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
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
            <Plus size={13} /> nueva nota
          </button>
        )}
      </div>

      <div className="p-5">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 size={20} className="text-text-muted animate-spin" /></div>
        ) : viewMode === 'grid' ? (
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-3 space-y-3">
            {showAdd && spaceId && (
              <div className="break-inside-avoid mb-3">
                <NoteForm onSave={addNote} onCancel={() => setShowAdd(false)} />
              </div>
            )}
            {notes.length === 0 && !showAdd && <EmptyNotes onAdd={spaceId ? () => setShowAdd(true) : null} />}
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
                  <NoteCard
                    note={note}
                    otherSpaces={otherSpaces}
                    onEdit={() => setEditing(note.id)}
                    onDelete={() => deleteNote(note.id)}
                    onMove={(targetId) => moveNote(note.id, targetId)}
                  />
                )}
              </div>
            ))}
          </div>
        ) : (
          <>
            {showAdd && spaceId && (
              <div className="mb-3">
                <NoteForm onSave={addNote} onCancel={() => setShowAdd(false)} />
              </div>
            )}
            {notes.length === 0 && !showAdd && <EmptyNotes onAdd={spaceId ? () => setShowAdd(true) : null} />}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              modifiers={[restrictToVerticalAxis]}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={displayNotes.map(n => n.id)} strategy={verticalListSortingStrategy}>
                <div className="flex flex-col">
                  {displayNotes.map(note => (
                    editing === note.id ? (
                      <div key={note.id} className="mb-2">
                        <NoteForm
                          initialTitle={note.title}
                          initialContent={note.content}
                          onSave={(title, content) => updateNote(note.id, title, content)}
                          onCancel={() => setEditing(null)}
                        />
                      </div>
                    ) : (
                      <SortableNoteRow
                        key={note.id}
                        note={note}
                        otherSpaces={otherSpaces}
                        onEdit={() => setEditing(note.id)}
                        onDelete={() => deleteNote(note.id)}
                        onMove={(targetId) => moveNote(note.id, targetId)}
                      />
                    )
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </>
        )}
      </div>
    </div>
  )
}

function SortableNoteRow({ note, otherSpaces, onEdit, onDelete, onMove }: {
  note: Note
  otherSpaces: Space[]
  onEdit: () => void
  onDelete: () => void
  onMove: (targetSpaceId: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: note.id })
  const [hovered, setHovered] = useState(false)
  const [showMove, setShowMove] = useState(false)
  const moveRef = useRef<HTMLDivElement>(null)

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const preview = note.content
    .replace(/#{1,6}\s/g, '')
    .replace(/\*\*/g, '')
    .replace(/\n/g, ' ')
    .trim()
    .slice(0, 100)

  useEffect(() => {
    if (!showMove) return
    function handleClick(e: MouseEvent) {
      if (moveRef.current && !moveRef.current.contains(e.target as Node)) setShowMove(false)
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
      className="flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-bg-elevated transition-colors group"
    >
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

      <div className="flex-1 min-w-0">
        <span className="text-sm text-text-primary font-medium truncate block leading-snug">
          {note.title || 'sin título'}
        </span>
        {preview && (
          <p className="text-xs text-text-muted truncate mt-0.5">{preview}</p>
        )}
      </div>

      {note.tags?.length > 0 && (
        <div className="hidden sm:flex gap-1 flex-shrink-0">
          {note.tags.slice(0, 2).map(tag => (
            <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-bg-elevated text-text-muted rounded">{tag}</span>
          ))}
        </div>
      )}

      <span className="shrink-0 text-xs text-text-muted whitespace-nowrap">
        {formatRelativeTime(note.updated_at)}
      </span>

      <div className={`flex gap-1 flex-shrink-0 transition-opacity ${hovered ? 'opacity-100' : 'opacity-0'}`}>
        <button onClick={onEdit}
          className="p-1.5 rounded-md bg-bg-base/80 backdrop-blur border border-border-subtle text-text-muted hover:text-text-primary">
          <Edit3 size={10} />
        </button>
        {otherSpaces.length > 0 && (
          <div className="relative" ref={moveRef}>
            <button onClick={() => setShowMove(v => !v)} title="mover a..."
              className="p-1.5 rounded-md bg-bg-base/80 backdrop-blur border border-border-subtle text-text-muted hover:text-text-primary">
              <FolderInput size={10} />
            </button>
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
        <button onClick={onDelete}
          className="p-1.5 rounded-md bg-bg-base/80 backdrop-blur border border-border-subtle text-text-muted hover:text-red-400">
          <Trash2 size={10} />
        </button>
      </div>
    </div>
  )
}

function NoteCard({ note, otherSpaces, onEdit, onDelete, onMove }: {
  note: Note
  otherSpaces: Space[]
  onEdit: () => void
  onDelete: () => void
  onMove: (targetSpaceId: string) => void
}) {
  const [hovered, setHovered] = useState(false)
  const [showMove, setShowMove] = useState(false)
  const moveRef = useRef<HTMLDivElement>(null)

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
      className="relative bg-amber-note-bg border border-amber-note-border rounded-xl p-4 group"
      style={{ borderLeft: '3px solid rgba(245,166,35,0.4)' }}
    >
      <h4 className="font-medium text-sm text-text-primary mb-3 leading-snug">{note.title}</h4>

      <div className="prose-nido text-xs text-text-secondary leading-relaxed">
        <ReactMarkdown
          components={{
            h1: ({ children }) => <h1 className="text-sm font-semibold text-text-primary mt-3 mb-1">{children}</h1>,
            h2: ({ children }) => <h2 className="text-xs font-semibold text-text-primary mt-2 mb-1">{children}</h2>,
            h3: ({ children }) => <h3 className="text-xs font-medium text-text-primary mt-2 mb-1">{children}</h3>,
            p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
            strong: ({ children }) => <strong className="font-semibold text-text-primary">{children}</strong>,
            em: ({ children }) => <em className="italic">{children}</em>,
            ul: ({ children }) => <ul className="list-disc list-inside space-y-0.5 mb-2">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal list-inside space-y-0.5 mb-2">{children}</ol>,
            li: ({ children }) => <li className="text-text-secondary">{children}</li>,
            code: ({ children }) => <code className="bg-bg-elevated px-1 py-0.5 rounded text-[11px] font-mono text-accent">{children}</code>,
            blockquote: ({ children }) => <blockquote className="border-l-2 border-amber-note-border pl-3 text-text-muted italic my-2">{children}</blockquote>,
            hr: () => <hr className="border-border-subtle my-3" />,
            a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-accent underline underline-offset-2">{children}</a>,
          }}
        >
          {note.content}
        </ReactMarkdown>
      </div>

      {note.tags?.length > 0 && (
        <div className="flex gap-1.5 flex-wrap mt-3">
          {note.tags.map(tag => (
            <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-bg-elevated text-text-muted rounded">{tag}</span>
          ))}
        </div>
      )}

      <div className="mt-3 text-[10px] text-text-muted">{formatRelativeTime(note.updated_at)}</div>

      <div className={`absolute top-2 right-2 flex gap-1 transition-opacity ${hovered ? 'opacity-100' : 'opacity-0'}`}>
        <button onClick={onEdit}
          className="p-1.5 rounded-md bg-bg-base/80 backdrop-blur border border-border-subtle text-text-muted hover:text-text-primary">
          <Edit3 size={10} />
        </button>
        {otherSpaces.length > 0 && (
          <div className="relative" ref={moveRef}>
            <button
              onClick={() => setShowMove(v => !v)}
              title="mover a..."
              className="p-1.5 rounded-md bg-bg-base/80 backdrop-blur border border-border-subtle text-text-muted hover:text-text-primary">
              <FolderInput size={10} />
            </button>
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
        <button onClick={onDelete}
          className="p-1.5 rounded-md bg-bg-base/80 backdrop-blur border border-border-subtle text-text-muted hover:text-red-400">
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
  const [preview, setPreview] = useState(false)

  return (
    <div className="bg-amber-note-bg border border-amber-note-border rounded-xl p-4 animate-fade-in"
      style={{ borderLeft: '3px solid rgba(245,166,35,0.5)' }}>
      <input
        autoFocus
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="título de la nota..."
        className="w-full bg-transparent text-sm font-medium text-text-primary placeholder:text-text-muted outline-none mb-3"
      />
      <div className="flex gap-1 mb-2">
        <button onClick={() => setPreview(false)}
          className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded transition-all
            ${!preview ? 'bg-bg-elevated text-text-secondary' : 'text-text-muted hover:text-text-secondary'}`}>
          <Edit size={9} /> escribir
        </button>
        <button onClick={() => setPreview(true)}
          className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded transition-all
            ${preview ? 'bg-bg-elevated text-text-secondary' : 'text-text-muted hover:text-text-secondary'}`}>
          <Eye size={9} /> preview
        </button>
      </div>
      {preview ? (
        <div className="min-h-[96px] text-xs text-text-secondary leading-relaxed">
          {content ? (
            <ReactMarkdown
              components={{
                h1: ({ children }) => <h1 className="text-sm font-semibold text-text-primary mt-3 mb-1">{children}</h1>,
                h2: ({ children }) => <h2 className="text-xs font-semibold text-text-primary mt-2 mb-1">{children}</h2>,
                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                strong: ({ children }) => <strong className="font-semibold text-text-primary">{children}</strong>,
                em: ({ children }) => <em className="italic">{children}</em>,
                ul: ({ children }) => <ul className="list-disc list-inside space-y-0.5 mb-2">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal list-inside space-y-0.5 mb-2">{children}</ol>,
                li: ({ children }) => <li>{children}</li>,
                code: ({ children }) => <code className="bg-bg-elevated px-1 py-0.5 rounded text-[11px] font-mono text-accent">{children}</code>,
                blockquote: ({ children }) => <blockquote className="border-l-2 border-amber-note-border pl-3 text-text-muted italic my-2">{children}</blockquote>,
                a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-accent underline underline-offset-2">{children}</a>,
              }}
            >
              {content}
            </ReactMarkdown>
          ) : (
            <span className="text-text-muted italic">nada que previsualizar todavía...</span>
          )}
        </div>
      ) : (
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder={`escribí en markdown:\n# título\n**negrita**, *itálica*\n- lista\n> cita`}
          rows={6}
          className="w-full bg-transparent text-xs text-text-secondary placeholder:text-text-muted outline-none leading-relaxed font-mono resize-none"
        />
      )}
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
          className="flex items-center gap-1 text-xs px-3 py-1.5 bg-accent text-white rounded-lg hover:opacity-90 disabled:opacity-40">
          <Check size={12} /> guardar
        </button>
        <button onClick={onCancel} className="text-xs px-3 py-1.5 text-text-muted hover:text-text-secondary rounded-lg">
          cancelar
        </button>
      </div>
    </div>
  )
}

function EmptyNotes({ onAdd }: { onAdd: (() => void) | null }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
      <div className="text-4xl mb-4">📝</div>
      <div className="text-text-secondary text-sm mb-1">Sin notas</div>
      <div className="text-text-muted text-xs mb-5">Guardá ideas, listas, referencias, mini diarios</div>
      {onAdd && (
        <button onClick={onAdd}
          className="flex items-center gap-2 text-sm px-4 py-2 bg-accent text-white rounded-lg hover:opacity-90">
          <Plus size={14} /> nueva nota
        </button>
      )}
    </div>
  )
}