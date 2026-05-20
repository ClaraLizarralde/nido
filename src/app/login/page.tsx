'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Loader2 } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const supabase = createClient()

  async function handleLogin() {
    if (!email) return
    setLoading(true)
    await supabase.auth.signInWithOtp({
      email,
      options: {
   emailRedirectTo: `${window.location.origin}/auth/callback`      }
    })
    setSent(true)
    setLoading(false)
  }

  return (
    <div className="h-screen flex items-center justify-center bg-bg-base">
      <div className="w-full max-w-sm px-6">
        <div className="text-center mb-8">
          <div className="font-serif text-3xl text-text-primary mb-2">🪴 nido</div>
          <div className="text-text-muted text-sm">tu internet, organizado</div>
        </div>

        {sent ? (
          <div className="text-center bg-bg-surface border border-border-subtle rounded-2xl p-6">
            <div className="text-3xl mb-3">📬</div>
            <div className="text-text-primary font-medium mb-1">Revisá tu email</div>
            <div className="text-text-muted text-sm">Te mandamos un link a <span className="text-text-secondary">{email}</span></div>
          </div>
        ) : (
          <div className="bg-bg-surface border border-border-subtle rounded-2xl p-6">
            <label className="text-xs text-text-muted mb-1.5 block">tu email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="vos@ejemplo.com"
              className="w-full bg-bg-elevated border border-border-subtle rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent-border mb-3"
            />
            <button
              onClick={handleLogin}
              disabled={!email || loading}
              className="w-full py-2.5 bg-accent text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              entrar con magic link
            </button>
          </div>
        )}
      </div>
    </div>
  )
}