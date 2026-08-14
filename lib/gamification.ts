/**
 * GamificationService — Placeholder
 *
 * Every lesson and challenge calls these hooks on completion.
 * Right now they only log to console. Later they will:
 *   - Award XP
 *   - Unlock badges
 *   - Update streaks
 *   - Update leaderboard
 *   - Trigger achievements
 *
 * Never calculate XP or badge logic inside lesson components directly.
 */

export const GamificationService = {
  async onLessonCompleted(studentId: string, lessonId: string) {
    console.log(`[GamificationService] Lesson completed — student: ${studentId}, lesson: ${lessonId}`)
    return { success: true }
  },

  async onChallengeCompleted(studentId: string, challengeId: string) {
    console.log(`[GamificationService] Challenge completed — student: ${studentId}, challenge: ${challengeId}`)
    return { success: true }
  },

  async onTypingTestCompleted(studentId: string, wpm: number, accuracy: number) {
    console.log(`[GamificationService] Typing test — student: ${studentId}, WPM: ${wpm}, accuracy: ${accuracy}%`)
    return { success: true }
  },
}
