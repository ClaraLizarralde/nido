'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, X, Bookmark, FileText, Rss, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { getDomain, getFaviconUrl } from '@/lib/utils'

interface SearchResult {
  id: string
  type: 'bookmark' | 'note' | 'feed'
  title: string
  subtitle?: string
  url?: string
  space_name?: string
  space_emoji?: string
  space_id: string
}

interface GlobalSearchProps {
  spaces: { id: string; name: string; emoji: string }[]
  onNavigate: (spaceId: string, tab: 'bookmarks' | 'notes' | 'feed') => void
}

export default function GlobalSearch({ spaces, onNavigate }: GlobalSearchProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(o => !o)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
    else { setQuery(''); setResults([]) }
  }, [open])

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return }
    setLoading(true)

    const spaceMap = Object.fromEntries(spaces.map(s => [s.id, s]))

    const [{ data: bk }, { data: nt }, { data: fi }] = await Promise.all([
      supabase.from('bookmarks').select('id, title, url, description, space_id')
        .ilike('title', `%${q}%`).limit(5),
      supabase.from('notes').select('id, title, content, space_id')
        .or(`title.ilike.%${q}%,content.ilike.%${q}%`).limit(5),
      supabase.from('feed_items').select('id, title, url, description, space_id')
        .ilike('title', `%${q}%`).limit(5),
    ])

    const r: SearchResult[] = [
      ...(bk || []).map(b => ({
        id: b.id, type: 'bookmark' as const,
        title: b.title, subtitle: getDomain(b.url),
        url: b.url, space_id: b.space_id,
        space_name: spaceMap[b.space_id]?.name,
        space_emoji: spaceMap[b.space_id]?.emoji,
      })),
      ...(nt || []).map(n => ({
        id: n.id, type: 'note' as const,
        title: n.title, subtitle: n.content?.slice(0, 60),
        space_id: n.space_id,
        space_name: spaceMap[n.space_id]?.name,
        space_emoji: spaceMap[n.space_id]?.emoji,
      })),
      ...(fi || []).map(f => ({
        id: f.id, type: 'feed' as const,
        title: f.title, subtitle: getDomain(f.url),
        url: f.url, space_id: f.space_id,
        space_name: spaceMap[f.space_id]?.name,
        space_emoji: spaceMap[f.space_id]?.emoji,
      })),
    ]

    setResults(r)
    setSelected(0)
    setLoading(false)
  }, [spaces])

  useEffect(() => {
    const t = setTimeout(() => doSearch(query), 200)
    return () => clearTimeout(t)
  }, [query, doSearch])

  function handleSelect(r: SearchResult) {
    if (r.url) window.open(r.url, '_blank')
    else onNavigate(r.space_id, r.type === 'note' ? 'notes' : r.type === 'feed' ? 'feed' : 'bookmarks')
    setOpen(false)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, results.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)) }
    if (e.key === 'Enter' && results[selected]) handleSelect(results[selected])
  }

  const typeIcon = (t: string) => {
    if (t === 'bookmark') return <Bookmark size={11} />
    if (t === 'note') return <FileText size={11} />
    return <Rss size={11} />
  }

  return (
    <>
      {/* Trigger button */}
      <button onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 bg-bg-elevated border border-border-subtle rounded-lg text-xs text-text-muted hover:text-text-secondary hover:border-border-default transition-all">
        <Search size={12} />
        <span className="hidden sm:inline">buscar</span>
        <kbd className="hidden sm:inline text-[10px] px-1.5 py-0.5 bg-bg-overlay rounded border border-border-subtle">⌘K</kbd>
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4"
          onClick={() => setOpen(false)}>
          <div className="w-full max-w-lg bg-bg-surface border border-border-default rounded-2xl shadow-2xl overflow-hidden animate-slide-up"
            onClick={e => e.stopPropagation()}>
            {/* Input */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border-subtle">
              <Search size={15} className="text-text-muted flex-shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="buscar en todos tus espacios..."
                className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none"
              />
              {loading && (
                <div className="w-3 h-3 border border-text-muted border-t-transparent rounded-full animate-spin flex-shrink-0" />
              )}
              <button onClick={() => setOpen(false)} className="text-text-muted hover:text-text-primary flex-shrink-0">
                <X size={14} />
              </button>
            </div>

            {/* Results */}
            {results.length > 0 ? (
              <div className="py-2 max-h-80 overflow-y-auto">
                {results.map((r, i) => (
                  <button key={r.id} onClick={() => handleSelect(r)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all
                      ${i === selected ? 'bg-bg-elevated' : 'hover:bg-bg-elevated'}`}>
                    <div className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0
                      ${r.type === 'bookmark' ? 'bg-accent-soft text-accent'
                        : r.type === 'note' ? 'bg-amber-note-bg text-amber-note'
                        : 'bg-bg-overlay text-text-muted'}`}>
                      {typeIcon(r.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-text-primary truncate">{r.title}</div>
                      {r.subtitle && <div className="text-xs text-text-muted truncate">{r.subtitle}</div>}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0 text-xs text-text-muted">
                      <span>{r.space_emoji}</span>
                      <span className="hidden sm:inline">{r.space_name}</span>
                    </div>
                    <ArrowRight size={11} className="text-text-muted flex-shrink-0" />
                  </button>
                ))}
              </div>
            ) : query && !loading ? (
              <div className="py-10 text-center text-sm text-text-muted">
                sin resultados para <span className="text-text-secondary">"{query}"</span>
              </div>
            ) : !query ? (
              <div className="py-6 px-4">
                <div className="text-xs text-text-muted mb-2 uppercase tracking-widest">tus espacios</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {spaces.map(s => (
                    <button key={s.id} onClick={() => { onNavigate(s.id, 'bookmarks'); setOpen(false) }}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-bg-elevated hover:bg-bg-overlay text-sm text-text-secondary hover:text-text-primary transition-all">
                      <span>{s.emoji}</span><span className="truncate">{s.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Footer hint */}
            <div className="px-4 py-2 border-t border-border-subtle flex items-center gap-3 text-[10px] text-text-muted">
              <span><kbd className="px-1 bg-bg-overlay rounded">↑↓</kbd> navegar</span>
              <span><kbd className="px-1 bg-bg-overlay rounded">↵</kbd> abrir</span>
              <span><kbd className="px-1 bg-bg-overlay rounded">esc</kbd> cerrar</span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
