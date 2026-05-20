'use client'

import { useState, useRef } from 'react'
import { Upload, X, FileText, Loader2, Check, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import type { Space } from '@/lib/types'

interface ImportedBookmark {
  url: string
  title: string
  folder: string
  addDate?: number
}

interface ImportModalProps {
  spaces: Space[]
  onClose: () => void
  onImported: (count: number) => void
}

export default function ImportModal({ spaces, onClose, onImported }: ImportModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [parsed, setParsed] = useState<ImportedBookmark[]>([])
  const [folders, setFolders] = useState<string[]>([])
  const [selectedSpace, setSelectedSpace] = useState(spaces[0]?.id || '')
  const [folderMap, setFolderMap] = useState<Record<string, boolean>>({})
  const [importing, setImporting] = useState(false)
  const [done, setDone] = useState(false)
  const [importedCount, setImportedCount] = useState(0)
  const [error, setError] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  function parseBookmarkHTML(html: string): ImportedBookmark[] {
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    const result: ImportedBookmark[] = []

    function walk(node: Element, folder = '') {
      const children = Array.from(node.children)
      for (const child of children) {
        if (child.tagName === 'DT') {
          const a = child.querySelector(':scope > A')
          const h3 = child.querySelector(':scope > H3')
          const dl = child.querySelector(':scope > DL')

          if (a) {
            const url = a.getAttribute('HREF') || ''
            const title = a.textContent?.trim() || url
            const addDate = parseInt(a.getAttribute('ADD_DATE') || '0')
            if (url && url.startsWith('http')) {
              result.push({ url, title, folder, addDate: addDate || undefined })
            }
          }

          if (h3 && dl) {
            const folderName = h3.textContent?.trim() || 'Sin carpeta'
            walk(dl, folderName)
          } else if (dl) {
            walk(dl, folder)
          }
        } else if (child.tagName === 'DL' || child.tagName === 'P') {
          walk(child, folder)
        }
      }
    }

    const dl = doc.querySelector('DL')
    if (dl) walk(dl)
    return result
  }

  async function handleFile(f: File) {
    setFile(f)
    setError('')
    try {
      const text = await f.text()
      const items = parseBookmarkHTML(text)
      if (items.length === 0) {
        setError('No se encontraron bookmarks en el archivo. Asegurate de exportar en formato HTML desde tu browser.')
        return
      }
const uniqueFolders = Array.from(new Set(items.map(i => i.folder || 'Sin carpeta')))
      setFolders(uniqueFolders)
      setFolderMap(Object.fromEntries(uniqueFolders.map(f => [f, true])))
      setParsed(items)
    } catch {
      setError('No se pudo leer el archivo.')
    }
  }

  function toggleFolder(folder: string) {
    setFolderMap(prev => ({ ...prev, [folder]: !prev[folder] }))
  }

  function toggleAll(val: boolean) {
    setFolderMap(Object.fromEntries(folders.map(f => [f, val])))
  }

  const selectedItems = parsed.filter(i => folderMap[i.folder || 'Sin carpeta'])

  async function handleImport() {
    if (!selectedSpace || selectedItems.length === 0) return
    setImporting(true)

    // batch insert in chunks of 50
    const CHUNK = 50
    let count = 0
    for (let i = 0; i < selectedItems.length; i += CHUNK) {
      const chunk = selectedItems.slice(i, i + CHUNK).map(b => ({
        space_id: selectedSpace,
        url: b.url,
        title: b.title,
        description: null,
        image_url: null,
        tags: b.folder && b.folder !== 'Sin carpeta' ? [b.folder.toLowerCase()] : [],
        is_favorite: false,
        is_read_later: false,
        created_at: b.addDate ? new Date(b.addDate * 1000).toISOString() : new Date().toISOString(),
      }))

      const { error: err } = await supabase
        .from('bookmarks')
        .upsert(chunk, { onConflict: 'url,space_id', ignoreDuplicates: true } as any)

      if (!err) count += chunk.length
    }

    setImportedCount(count)
    setDone(true)
    setImporting(false)
    onImported(count)
  }

  if (done) {
    return (
      <ModalShell onClose={onClose}>
        <div className="flex flex-col items-center py-8 text-center">
          <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
            <Check size={24} className="text-green-400" />
          </div>
          <div className="text-text-primary font-medium text-base mb-1">
            {importedCount} bookmarks importados
          </div>
          <div className="text-text-muted text-sm mb-6">
            Los encontrás en el espacio seleccionado, con sus carpetas como tags.
          </div>
          <button onClick={onClose} className="px-5 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:opacity-90">
            ver mis bookmarks
          </button>
        </div>
      </ModalShell>
    )
  }

  return (
    <ModalShell onClose={onClose}>
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-serif text-base font-medium text-text-primary">importar bookmarks</h3>
        <button onClick={onClose} className="text-text-muted hover:text-text-primary"><X size={16} /></button>
      </div>

      {/* Format hint */}
      <div className="bg-bg-elevated border border-border-subtle rounded-xl p-3 mb-4 text-xs text-text-muted leading-relaxed">
        <div className="font-medium text-text-secondary mb-1">Cómo exportar tus bookmarks:</div>
        <div>· <span className="text-text-secondary">Chrome/Edge:</span> Bookmarks → Administrar → ⋮ → Exportar</div>
        <div>· <span className="text-text-secondary">Firefox:</span> Marcadores → Gestionar → Importar y respaldar → Exportar</div>
        <div>· <span className="text-text-secondary">Safari:</span> Archivo → Exportar marcadores</div>
        <div>· <span className="text-text-secondary">Raindrop/Pocket:</span> Configuración → Exportar → HTML</div>
      </div>

      {/* File drop zone */}
      {!file ? (
        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
          className="border-2 border-dashed border-border-default rounded-xl p-8 text-center cursor-pointer hover:border-accent-border hover:bg-accent-soft/30 transition-all mb-4"
        >
          <Upload size={24} className="text-text-muted mx-auto mb-3" />
          <div className="text-sm text-text-secondary mb-1">arrastrá o hacé click para subir</div>
          <div className="text-xs text-text-muted">archivo .html de bookmarks</div>
          <input ref={fileRef} type="file" accept=".html,.htm" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
        </div>
      ) : (
        <div className="flex items-center gap-2 p-3 bg-bg-elevated border border-border-subtle rounded-xl mb-4">
          <FileText size={14} className="text-accent flex-shrink-0" />
          <span className="text-sm text-text-secondary flex-1 truncate">{file.name}</span>
          <span className="text-xs text-text-muted">{parsed.length} links</span>
          <button onClick={() => { setFile(null); setParsed([]); setFolders([]) }}
            className="text-text-muted hover:text-text-primary ml-1"><X size={13} /></button>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl mb-4 text-xs text-red-400">
          <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {parsed.length > 0 && (
        <>
          {/* Space selector */}
          <div className="mb-4">
            <label className="text-xs text-text-muted mb-2 block">guardar en espacio</label>
            <div className="grid grid-cols-2 gap-2">
              {spaces.map(s => (
                <button key={s.id} onClick={() => setSelectedSpace(s.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all
                    ${selectedSpace === s.id
                      ? 'bg-accent-soft border-accent-border text-accent'
                      : 'bg-bg-elevated border-border-subtle text-text-secondary hover:border-border-default'}`}>
                  <span>{s.emoji}</span><span className="truncate">{s.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Folder filter */}
          <div className="mb-4">
            <button onClick={() => setShowPreview(!showPreview)}
              className="flex items-center justify-between w-full text-xs text-text-muted hover:text-text-secondary mb-2">
              <span>carpetas ({folders.length}) — {selectedItems.length} links seleccionados</span>
              {showPreview ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>

            {showPreview && (
              <div className="bg-bg-elevated border border-border-subtle rounded-xl p-3 space-y-1 max-h-40 overflow-y-auto">
                <div className="flex gap-3 mb-2">
                  <button onClick={() => toggleAll(true)} className="text-[11px] text-accent hover:opacity-80">todas</button>
                  <button onClick={() => toggleAll(false)} className="text-[11px] text-text-muted hover:text-text-secondary">ninguna</button>
                </div>
                {folders.map(folder => {
                  const count = parsed.filter(i => (i.folder || 'Sin carpeta') === folder).length
                  return (
                    <label key={folder} className="flex items-center gap-2 cursor-pointer group">
                      <input type="checkbox" checked={!!folderMap[folder]} onChange={() => toggleFolder(folder)}
                        className="accent-accent" />
                      <span className="text-xs text-text-secondary group-hover:text-text-primary flex-1 truncate">{folder}</span>
                      <span className="text-[10px] text-text-muted">{count}</span>
                    </label>
                  )
                })}
              </div>
            )}
          </div>

          <button onClick={handleImport} disabled={importing || selectedItems.length === 0 || !selectedSpace}
            className="w-full py-2.5 bg-accent text-white rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-2">
            {importing
              ? <><Loader2 size={14} className="animate-spin" /> importando...</>
              : `importar ${selectedItems.length} bookmarks`
            }
          </button>
        </>
      )}
    </ModalShell>
  )
}

function ModalShell({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}>
      <div className="bg-bg-surface border border-border-default rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md p-5 animate-slide-up max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}
