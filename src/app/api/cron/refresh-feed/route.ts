import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  // protección básica: solo Vercel o vos pueden llamar esto
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient()
  const { data: sources } = await supabase.from('feed_sources').select('*')
  if (!sources || sources.length === 0) {
    return NextResponse.json({ ok: true, message: 'no sources' })
  }

  let updated = 0
  let errors = 0

  for (const source of sources) {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/feed?url=${encodeURIComponent(source.url)}`)
      const xml = await res.text()

      const { DOMParser } = await import('@xmldom/xmldom')
      const parser = new DOMParser()
      const doc = parser.parseFromString(xml, 'text/xml')
      const entries = Array.from(doc.getElementsByTagName('item').length > 0
        ? doc.getElementsByTagName('item')
        : doc.getElementsByTagName('entry')
      )

      const newItems = entries.slice(0, 20).map((entry: any) => {
        const getEl = (names: string[]) => {
          for (const n of names) {
            const el = entry.getElementsByTagName(n)[0]
            if (el?.textContent) return el.textContent.trim()
          }
          return ''
        }
        const link = entry.getElementsByTagName('link')[0]?.getAttribute('href')
          || getEl(['link', 'guid'])
        const pubDate = getEl(['pubDate', 'published', 'updated'])

        return {
          feed_source_id: source.id,
          space_id: source.space_id,
          title: getEl(['title']),
          url: link,
          description: getEl(['description', 'summary', 'content']).replace(/<[^>]+>/g, '').slice(0, 300),
          published_at: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
          is_read: false,
        }
      }).filter((i: any) => i.title && i.url)

      if (newItems.length > 0) {
        await supabase.from('feed_items').upsert(newItems, { onConflict: 'url' })
        updated++
      }
    } catch (e) {
      errors++
    }
  }

  return NextResponse.json({ ok: true, updated, errors, total: sources.length })
}