import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const feedUrl = req.nextUrl.searchParams.get('url')
  if (!feedUrl) return NextResponse.json({ error: 'No URL' }, { status: 400 })

  try {
    const res = await fetch(feedUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Nido/1.0)' },
      signal: AbortSignal.timeout(8000),
    })
    const xml = await res.text()
    return new NextResponse(xml, {
      headers: { 'Content-Type': 'application/xml' }
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
