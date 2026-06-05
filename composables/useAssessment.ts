import type { AssessmentAnswers, AssessmentResult } from '~/lib/scoring'
import { computeAssessment } from '~/lib/scoring'
import { trackEvent } from '~/lib/analytics'

const STORAGE_KEY = 'apgc-assessment'

export function useAssessment() {
  const answers = useState<AssessmentAnswers | null>('assessment-answers', () => null)
  const result = useState<AssessmentResult | null>('assessment-result', () => null)

  function loadFromStorage() {
    if (!import.meta.client) return
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const data = JSON.parse(raw) as { answers: AssessmentAnswers; result: AssessmentResult }
      answers.value = data.answers
      result.value = data.result
    } catch {
      /* ignore */
    }
  }

  function save(ans: AssessmentAnswers) {
    answers.value = ans
    result.value = computeAssessment(ans)
    if (import.meta.client) {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ answers: ans, result: result.value }),
      )
      trackEvent('assessment_completed', {
        stage: result.value?.stage || 'unknown',
        startWeek: result.value?.startWeek || 0,
      })
    }
  }

  function clear() {
    answers.value = null
    result.value = null
    if (import.meta.client) localStorage.removeItem(STORAGE_KEY)
  }

  return { answers, result, save, clear, loadFromStorage }
}
