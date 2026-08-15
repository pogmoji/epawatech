import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAiProvider } from '@/lib/ai/providers'
import { moderateAiInput, moderateAiOutput } from '@/lib/ai/safety'

export const runtime = 'nodejs'

const requestLog = new Map<string, number[]>()
const WINDOW_MS = 60_000
const MAX_REQUESTS = 8

async function authenticatedUser(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!token || !url || !key) return null
  const supabase = createClient(url, key, { global: { headers: { Authorization: `Bearer ${token}` } } })
  const { data } = await supabase.auth.getUser(token)
  return data.user
}

export async function POST(request: NextRequest) {
  const user = await authenticatedUser(request)
  if (!user) return NextResponse.json({ error: 'Please sign in to use the AI learning helper.' }, { status: 401 })
  const now = Date.now(); const prior = (requestLog.get(user.id) || []).filter((time) => now - time < WINDOW_MS)
  if (prior.length >= MAX_REQUESTS) return NextResponse.json({ error: 'Please wait a minute before sending more questions.' }, { status: 429 })
  requestLog.set(user.id, [...prior, now])
  let body: { prompt?: unknown }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Send a valid JSON request.' }, { status: 400 }) }
  if (typeof body.prompt !== 'string') return NextResponse.json({ error: 'A text prompt is required.' }, { status: 400 })
  const safetyError = moderateAiInput(body.prompt)
  if (safetyError) return NextResponse.json({ error: safetyError }, { status: 400 })
  try {
    const message = moderateAiOutput(await getAiProvider().complete(body.prompt.trim()))
    return NextResponse.json({ message })
  } catch (error) {
    console.error('AI chat error', error)
    return NextResponse.json({ error: 'The AI learning helper is unavailable right now. Please try again later.' }, { status: 503 })
  }
}
