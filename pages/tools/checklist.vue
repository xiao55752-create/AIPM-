<script setup lang="ts">
import { checklistSections, CHECKLIST_STORAGE_KEY } from '~/lib/checklist'
import { EXPORT_HISTORY_KEY, type ExportRecord } from '~/lib/export-history'
import { trackEvent } from '~/lib/analytics'
import { makeShareSlug } from '~/lib/share-payload'

const form = reactive<Record<string, string>>({})
const route = useRoute()
const savedAt = ref('')
const copied = ref(false)
const copiedNarrative = ref(false)
const copiedResumeBullets = ref(false)
const copiedRewrittenBullets = ref(false)
const exportedPack = ref(false)
const sharePublishedUrl = ref('')
const bulletStyle = ref<'resume' | 'interview'>('resume')
const roleTarget = ref<'ai-pm' | 'ai-director'>('ai-pm')
const exportHistory = ref<ExportRecord[]>([])
const pendingRestore = ref<ExportRecord | null>(null)
const syncNotice = ref(false)
const metricInputs = reactive({
  recall: '',
  efficiency: '',
  cost: '',
  adoption: '',
})

onMounted(() => {
  if (!import.meta.client) return
  try {
    const raw = localStorage.getItem(CHECKLIST_STORAGE_KEY)
    if (!raw) return
    const data = JSON.parse(raw) as { form: Record<string, string>; savedAt: string }
    Object.assign(form, data.form)
    savedAt.value = data.savedAt
  } catch {
    // noop
  }

  try {
    const rawHistory = localStorage.getItem(EXPORT_HISTORY_KEY)
    if (rawHistory) {
      exportHistory.value = JSON.parse(rawHistory) as ExportRecord[]
    }
  } catch {
    // noop
  }

  const idxRaw = route.query.historyIdx
  const historyIdx =
    typeof idxRaw === 'string' && /^\d+$/.test(idxRaw) ? Number.parseInt(idxRaw, 10) : -1
  if (historyIdx >= 0 && historyIdx < exportHistory.value.length) {
    const target = exportHistory.value[historyIdx]
    if (target?.snapshot) pendingRestore.value = target
    nextTick(() => {
      const el = document.getElementById(historyItemId(historyIdx))
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
  }

  syncNotice.value = route.query.synced === '1'
})

function persist() {
  if (!import.meta.client) return
  savedAt.value = new Date().toLocaleString('zh-CN')
  localStorage.setItem(
    CHECKLIST_STORAGE_KEY,
    JSON.stringify({ form: { ...form }, savedAt: savedAt.value }),
  )
  trackEvent('checklist_saved', { filled: completionPct.value })
}

function exportMarkdown() {
  const lines: string[] = ['# AI 产品决策清单', '']
  for (const section of checklistSections) {
    lines.push(`## ${section.title}`, '')
    for (const field of section.fields) {
      lines.push(`- **${field.label}**：${form[field.id] || '—'}`)
    }
    lines.push('')
  }

  const content = lines.join('\n')
  if (!import.meta.client) return
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `ai-product-checklist-${Date.now()}.md`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  trackEvent('checklist_export_markdown')
}

async function copySummary() {
  const text = [
    '【AI 产品决策清单摘要】',
    `项目：${form.project || '—'}`,
    `结论：${form.decision || '—'}`,
    `路线：${form.route || '—'}`,
    `业务指标：${(form.scene_kpi || '—').slice(0, 100)}`,
  ].join('\n')

  if (!import.meta.client || !navigator.clipboard) return
  await navigator.clipboard.writeText(text)
  copied.value = true
  setTimeout(() => {
    copied.value = false
  }, 1800)
}

const totalFields = computed(() =>
  checklistSections.reduce((sum, section) => sum + section.fields.length, 0),
)

const filledFields = computed(() => {
  let count = 0
  for (const section of checklistSections) {
    for (const field of section.fields) {
      if ((form[field.id] || '').trim()) count++
    }
  }
  return count
})

const completionPct = computed(() => Math.round((filledFields.value / totalFields.value) * 100))

const vetoYesCount = computed(() => {
  const ids = ['veto_metric', 'veto_data', 'veto_policy', 'veto_risk', 'veto_unit']
  return ids.filter((id) => form[id] === '是').length
})

const readinessScore = computed(() => {
  const completionScore = completionPct.value
  const decisionScore = form.decision?.trim() ? 10 : 0
  const routeScore = form.route?.trim() ? 10 : 0
  const penalty = vetoYesCount.value * 12
  return Math.max(0, Math.min(100, completionScore + decisionScore + routeScore - penalty))
})

const readinessLabel = computed(() => {
  if (vetoYesCount.value > 0) return '需高层审批后再推进'
  if (readinessScore.value >= 80) return '可推进上线并可写入简历'
  if (readinessScore.value >= 60) return '可小范围试点，补齐门禁后上线'
  return '暂不建议上线，先补关键项'
})

const readinessAction = computed(() => {
  if (vetoYesCount.value > 0) return '先处理一票否决项，再重新评审。'
  if (!form.eval_gate?.trim()) return '先补 §5 发布门禁，再走上线流程。'
  if (!form.cost_unit?.trim()) return '补齐单位经济测算，避免上线后成本失控。'
  return '进入试点验证，并记录可量化结果用于战役叙事。'
})

const starNarrative = computed(() => {
  const project = form.project || '某 AI 项目'
  const scene = form.scene_user || '业务方提出需要提升效率与质量'
  const target = form.scene_kpi || '提升关键业务指标并控制风险成本'
  const route = form.route || 'RAG + Agent 混合路线'
  const evalPart = form.eval_model || '建立模型评测与发布门禁'
  const risk = form.cost_risk || '设置合规与降级兜底策略'
  const result =
    form.decision?.trim() === '不做'
      ? '通过评审识别风险并及时止损，避免了无效投入。'
      : '在可控范围内推进试点并形成可复制的方法论。'

  return [
    '【STAR 战役叙事草稿】',
    `S（背景）：${project} 面临的核心场景是：${scene}。`,
    `T（目标）：本次目标是：${target}。`,
    `A（行动）：我主导了技术与产品决策，确定 ${route}，并同步推进 ${evalPart}；在风险控制上采取了 ${risk}。`,
    `R（结果）：${result}`,
  ].join('\n')
})

async function copyNarrative() {
  if (!import.meta.client || !navigator.clipboard) return
  await navigator.clipboard.writeText(starNarrative.value)
  copiedNarrative.value = true
  setTimeout(() => {
    copiedNarrative.value = false
  }, 1800)
}

const resumeBullets = computed(() => {
  const project = form.project || '某 AI 项目'
  const route = form.route || 'RAG + Agent 混合方案'
  const kpi = form.scene_kpi || '提升关键业务指标并控制风险成本'
  const gate = form.eval_gate || form.eval_model || '建立评测与发布门禁'
  const unit = form.cost_unit || '完成单位经济测算'
  const risk = form.cost_risk || '完成合规与风险兜底设计'
  const decision = form.decision || '推进试点'

  const pmResume = [
    `负责「${project}」从需求澄清到方案落地，完成 ${route} 路线选型，并围绕「${kpi}」推进上线。`,
    `建立 AI 评测与质量闭环（${gate}），引入人机协同与降级机制，提升方案稳定性与交付可控性。`,
    decision === '不做'
      ? `基于风险评估（${risk}）给出不推进结论，及时止损并沉淀评审标准。`
      : `完成决策「${decision}」，同步落实成本与风险策略（${unit}；${risk}），支撑持续迭代。`,
  ]

  const pmInterview = [
    `这个项目的核心目标是「${kpi}」，我先把业务问题拆解成可评估的 AI 方案。`,
    `技术上我主导选择了 ${route}，并把 ${gate} 设成上线门槛，避免出现“上线后再补救”。`,
    decision === '不做'
      ? `最终我给了“不做”的建议，因为 ${risk} 风险不可接受，同时把判断标准沉淀给团队复用。`
      : `最终决策是「${decision}」，我同步控制成本与风险（${unit}；${risk}），保证项目可持续推进。`,
  ]

  const directorResume = [
    `主导「${project}」产品策略与路线决策，推动 ${route} 方案与业务目标「${kpi}」对齐并形成阶段性交付。`,
    `搭建跨团队评测与发布门禁体系（${gate}），统一研发/算法/业务协作标准，提升组织级交付确定性。`,
    decision === '不做'
      ? `基于组织级风险与投入产出评估（${risk}）拍板不推进，避免资源错配并沉淀治理机制。`
      : `拍板「${decision}」并同步落实单位经济与风险策略（${unit}；${risk}），支撑规模化扩展与复用。`,
  ]

  const directorInterview = [
    `我把这个项目定义为一个组织级增长机会，目标是「${kpi}」，并先做了战略优先级排序。`,
    `在执行层面我牵头确定 ${route}，同时把 ${gate} 作为跨团队统一门禁，确保质量与节奏一致。`,
    decision === '不做'
      ? `从管理视角看，我最终选择“不做”，因为 ${risk} 风险超过收益，这个决策也帮助团队避免了资源浪费。`
      : `我最终拍板「${decision}」，并要求团队在 ${unit} 与 ${risk} 上形成可复用机制，保证后续规模化可持续。`,
  ]

  if (roleTarget.value === 'ai-director') {
    return bulletStyle.value === 'resume' ? directorResume : directorInterview
  }
  return bulletStyle.value === 'resume' ? pmResume : pmInterview
})

const metricTokens = {
  recall: '[召回率X%→Y%]',
  efficiency: '[人效提升X%]',
  cost: '[成本下降X%]',
  adoption: '[采纳率X%→Y%]',
}

const bulletsWithMetrics = computed(() =>
  resumeBullets.value.map((bullet, idx) => {
    if (idx === 0) return `${bullet} ${metricTokens.recall}`
    if (idx === 1) return `${bullet} ${metricTokens.efficiency} ${metricTokens.adoption}`
    return `${bullet} ${metricTokens.cost}`
  }),
)

const filledMetricBullets = computed(() => {
  return bulletsWithMetrics.value.map((text) =>
    text
      .replace(metricTokens.recall, metricInputs.recall || metricTokens.recall)
      .replace(metricTokens.efficiency, metricInputs.efficiency || metricTokens.efficiency)
      .replace(metricTokens.cost, metricInputs.cost || metricTokens.cost)
      .replace(metricTokens.adoption, metricInputs.adoption || metricTokens.adoption),
  )
})

const roleKeywords = computed(() => {
  if (roleTarget.value === 'ai-director') {
    return ['产品战略', '组织协同', '路线图', '资源配置', '规模化交付']
  }
  return ['模型选型', 'RAG/Agent', '评测闭环', '场景落地', '跨团队协作']
})

const qualityScore = computed(() => {
  const bullets = filledMetricBullets.value
  const hasMetricBullets = bullets.filter(
    (b) => /(\d+%|->|→|倍|万|亿|千|[0-9]+)/.test(b) && !b.includes('[召回率X%→Y%]'),
  ).length
  const metricScore = Math.min(25, Math.round((hasMetricBullets / 3) * 25))

  const outcomeText = `${form.scene_kpi || ''} ${form.eval_biz || ''} ${form.decision || ''}`
  const outcomeHit = /(提升|增长|下降|缩短|回款|转化|留存|采纳|效率|成本)/.test(outcomeText)
  const outcomeScore = outcomeHit ? 25 : 10

  const actionReady = [form.route, form.eval_gate || form.eval_model, form.cost_risk, form.decision].filter(
    (v) => (v || '').trim(),
  ).length
  const actionScore = Math.round((actionReady / 4) * 25)

  const leadershipWords =
    roleTarget.value === 'ai-director'
      ? /(主导|拍板|推动|统筹|跨团队|组织)/.test(bullets.join(' '))
      : /(主导|负责|推进|协调|落地)/.test(bullets.join(' '))
  const leadershipScore = leadershipWords ? 25 : 12

  return metricScore + outcomeScore + actionScore + leadershipScore
})

const qualityLabel = computed(() => {
  if (qualityScore.value >= 85) return '高质量：可直接用于简历/面试初稿'
  if (qualityScore.value >= 65) return '中质量：建议补 1-2 个量化与结果词'
  return '待加强：先补指标、业务结果与关键决策表达'
})

const exportStage = computed(() => {
  if (vetoYesCount.value > 0) return '需审批'
  if (readinessScore.value >= 80) return '可上线'
  if (readinessScore.value >= 60) return '可试点'
  return '待补强'
})

const qualitySuggestions = computed(() => {
  const tips: string[] = []
  const bullets = filledMetricBullets.value.join(' ')
  if (!/(\d+%|->|→|倍|万|亿|千|[0-9]+)/.test(bullets) || bullets.includes('[召回率X%→Y%]')) {
    tips.push('至少补充 2 个真实数字（召回率、人效、成本、采纳率）。')
  }
  if (!/(提升|增长|下降|缩短|回款|转化|留存|采纳|效率|成本)/.test(`${form.scene_kpi || ''} ${form.eval_biz || ''}`)) {
    tips.push('把“做了什么”改成“带来什么业务结果”（提升/降低/增长）。')
  }
  if (!(form.route || '').trim() || !(form.decision || '').trim()) {
    tips.push('明确写出路线选择和最终决策，体现判断力。')
  }
  if (roleTarget.value === 'ai-director' && !/(主导|拍板|统筹|组织)/.test(bullets)) {
    tips.push('总监版建议加入组织级动词：主导/拍板/统筹。')
  }
  if (!tips.length) tips.push('当前质量较好，下一步可补充一个跨团队冲突与解决案例。')
  return tips
})

const rewrittenBullets = computed(() => {
  return filledMetricBullets.value.map((line, idx) => {
    let text = line
    if (roleTarget.value === 'ai-director') {
      text = text
        .replace('负责', '主导')
        .replace('推进', '牵头推进')
        .replace('完成决策', '拍板并推动决策')
    } else {
      text = text
        .replace('负责', '主导')
        .replace('建立', '搭建')
        .replace('完成决策', '推动决策落地')
    }
    if (!/(因此|最终|并|同时)/.test(text)) {
      text = `${text}，并沉淀为可复用方法。`
    }
    return `${idx + 1}. ${text}`
  })
})

async function copyResumeBullets() {
  if (!import.meta.client || !navigator.clipboard) return
  const title =
    bulletStyle.value === 'resume' ? '【简历项目条目（建议 3 条）】' : '【面试表达条目（建议 3 条）】'
  const text = [title, ...filledMetricBullets.value.map((b) => `- ${b}`)].join('\n')
  await navigator.clipboard.writeText(text)
  copiedResumeBullets.value = true
  trackEvent('checklist_copy_bullets', { mode: bulletStyle.value, role: roleTarget.value })
  setTimeout(() => {
    copiedResumeBullets.value = false
  }, 1800)
}

async function copyRewrittenBullets() {
  if (!import.meta.client || !navigator.clipboard) return
  const title = roleTarget.value === 'ai-director' ? '【重写增强版（总监）】' : '【重写增强版（AI PM）】'
  await navigator.clipboard.writeText([title, ...rewrittenBullets.value.map((t) => `- ${t}`)].join('\n'))
  copiedRewrittenBullets.value = true
  trackEvent('checklist_copy_rewritten_bullets', { role: roleTarget.value })
  setTimeout(() => {
    copiedRewrittenBullets.value = false
  }, 1800)
}

function roleLabel(role: 'ai-pm' | 'ai-director') {
  return role === 'ai-pm' ? 'AI PM' : 'AI 总监'
}

function historyItemId(idx: number) {
  return `export-history-${idx}`
}

function buildBulletsBy(role: 'ai-pm' | 'ai-director', style: 'resume' | 'interview') {
  const project = form.project || '某 AI 项目'
  const route = form.route || 'RAG + Agent 混合方案'
  const kpi = form.scene_kpi || '提升关键业务指标并控制风险成本'
  const gate = form.eval_gate || form.eval_model || '建立评测与发布门禁'
  const unit = form.cost_unit || '完成单位经济测算'
  const risk = form.cost_risk || '完成合规与风险兜底设计'
  const decision = form.decision || '推进试点'

  const pmResume = [
    `负责「${project}」从需求澄清到方案落地，完成 ${route} 路线选型，并围绕「${kpi}」推进上线。`,
    `建立 AI 评测与质量闭环（${gate}），引入人机协同与降级机制，提升方案稳定性与交付可控性。`,
    decision === '不做'
      ? `基于风险评估（${risk}）给出不推进结论，及时止损并沉淀评审标准。`
      : `完成决策「${decision}」，同步落实成本与风险策略（${unit}；${risk}），支撑持续迭代。`,
  ]

  const pmInterview = [
    `这个项目的核心目标是「${kpi}」，我先把业务问题拆解成可评估的 AI 方案。`,
    `技术上我主导选择了 ${route}，并把 ${gate} 设成上线门槛，避免出现“上线后再补救”。`,
    decision === '不做'
      ? `最终我给了“不做”的建议，因为 ${risk} 风险不可接受，同时把判断标准沉淀给团队复用。`
      : `最终决策是「${decision}」，我同步控制成本与风险（${unit}；${risk}），保证项目可持续推进。`,
  ]

  const directorResume = [
    `主导「${project}」产品策略与路线决策，推动 ${route} 方案与业务目标「${kpi}」对齐并形成阶段性交付。`,
    `搭建跨团队评测与发布门禁体系（${gate}），统一研发/算法/业务协作标准，提升组织级交付确定性。`,
    decision === '不做'
      ? `基于组织级风险与投入产出评估（${risk}）拍板不推进，避免资源错配并沉淀治理机制。`
      : `拍板「${decision}」并同步落实单位经济与风险策略（${unit}；${risk}），支撑规模化扩展与复用。`,
  ]

  const directorInterview = [
    `我把这个项目定义为一个组织级增长机会，目标是「${kpi}」，并先做了战略优先级排序。`,
    `在执行层面我牵头确定 ${route}，同时把 ${gate} 作为跨团队统一门禁，确保质量与节奏一致。`,
    decision === '不做'
      ? `从管理视角看，我最终选择“不做”，因为 ${risk} 风险超过收益，这个决策也帮助团队避免了资源浪费。`
      : `我最终拍板「${decision}」，并要求团队在 ${unit} 与 ${risk} 上形成可复用机制，保证后续规模化可持续。`,
  ]

  if (role === 'ai-director') return style === 'resume' ? directorResume : directorInterview
  return style === 'resume' ? pmResume : pmInterview
}

function buildJobPackMarkdown() {
  const pmResume = applyMetricValues(buildBulletsBy('ai-pm', 'resume'))
  const pmInterview = applyMetricValues(buildBulletsBy('ai-pm', 'interview'))
  const directorResume = applyMetricValues(buildBulletsBy('ai-director', 'resume'))
  const directorInterview = applyMetricValues(buildBulletsBy('ai-director', 'interview'))

  return [
    '# AI 求职包导出',
    '',
    '## 基础信息',
    `- 项目：${form.project || '—'}`,
    `- 当前目标岗位：${roleLabel(roleTarget.value)}`,
    `- 决策：${form.decision || '—'}`,
    `- 综合评分：${readinessScore.value}`,
    `- 结论：${readinessLabel.value}`,
    `- 动作建议：${readinessAction.value}`,
    '',
    '## STAR 战役叙事',
    starNarrative.value,
    '',
    '## 简历条目（AI PM）',
    ...pmResume.map((b) => `- ${b}`),
    '',
    '## 面试表达（AI PM）',
    ...pmInterview.map((b) => `- ${b}`),
    '',
    '## 简历条目（AI 总监）',
    ...directorResume.map((b) => `- ${b}`),
    '',
    '## 面试表达（AI 总监）',
    ...directorInterview.map((b) => `- ${b}`),
    '',
    `导出时间：${new Date().toLocaleString('zh-CN')}`,
    '',
  ]
}

function applyMetricValues(lines: string[]) {
  return lines.map((line, idx) => {
    let text = line
    if (idx === 0) text += ` ${metricInputs.recall || metricTokens.recall}`
    if (idx === 1)
      text += ` ${metricInputs.efficiency || metricTokens.efficiency} ${metricInputs.adoption || metricTokens.adoption}`
    if (idx === 2) text += ` ${metricInputs.cost || metricTokens.cost}`
    return text
  })
}

async function exportJobPack() {
  const lines = buildJobPackMarkdown()

  if (!import.meta.client) return
  const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `job-pack-${Date.now()}.md`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)

  const slug = makeShareSlug(form.project?.trim() || '未命名项目')
  const record: ExportRecord = {
    at: new Date().toLocaleString('zh-CN'),
    stage: exportStage.value,
    role: roleTarget.value,
    score: readinessScore.value,
    reviewScore: qualityScore.value,
    shareSlug: slug,
    project: form.project?.trim() || '未命名项目',
    snapshot: {
      form: { ...form },
      metrics: { ...metricInputs },
      bulletStyle: bulletStyle.value,
      reviewTips: [...qualitySuggestions.value],
    },
  }
  exportHistory.value = [record, ...exportHistory.value].slice(0, 3)
  localStorage.setItem(EXPORT_HISTORY_KEY, JSON.stringify(exportHistory.value))

  try {
    const res = await $fetch<{ ok: boolean; url: string }>('/api/share/publish', {
      method: 'POST',
      body: {
        slug,
        title: `求职包 · ${record.project}`,
        subtitle: `${roleLabel(record.role)} · 评分 ${record.score}`,
        kind: 'checklist',
        score: record.score,
        role: record.role,
        highlights: qualitySuggestions.value.slice(0, 5),
        body: lines.join('\n'),
      },
    })
    sharePublishedUrl.value = res.url
    trackEvent('checklist_publish_share', { slug, score: record.score })
  } catch {
    sharePublishedUrl.value = ''
  }

  exportedPack.value = true
  trackEvent('checklist_export_job_pack', { role: roleTarget.value, score: readinessScore.value })
  setTimeout(() => {
    exportedPack.value = false
  }, 1800)
}

function applyRestore(record: ExportRecord) {
  if (!record.snapshot) return
  Object.keys(form).forEach((k) => {
    delete form[k]
  })
  Object.assign(form, record.snapshot.form)

  metricInputs.recall = record.snapshot.metrics.recall || ''
  metricInputs.efficiency = record.snapshot.metrics.efficiency || ''
  metricInputs.cost = record.snapshot.metrics.cost || ''
  metricInputs.adoption = record.snapshot.metrics.adoption || ''

  roleTarget.value = record.role
  bulletStyle.value = record.snapshot.bulletStyle || 'resume'
  persist()
}

function requestRestore(record: ExportRecord) {
  if (!record.snapshot) return
  pendingRestore.value = record
}

function confirmRestore() {
  if (!pendingRestore.value) return
  applyRestore(pendingRestore.value)
  pendingRestore.value = null
}

function cancelRestore() {
  pendingRestore.value = null
}
</script>

<template>
  <div class="space-y-6">
    <CorePathRibbon />

    <div class="flex items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold text-primary">在线决策清单</h1>
        <p class="mt-1 text-sm text-slate-600">
          对标招聘高频要求：模型选型、RAG/Agent、Eval、合规、成本与规模化。
        </p>
      </div>
      <NuxtLink to="/market" class="text-sm text-accent hover:underline">查看招聘对标 →</NuxtLink>
    </div>

    <section class="rounded-xl border border-slate-200 bg-surface p-4">
      <p
        v-if="syncNotice"
        class="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700"
      >
        已从成长报告同步“本周下一步”到清单草稿，可直接继续补充并保存。
      </p>
      <div class="flex flex-wrap items-center gap-2">
        <button
          type="button"
          class="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
          @click="persist"
        >
          保存到本机
        </button>
        <button
          type="button"
          class="rounded-lg border border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-slate-50"
          @click="exportMarkdown"
        >
          导出 Markdown
        </button>
        <button
          type="button"
          class="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
          @click="copySummary"
        >
          {{ copied ? '已复制' : '复制摘要' }}
        </button>
        <button
          type="button"
          class="rounded-lg border border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-slate-50"
          @click="exportJobPack"
        >
          {{ exportedPack ? '已导出' : '导出求职包' }}
        </button>
        <p v-if="savedAt" class="text-xs text-slate-500">上次保存：{{ savedAt }}</p>
        <p v-if="sharePublishedUrl" class="text-xs text-emerald-700">
          成果页：
          <NuxtLink :to="sharePublishedUrl" class="underline">{{ sharePublishedUrl }}</NuxtLink>
        </p>
      </div>
    </section>

    <section id="export-history" class="rounded-xl border border-slate-200 bg-surface p-4" v-if="exportHistory.length">
      <h2 class="font-semibold text-primary">最近 3 次导出</h2>
      <ul class="mt-3 space-y-2 text-sm">
        <li
          v-for="(item, idx) in exportHistory"
          :key="`${item.at}-${idx}`"
          :id="historyItemId(idx)"
          class="rounded-lg bg-slate-50 p-3 text-slate-700"
        >
          <p>
            {{ idx + 1 }}. {{ item.at }} · {{ item.project }}
          </p>
          <p class="mt-1 text-xs text-slate-500">
            目标岗位：{{ roleLabel(item.role) }} · 阶段：{{ item.stage || '历史版本' }} · 决策评分：{{ item.score }} · 质量评分：{{ item.reviewScore || 0 }}
          </p>
          <p class="mt-1 text-xs text-slate-500">分享标识：{{ item.shareSlug || '未生成' }}</p>
          <NuxtLink
            v-if="item.shareSlug"
            :to="`/share/${item.shareSlug}`"
            class="mt-1 inline-block text-xs text-accent hover:underline"
          >
            打开公开成果页 →
          </NuxtLink>
          <button
            type="button"
            class="mt-2 rounded border border-slate-300 px-2 py-1 text-xs hover:bg-white"
            :disabled="!item.snapshot"
            :class="!item.snapshot ? 'opacity-50 cursor-not-allowed' : ''"
            @click="requestRestore(item)"
          >
            {{ item.snapshot ? '一键回填' : '旧版本不可回填' }}
          </button>
        </li>
      </ul>
    </section>

    <section
      v-if="pendingRestore"
      class="rounded-xl border border-amber-300 bg-amber-50 p-4"
    >
      <h3 class="font-semibold text-amber-900">确认回填历史版本？</h3>
      <p class="mt-2 text-sm text-amber-800">
        将覆盖当前输入内容，回填为：
        <strong>{{ pendingRestore.project }}</strong>
        （{{ pendingRestore.at }}，{{ roleLabel(pendingRestore.role) }}，评分 {{ pendingRestore.score }}）
      </p>
      <div class="mt-3 flex gap-2">
        <button
          type="button"
          class="rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700"
          @click="confirmRestore"
        >
          确认回填
        </button>
        <button
          type="button"
          class="rounded-lg border border-amber-300 px-3 py-1.5 text-sm text-amber-900 hover:bg-amber-100"
          @click="cancelRestore"
        >
          取消
        </button>
      </div>
    </section>

    <section class="rounded-xl border border-slate-200 bg-surface p-5">
      <h2 class="font-semibold text-primary">上线/简历可用度评分</h2>
      <div class="mt-3 grid gap-3 sm:grid-cols-3">
        <div class="rounded-lg bg-slate-50 p-3">
          <p class="text-xs text-slate-500">填写完整度</p>
          <p class="mt-1 text-lg font-semibold text-primary">{{ completionPct }}%</p>
        </div>
        <div class="rounded-lg bg-slate-50 p-3">
          <p class="text-xs text-slate-500">一票否决项（是）</p>
          <p class="mt-1 text-lg font-semibold text-amber-700">{{ vetoYesCount }}</p>
        </div>
        <div class="rounded-lg bg-slate-50 p-3">
          <p class="text-xs text-slate-500">综合评分</p>
          <p class="mt-1 text-lg font-semibold text-accent">{{ readinessScore }}</p>
        </div>
      </div>
      <p class="mt-3 text-sm font-medium text-primary">{{ readinessLabel }}</p>
      <p class="mt-1 text-sm text-slate-600">{{ readinessAction }}</p>
    </section>

    <section class="rounded-xl border border-slate-200 bg-surface p-5">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h2 class="font-semibold text-primary">自动生成战役叙事（STAR）</h2>
        <button
          type="button"
          class="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
          @click="copyNarrative"
        >
          {{ copiedNarrative ? '已复制' : '复制叙事文案' }}
        </button>
      </div>
      <pre class="mt-3 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{{ starNarrative }}</pre>
    </section>

    <section class="rounded-xl border border-slate-200 bg-surface p-5">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h2 class="font-semibold text-primary">一键生成项目条目（3条）</h2>
        <button
          type="button"
          class="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
          @click="copyResumeBullets"
        >
          {{ copiedResumeBullets ? '已复制' : '复制当前条目' }}
        </button>
      </div>
      <div class="mt-3 flex flex-wrap gap-2 text-xs">
        <button
          type="button"
          class="rounded-full border px-2.5 py-1"
          :class="roleTarget === 'ai-pm' ? 'border-primary bg-primary/10 text-primary' : 'border-slate-200'"
          @click="roleTarget = 'ai-pm'"
        >
          目标岗位：AI PM
        </button>
        <button
          type="button"
          class="rounded-full border px-2.5 py-1"
          :class="roleTarget === 'ai-director' ? 'border-primary bg-primary/10 text-primary' : 'border-slate-200'"
          @click="roleTarget = 'ai-director'"
        >
          目标岗位：AI 总监
        </button>
        <span
          v-for="kw in roleKeywords"
          :key="kw"
          class="rounded bg-slate-100 px-2 py-0.5 text-slate-600"
        >
          {{ kw }}
        </span>
      </div>
      <div class="mt-3 grid gap-2 sm:grid-cols-2 text-xs">
        <label class="rounded-lg border border-slate-200 bg-slate-50 p-2">
          <span class="text-slate-500">召回率指标</span>
          <input
            v-model="metricInputs.recall"
            type="text"
            placeholder="例如：召回率 72%→89%"
            class="mt-1 w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs focus:border-accent focus:outline-none"
          />
        </label>
        <label class="rounded-lg border border-slate-200 bg-slate-50 p-2">
          <span class="text-slate-500">人效指标</span>
          <input
            v-model="metricInputs.efficiency"
            type="text"
            placeholder="例如：人效提升 35%"
            class="mt-1 w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs focus:border-accent focus:outline-none"
          />
        </label>
        <label class="rounded-lg border border-slate-200 bg-slate-50 p-2">
          <span class="text-slate-500">成本指标</span>
          <input
            v-model="metricInputs.cost"
            type="text"
            placeholder="例如：推理成本下降 28%"
            class="mt-1 w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs focus:border-accent focus:outline-none"
          />
        </label>
        <label class="rounded-lg border border-slate-200 bg-slate-50 p-2">
          <span class="text-slate-500">采纳率指标</span>
          <input
            v-model="metricInputs.adoption"
            type="text"
            placeholder="例如：采纳率 41%→68%"
            class="mt-1 w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs focus:border-accent focus:outline-none"
          />
        </label>
      </div>
      <div class="mt-3 flex gap-2 text-xs">
        <button
          type="button"
          class="rounded-full border px-2.5 py-1"
          :class="bulletStyle === 'resume' ? 'border-accent bg-accent-muted/50 text-accent' : 'border-slate-200'"
          @click="bulletStyle = 'resume'"
        >
          简历版（短句）
        </button>
        <button
          type="button"
          class="rounded-full border px-2.5 py-1"
          :class="bulletStyle === 'interview' ? 'border-accent bg-accent-muted/50 text-accent' : 'border-slate-200'"
          @click="bulletStyle = 'interview'"
        >
          面试版（解释）
        </button>
      </div>
      <ul class="mt-3 space-y-2 text-sm text-slate-700">
        <li v-for="(bullet, idx) in filledMetricBullets" :key="idx" class="rounded-lg bg-slate-50 p-3">
          {{ idx + 1 }}. {{ bullet }}
        </li>
      </ul>
      <p class="mt-2 text-xs text-slate-500">
        建议再补充 1-2 个真实量化数字（如召回率、人效、成本下降）后放入正式简历。
      </p>
    </section>

    <section class="rounded-xl border border-slate-200 bg-surface p-5">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h2 class="font-semibold text-primary">一键重写增强（PM / 总监）</h2>
        <button
          type="button"
          class="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
          @click="copyRewrittenBullets"
        >
          {{ copiedRewrittenBullets ? '已复制' : '复制重写版' }}
        </button>
      </div>
      <ul class="mt-3 space-y-2 text-sm text-slate-700">
        <li
          v-for="(line, idx) in rewrittenBullets"
          :key="`rw-${idx}`"
          class="rounded-lg border border-slate-100 bg-slate-50 p-3"
        >
          {{ line }}
        </li>
      </ul>
    </section>

    <section class="rounded-xl border border-slate-200 bg-surface p-5">
      <h2 class="font-semibold text-primary">条目质量评分器（规则版）</h2>
      <div class="mt-3 grid gap-3 sm:grid-cols-3">
        <div class="rounded-lg bg-slate-50 p-3">
          <p class="text-xs text-slate-500">质量评分</p>
          <p class="mt-1 text-xl font-semibold text-primary">{{ qualityScore }}/100</p>
        </div>
        <div class="rounded-lg bg-slate-50 p-3 sm:col-span-2">
          <p class="text-xs text-slate-500">评估结论</p>
          <p class="mt-1 text-sm font-medium text-slate-700">{{ qualityLabel }}</p>
        </div>
      </div>
      <ul class="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
        <li v-for="tip in qualitySuggestions" :key="tip">{{ tip }}</li>
      </ul>
    </section>

    <section
      v-for="section in checklistSections"
      :key="section.id"
      class="rounded-xl border border-slate-200 bg-surface p-5"
    >
      <h2 class="mb-3 font-semibold text-primary">{{ section.title }}</h2>
      <div class="space-y-3">
        <div v-for="field in section.fields" :key="field.id">
          <label :for="field.id" class="mb-1 block text-sm font-medium text-slate-700">
            {{ field.label }}
          </label>

          <select
            v-if="field.type === 'yesno'"
            :id="field.id"
            v-model="form[field.id]"
            class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-accent focus:outline-none"
          >
            <option value="">请选择</option>
            <option value="是">是</option>
            <option value="否">否</option>
          </select>

          <textarea
            v-else-if="field.type === 'textarea'"
            :id="field.id"
            v-model="form[field.id]"
            rows="3"
            :placeholder="field.placeholder"
            class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-accent focus:outline-none"
          />

          <input
            v-else
            :id="field.id"
            v-model="form[field.id]"
            type="text"
            :placeholder="field.placeholder"
            class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-accent focus:outline-none"
          />
        </div>
      </div>
    </section>
  </div>
</template>
