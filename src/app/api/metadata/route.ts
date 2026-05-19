import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  if (!url) return NextResponse.json({ error: 'No URL' }, { status: 400 })

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Nido/1.0)' },
      signal: AbortSignal.timeout(5000),
    })
    const html = await res.text()

    const getTag = (name: string) => {
      const match = html.match(new RegExp(`<meta[^>]*(?:name|property)=["']${name}["'][^>]*content=["']([^"']+)["']`, 'i'))
        || html.match(new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*(?:name|property)=["']${name}["']`, 'i'))
      return match?.[1] || null
    }

    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)

    const title = getTag('og:title') || getTag('twitter:title') || titleMatch?.[1] || ''
    const description = getTag('og:description') || getTag('description') || getTag('twitter:description') || ''
    const image = getTag('og:image') || getTag('twitter:image') || ''

    return NextResponse.json({ title: title.trim(), description: description.trim(), image })
  } catch {
    return NextResponse.json({ title: '', description: '', image: '' })
  }
}
