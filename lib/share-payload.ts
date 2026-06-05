export interface PublicSharePayload {
  slug: string
  title: string
  subtitle: string
  kind: 'project-lab' | 'eval-lab' | 'outcome-pack' | 'checklist'
  score: number
  stage?: string
  role?: string
  highlights: string[]
  body: string
  publishedAt: string
}

export function makeShareSlug(title: string) {
  const clean = (title || 'untitled')
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `${Date.now().toString(36)}-${clean || 'share'}`.slice(0, 64)
}
