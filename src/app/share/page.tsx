'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Loader2, Check, X, ExternalLink } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { fetchUrlMetadata, getDomain, getFaviconUrl } from '@/lib/utils'
import type { Space } from '@/lib/types'

function ShareContent() {
  const params = useSearchParams()
  const router = useRouter()
  const supabase = createClient()

  const rawUrl = params.get('url') || params.get('text') || ''
  const rawTitle = params.get('title') || ''

  // extract URL from text if needed
  const urlMatch = rawUrl.match(/https?:\/\/[^\s]+/)
  const url = urlMatch ? urlMatch[0] : rawUrl

  const [spaces, setSpaces] = useState<Space[]>([])
  const [selectedSpace, setSelectedSpace] = useState<string>('')
  const [title, setTitle] = useState(rawTitle)
  const [description, setDescription] = useState('')
  const [image, setImage] = useState('')
  const [tags, setTags] = useState('')
  const [isFavorite, setIsFavorite] = useState(false)
  const [isReadLater, setIsReadLater] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    async function init() {
      // load spaces
      const { data } = await supabase.from('spaces').select('*').order('order_index')
      if (data?.length) {
        setSpaces(data)
        setSelectedSpace(data[0].id)
      }

      // fetch metadata
      if (url) {
        const meta = await fetchUrlMetadata(url)
        if (meta) {
          if (meta.title && !rawTitle) setTitle(meta.title)
          if (meta.description) setDescription(meta.description)
          if (meta.image) setImage(meta.image)
        }
      }
      setLoading(false)
    }
    init()
  }, [url])

  async function handleSave() {
    if (!url || !title || !selectedSpace) return
    setSaving(true)
    const tagArray = tags.split(',').map(t => t.trim()).filter(Boolean)
    await supabase.from('bookmarks').insert({
      space_id: selectedSpace,
      url, title, description,
      image_url: image || null,
      tags: tagArray,
      is_favorite: isFavorite,
      is_read_later: isReadLater,
    })
    setSaved(true)
    setTimeout(() => router.push('/'), 1200)
  }

  const favicon = getFaviconUrl(url)

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="font-serif text-xl text-text-primary">nido</div>
          <Loader2 size={16} className="text-text-muted animate-spin" />
          <div className="text-xs text-text-muted">obteniendo info del link...</div>
        </div>
      </div>
    )
  }

  if (saved) {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
            <Check size={20} className="text-green-400" />
          </div>
          <div className="text-text-primary font-medium">guardado en nido</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg-base flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-border-subtle">
        <div className="font-serif text-lg text-text-primary">nido</div>
        <button onClick={() => router.push('/')} className="text-text-muted hover:text-text-primary">
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 max-w-lg mx-auto w-full">
        {/* URL preview */}
        <div className="flex items-center gap-2 p-3 bg-bg-elevated rounded-xl border border-border-subtle mb-5">
          {favicon && <img src={favicon} alt="" className="w-4 h-4 rounded-sm flex-shrink-0" />}
          <span className="text-xs text-text-muted truncate flex-1">{getDomain(url)}</span>
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-text-muted hover:text-accent flex-shrink-0">
            <ExternalLink size={12} />
          </a>
        </div>

        {/* Image preview */}
        {image && (
          <div className="mb-4 rounded-xl overflow-hidden border border-border-subtle">
            <img src={image} alt="" className="w-full h-36 object-cover" />
          </div>
        )}

        <div className="space-y-4">
          {/* Space selector */}
          <div>
            <label className="text-xs text-text-muted mb-2 block">guardar en</label>
            <div className="grid grid-cols-2 gap-2">
              {spaces.map(s => (
                <button key={s.id} onClick={() => setSelectedSpace(s.id)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm transition-all
                    ${selectedSpace === s.id
                      ? 'bg-accent-soft border-accent-border text-accent'
                      : 'bg-bg-elevated border-border-subtle text-text-secondary hover:border-border-default'}`}>
                  <span>{s.emoji}</span>
                  <span className="truncate">{s.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="text-xs text-text-muted mb-1.5 block">título</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              className="w-full bg-bg-elevated border border-border-subtle rounded-xl px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent-border" />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs text-text-muted mb-1.5 block">descripción</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
              className="w-full bg-bg-elevated border border-border-subtle rounded-xl px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent-border" />
          </div>

          {/* Tags */}
          <div>
            <label className="text-xs text-text-muted mb-1.5 block">tags (separados por coma)</label>
            <input value={tags} onChange={e => setTags(e.target.value)}
              placeholder="diseño, referencia..."
              className="w-full bg-bg-elevated border border-border-subtle rounded-xl px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent-border" />
          </div>

          {/* Quick flags */}
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
      </div>

      {/* Save button */}
      <div className="px-4 py-4 border-t border-border-subtle">
        <button onClick={handleSave} disabled={!title || !selectedSpace || saving}
          className="w-full py-3.5 bg-accent text-white rounded-xl font-medium text-sm hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-2">
          {saving ? <Loader2 size={16} className="animate-spin" /> : null}
          {saving ? 'guardando...' : 'guardar en nido'}
        </button>
      </div>
    </div>
  )
}

export default function SharePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-bg-base flex items-center justify-center">
        <Loader2 size={20} className="text-text-muted animate-spin" />
      </div>
    }>
      <ShareContent />
    </Suspense>
  )
}
