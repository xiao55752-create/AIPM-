export const EXPORT_HISTORY_KEY = 'apgc-export-history'

export interface ExportRecord {
  at: string
  stage: string
  role: 'ai-pm' | 'ai-director'
  score: number
  reviewScore?: number
  shareSlug: string
  project: string
  snapshot?: {
    form: Record<string, string>
    metrics: { recall: string; efficiency: string; cost: string; adoption: string }
    bulletStyle: 'resume' | 'interview'
    reviewTips?: string[]
  }
}
