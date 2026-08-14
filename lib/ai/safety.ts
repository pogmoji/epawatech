const blockedPatterns = [/\b(password|passcode|credit card|bank account|home address)\b/i, /\b(self[- ]?harm|suicide)\b/i, /\b(make (a )?(weapon|bomb)|kill someone)\b/i]

export const AI_SYSTEM_INSTRUCTIONS = `You are PawaTech's friendly learning helper for young students. Give short, age-appropriate educational answers. Do not request personal information. Do not provide instructions for dangerous, illegal, sexual, or self-harm content. Encourage students to ask a trusted adult when a topic needs support. State uncertainty and invite students to check important facts.`

export function moderateAiInput(prompt: string) {
  if (prompt.length < 3) return 'Please write a little more detail in your learning question.'
  if (prompt.length > 1200) return 'Please keep your question under 1,200 characters.'
  if (blockedPatterns.some((pattern) => pattern.test(prompt))) return 'For your privacy and safety, do not include private or unsafe details. Try a general learning question instead.'
  return null
}

export function moderateAiOutput(message: string) {
  return blockedPatterns.some((pattern) => pattern.test(message))
    ? 'I can help with safe learning questions. Please ask a teacher or trusted adult for support with this topic.'
    : message
}
