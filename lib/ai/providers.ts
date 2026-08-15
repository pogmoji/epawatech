import { AI_SYSTEM_INSTRUCTIONS } from './safety'

export type AiProvider = { complete: (prompt: string) => Promise<string> }

async function gemini(prompt: string) {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error('AI service is not configured.')
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL || 'gemini-2.0-flash'}:generateContent?key=${key}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ systemInstruction: { parts: [{ text: AI_SYSTEM_INSTRUCTIONS }] }, contents: [{ role: 'user', parts: [{ text: prompt }] }] }) })
  if (!response.ok) throw new Error('The AI service is temporarily unavailable.')
  const data = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }
  const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('').trim()
  if (!text) throw new Error('The AI service did not return an answer.')
  return text
}

async function claude(prompt: string) {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) throw new Error('AI service is not configured.')
  const response = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' }, body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL || 'claude-3-5-haiku-latest', max_tokens: 500, system: AI_SYSTEM_INSTRUCTIONS, messages: [{ role: 'user', content: prompt }] }) })
  if (!response.ok) throw new Error('The AI service is temporarily unavailable.')
  const data = await response.json() as { content?: Array<{ type: string; text?: string }> }
  const text = data.content?.filter((item) => item.type === 'text').map((item) => item.text || '').join('').trim()
  if (!text) throw new Error('The AI service did not return an answer.')
  return text
}

export function getAiProvider(): AiProvider {
  const provider = process.env.AI_PROVIDER?.toLowerCase()
  if (provider === 'gemini') return { complete: gemini }
  if (provider === 'claude') return { complete: claude }
  throw new Error('AI_PROVIDER must be set to "gemini" or "claude" on the server.')
}
