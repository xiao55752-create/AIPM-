<script setup lang="ts">
import {
  AB_MIN_LEAD_PCT,
  AB_MIN_SAMPLE,
  PAY_CTA_FORCE_VARIANT_KEY,
  readAbAutoLockMeta,
  REPORT_CTA_FORCE_VARIANT_KEY,
  writeAbAutoLockMeta,
  type AbAutoLockMeta,
} from '~/lib/ab-experiment'
import { readEvents, trackEvent } from '~/lib/analytics'
import { formatSlaCountdown, homeworkTypeLabels, isSlaOverdue } from '~/lib/homework'
import type { OutboundNotification } from '~/lib/notifications'

const AI_TOPIC_TASKS_KEY = 'apgc-ai-topic-weekly-tasks-v1'

interface TopicWeeklyTask {
  id: string
  priority: 'high' | 'medium' | 'low'
  done: boolean
}

const { active: founderMode, loadFounderMode } = useFounderMode()
const events = ref<ReturnType<typeof readEvents>>([])
const topicTasks = ref<TopicWeeklyTask[]>([])
const copiedWeeklyRecap = ref(false)
const reportForcedVariant = ref<'A' | 'B' | ''>('')
const payForcedVariant = ref<'A' | 'B' | ''>('')
const autoLockMeta = ref<AbAutoLockMeta>({})
const autoLockNotice = ref('')
const seedingOpsDemo = ref(false)
const opsDemoNotice = ref('')

interface HomeworkQueueItem {
  id: string
  type: string
  title: string
  contentPreview: string
  content: string
  contact: string
  notifyChannel?: string
  slaDueAt?: string
  status: string
  createdAt: string
}

const homeworkQueue = ref<HomeworkQueueItem[]>([])
const homeworkPendingCount = ref(0)
const homeworkReviewedCount = ref(0)
const homeworkOverdueCount = ref(0)
const homeworkReviewDrafts = ref<Record<string, string>>({})
const homeworkReviewingId = ref('')
const homeworkLoadError = ref('')
const notificationQueue = ref<OutboundNotification[]>([])
const notificationPendingCount = ref(0)
const notificationFailedCount = ref(0)
const notificationOpenedCount = ref(0)
const notificationLoadError = ref('')
const notificationDispatchError = ref('')
const copiedNotificationId = ref('')
const markingNotificationId = ref('')
const dispatchingNotificationId = ref('')
const dispatchingAll = ref(false)
const sendingSlaAlert = ref(false)
const notifyDispatchConfig = ref({
  wecomConfigured: false,
  mailConfigured: false,
  slaAlertConfigured: false,
  autoDispatch: true,
})
const opsNowTick = ref(Date.now())
let opsSlaTimer: ReturnType<typeof setInterval> | null = null

const actionableNotificationCount = computed(
  () => notificationQueue.value.filter((r) => r.status === 'pending' || r.status === 'failed').length,
)

onMounted(() => {
  loadFounderMode()
  events.value = readEvents()
  if (!import.meta.client) return
  refreshForcedVariantState()
  autoLockMeta.value = readAbAutoLockMeta()
  tryAutoLockWinners()
  loadHomeworkQueue()
  loadNotificationQueue()
  loadNotifyDispatchConfig()
  opsSlaTimer = setInterval(() => {
    opsNowTick.value = Date.now()
  }, 60_000)
  try {
    const raw = localStorage.getItem(AI_TOPIC_TASKS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Array<Partial<TopicWeeklyTask>>
      topicTasks.value = Array.isArray(parsed)
        ? parsed.map((item) => ({
            id: String(item.id || ''),
            priority: (item.priority as TopicWeeklyTask['priority']) || 'medium',
            done: Boolean(item.done),
          }))
        : []
    }
  } catch {
    // noop
  }
})

onUnmounted(() => {
  if (opsSlaTimer) clearInterval(opsSlaTimer)
})

const total = computed(() => events.value.length)

const byName = computed(() => {
  const map = new Map<string, number>()
  events.value.forEach((e) => map.set(e.name, (map.get(e.name) || 0) + 1))
  return [...map.entries()].sort((a, b) => b[1] - a[1])
})

function countEvent(name: string) {
  return events.value.filter((e) => e.name === name).length
}

function ratio(part: number, base: number) {
  if (!base) return 0
  return Math.round((part / base) * 100)
}

function eventCountByDay(
  name: string,
  startDay: string,
  endDay: string,
  predicate?: (payload?: Record<string, string | number | boolean>) => boolean,
) {
  return events.value.filter((e) => {
    if (e.name !== name) return false
    if (e.day < startDay || e.day > endDay) return false
    if (!predicate) return true
    return predicate(e.payload)
  }).length
}

const today = computed(() => new Date().toISOString().slice(0, 10))

const todayCount = computed(
  () => events.value.filter((e) => e.day === today.value).length,
)

const recentEvents = computed(() => [...events.value].reverse().slice(0, 30))

const coreKpis = computed(() => {
  const quizStarted = countEvent('quiz_started')
  const assessmentCompleted = countEvent('assessment_completed')
  const tasksView = countEvent('tasks_view')
  const tasksToChecklist = countEvent('tasks_open_checklist')

  return {
    quizStarted,
    assessmentCompleted,
    assessmentCompletionRate: ratio(assessmentCompleted, quizStarted),
    tasksView,
    tasksToChecklist,
    taskChecklistRate: ratio(tasksToChecklist, tasksView),
  }
})

const funnel = computed(() => {
  const reportView = countEvent('report_view')
  const toTasks = countEvent('report_cta_primary_tasks')
  const toResources = countEvent('report_cta_secondary_resources')
  const toChecklist = countEvent('report_sync_to_checklist')
  const anySecondary = toResources + toChecklist

  return {
    reportView,
    toTasks,
    toResources,
    toChecklist,
    anySecondary,
    tasksRate: ratio(toTasks, reportView),
    resourcesRate: ratio(toResources, reportView),
    checklistRate: ratio(toChecklist, reportView),
    secondaryRate: ratio(anySecondary, reportView),
  }
})

const topicFunnel = computed(() => {
  const topicView = countEvent('resource_ai_topic_view')
  const addTop2 = countEvent('resource_ai_topic_add_top2_tasks')
  const addSingle = countEvent('resource_ai_topic_add_task')
  const addAny = addTop2 + addSingle
  const topicDone = events.value.filter(
    (e) => e.name === 'tasks_topic_toggle_done' && e.payload?.done === true,
  ).length
  const toChecklist = countEvent('tasks_topic_to_checklist')

  return {
    topicView,
    addTop2,
    addSingle,
    addAny,
    topicDone,
    toChecklist,
    addRate: ratio(addAny, topicView),
    doneRate: ratio(topicDone, addAny || topicView),
    checklistRate: ratio(toChecklist, addAny || topicView),
  }
})

const topicDiagnosis = computed(() => {
  if (!topicFunnel.value.topicView) {
    return {
      bottleneck: '流量不足',
      action: '先把专题入口前置到首页/报告页，优先拉起首批访问。',
    }
  }
  if (topicFunnel.value.addRate < 40) {
    return {
      bottleneck: '加任务转化偏低',
      action: '优化专题页 Top2 文案，强调“加入后可一键同步清单”。',
    }
  }
  if (topicFunnel.value.doneRate < 40) {
    return {
      bottleneck: '执行完成率偏低',
      action: '在任务池默认切到待办视图，并提醒先完成 1 条最短任务。',
    }
  }
  if (topicFunnel.value.checklistRate < 35) {
    return {
      bottleneck: '任务到清单转化偏低',
      action: '把“同步到清单”按钮上移为主动作，并在完成后自动提示。',
    }
  }
  return {
    bottleneck: '链路健康',
    action: '保持当前路径，下一步可以尝试提高任务池规模和完成上限。',
  }
})

const topicPriorityKpis = computed(() => {
  const total = topicTasks.value.length
  const done = topicTasks.value.filter((item) => item.done).length
  const high = topicTasks.value.filter((item) => item.priority === 'high')
  const medium = topicTasks.value.filter((item) => item.priority === 'medium')
  const low = topicTasks.value.filter((item) => item.priority === 'low')

  function rate(doneCount: number, base: number) {
    if (!base) return 0
    return Math.round((doneCount / base) * 100)
  }

  return {
    total,
    done,
    overallRate: rate(done, total),
    highTotal: high.length,
    highDone: high.filter((item) => item.done).length,
    highPending: high.filter((item) => !item.done).length,
    highRate: rate(high.filter((item) => item.done).length, high.length),
    mediumTotal: medium.length,
    mediumDone: medium.filter((item) => item.done).length,
    mediumPending: medium.filter((item) => !item.done).length,
    mediumRate: rate(medium.filter((item) => item.done).length, medium.length),
    lowTotal: low.length,
    lowDone: low.filter((item) => item.done).length,
    lowPending: low.filter((item) => !item.done).length,
    lowRate: rate(low.filter((item) => item.done).length, low.length),
  }
})

const weekCompare = computed(() => {
  const now = new Date()
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  const dayMs = 24 * 60 * 60 * 1000
  const thisStart = fmt(new Date(now.getTime() - 6 * dayMs))
  const thisEnd = fmt(now)
  const lastStart = fmt(new Date(now.getTime() - 13 * dayMs))
  const lastEnd = fmt(new Date(now.getTime() - 7 * dayMs))

  const thisReportView = eventCountByDay('report_view', thisStart, thisEnd)
  const thisTrial = eventCountByDay('trial_start', thisStart, thisEnd)
  const thisPay = eventCountByDay('pay_click', thisStart, thisEnd)
  const thisOutcome = eventCountByDay('topic_outcome_pack_exported', thisStart, thisEnd)
  const thisTopicView = eventCountByDay('resource_ai_topic_view', thisStart, thisEnd)
  const thisDone = eventCountByDay(
    'tasks_topic_toggle_done',
    thisStart,
    thisEnd,
    (payload) => payload?.done === true,
  )
  const thisRetentionActiveDays = new Set(
    events.value
      .filter(
        (e) =>
          e.day >= thisStart &&
          e.day <= thisEnd &&
          ['tasks_topic_toggle_done', 'resource_ai_topic_stage_checkin', 'tasks_topic_quick_complete_next'].includes(e.name),
      )
      .map((e) => e.day),
  ).size

  const lastReportView = eventCountByDay('report_view', lastStart, lastEnd)
  const lastTrial = eventCountByDay('trial_start', lastStart, lastEnd)
  const lastPay = eventCountByDay('pay_click', lastStart, lastEnd)
  const lastOutcome = eventCountByDay('topic_outcome_pack_exported', lastStart, lastEnd)
  const lastTopicView = eventCountByDay('resource_ai_topic_view', lastStart, lastEnd)
  const lastDone = eventCountByDay(
    'tasks_topic_toggle_done',
    lastStart,
    lastEnd,
    (payload) => payload?.done === true,
  )
  const lastRetentionActiveDays = new Set(
    events.value
      .filter(
        (e) =>
          e.day >= lastStart &&
          e.day <= lastEnd &&
          ['tasks_topic_toggle_done', 'resource_ai_topic_stage_checkin', 'tasks_topic_quick_complete_next'].includes(e.name),
      )
      .map((e) => e.day),
  ).size

  const thisTrialToPay = ratio(thisPay, thisTrial)
  const lastTrialToPay = ratio(lastPay, lastTrial)
  const thisLearningOutput = ratio(thisOutcome, thisTopicView)
  const lastLearningOutput = ratio(lastOutcome, lastTopicView)

  return {
    thisRange: `${thisStart} ~ ${thisEnd}`,
    lastRange: `${lastStart} ~ ${lastEnd}`,
    thisData: {
      reportView: thisReportView,
      topicDone: thisDone,
      trialToPay: thisTrialToPay,
      learningOutputRate: thisLearningOutput,
      retentionProxy: thisRetentionActiveDays,
    },
    lastData: {
      reportView: lastReportView,
      topicDone: lastDone,
      trialToPay: lastTrialToPay,
      learningOutputRate: lastLearningOutput,
      retentionProxy: lastRetentionActiveDays,
    },
  }
})

function deltaText(current: number, previous: number, suffix = '') {
  const delta = current - previous
  if (delta === 0) return `持平（${current}${suffix}）`
  const sign = delta > 0 ? '+' : ''
  return `${sign}${delta}${suffix}（当前 ${current}${suffix}）`
}

const growthOverview = computed(() => {
  const trialStart = countEvent('trial_start')
  const payClick = countEvent('pay_click')
  const topicView = countEvent('resource_ai_topic_view')
  const outcomeExport = countEvent('topic_outcome_pack_exported')
  const retentionProxy = new Set(
    events.value
      .filter((e) => ['tasks_topic_toggle_done', 'resource_ai_topic_stage_checkin', 'tasks_topic_quick_complete_next'].includes(e.name))
      .map((e) => e.day),
  ).size

  return {
    trialToPay: ratio(payClick, trialStart),
    learningOutputRate: ratio(outcomeExport, topicView),
    retentionProxy,
    reportToTask: funnel.value.tasksRate,
    topicTaskDone: topicFunnel.value.doneRate,
  }
})

const significantChanges = computed(() => {
  const tips: string[] = []
  const cur = weekCompare.value.thisData
  const pre = weekCompare.value.lastData

  if (Math.abs(cur.trialToPay - pre.trialToPay) >= 10) {
    tips.push(`试学到支付转化率变化显著：${deltaText(cur.trialToPay, pre.trialToPay, '%')}`)
  }
  if (Math.abs(cur.learningOutputRate - pre.learningOutputRate) >= 10) {
    tips.push(`学习产出率变化显著：${deltaText(cur.learningOutputRate, pre.learningOutputRate, '%')}`)
  }
  if (Math.abs(cur.retentionProxy - pre.retentionProxy) >= 2) {
    tips.push(`7日留存代理变化显著：${deltaText(cur.retentionProxy, pre.retentionProxy, '天')}`)
  }
  if (Math.abs(cur.topicDone - pre.topicDone) >= 3) {
    tips.push(`专题任务完成数变化显著：${deltaText(cur.topicDone, pre.topicDone, '条')}`)
  }
  if (!tips.length) {
    tips.push('本周核心指标波动较小，建议继续放大试学->支付链路样本量。')
  }
  return tips
})

const nextActions = computed(() => {
  const actions: string[] = []
  if (growthOverview.value.trialToPay < 20) {
    actions.push('优先优化报告页“试学 7 天”按钮文案与位置，提升 trial_start。')
  }
  if (growthOverview.value.learningOutputRate < 30) {
    actions.push('在专题页增加“导出成果包”前置提示，引导先完成 1 条任务后导出。')
  }
  if (topicPriorityKpis.value.highPending > 0) {
    actions.push('任务池默认展示待办并优先高优先级，减少执行偏离。')
  }
  if (growthOverview.value.retentionProxy < 3) {
    actions.push('增加每日最小行动提醒（完成 1 条任务或 1 次阶段打卡）。')
  }
  if (homeworkPendingCount.value > 0) {
    const overdueHint =
      homeworkOverdueCount.value > 0 ? `（${homeworkOverdueCount.value} 条已逾期）` : ''
    actions.unshift(
      `作业批改队列 ${homeworkPendingCount.value} 条待处理${overdueHint}：请在「真人批改队列」48h 内回复。`,
    )
  }
  if (notificationPendingCount.value > 0 || notificationFailedCount.value > 0) {
    const failedHint =
      notificationFailedCount.value > 0 ? `（${notificationFailedCount.value} 条发送失败）` : ''
    actions.unshift(
      `待发送通知 ${notificationPendingCount.value} 条${failedHint}：可一键 Webhook 发送或复制文案手动跟进。`,
    )
  }
  if (homeworkOverdueCount.value > 0 && notifyDispatchConfig.value.slaAlertConfigured) {
    actions.unshift(`SLA 逾期 ${homeworkOverdueCount.value} 条：可发送企微告警到主理人群。`)
  }
  if (!actions.length) {
    actions.push('当前链路健康，建议扩大样本并做 A/B 测试验证更优 CTA。')
  }
  return actions.slice(0, 3)
})

function countEventByVariant(name: string, variant: 'A' | 'B') {
  return events.value.filter((e) => e.name === name && String(e.payload?.variant || '') === variant).length
}

const abWinner = computed(() => {
  const reportExposeA = countEventByVariant('report_ab_variant_exposed', 'A')
  const reportExposeB = countEventByVariant('report_ab_variant_exposed', 'B')
  const reportClickA = countEventByVariant('report_cta_primary_tasks', 'A')
  const reportClickB = countEventByVariant('report_cta_primary_tasks', 'B')
  const reportRateA = ratio(reportClickA, reportExposeA)
  const reportRateB = ratio(reportClickB, reportExposeB)

  const payExposeA = countEventByVariant('pay_ab_variant_exposed', 'A')
  const payExposeB = countEventByVariant('pay_ab_variant_exposed', 'B')
  const payClickA = countEventByVariant('pay_click', 'A')
  const payClickB = countEventByVariant('pay_click', 'B')
  const payRateA = ratio(payClickA, payExposeA)
  const payRateB = ratio(payClickB, payExposeB)

  const reportWinner = reportRateA === reportRateB ? '平局' : reportRateA > reportRateB ? 'A' : 'B'
  const payWinner = payRateA === payRateB ? '平局' : payRateA > payRateB ? 'A' : 'B'
  const reportReady = reportExposeA >= AB_MIN_SAMPLE && reportExposeB >= AB_MIN_SAMPLE
  const payReady = payExposeA >= AB_MIN_SAMPLE && payExposeB >= AB_MIN_SAMPLE

  const reportLead = Math.abs(reportRateA - reportRateB)
  const payLead = Math.abs(payRateA - payRateB)

  return {
    report: {
      exposeA: reportExposeA,
      exposeB: reportExposeB,
      clickA: reportClickA,
      clickB: reportClickB,
      rateA: reportRateA,
      rateB: reportRateB,
      winner: reportWinner,
      ready: reportReady,
      minSample: AB_MIN_SAMPLE,
      leadPct: reportLead,
      autoLockEligible:
        reportReady && reportWinner !== '平局' && reportLead >= AB_MIN_LEAD_PCT,
      recommended: reportReady && reportWinner !== '平局' ? (reportWinner as 'A' | 'B') : null,
    },
    pay: {
      exposeA: payExposeA,
      exposeB: payExposeB,
      clickA: payClickA,
      clickB: payClickB,
      rateA: payRateA,
      rateB: payRateB,
      winner: payWinner,
      ready: payReady,
      minSample: AB_MIN_SAMPLE,
      leadPct: payLead,
      autoLockEligible: payReady && payWinner !== '平局' && payLead >= AB_MIN_LEAD_PCT,
      recommended: payReady && payWinner !== '平局' ? (payWinner as 'A' | 'B') : null,
    },
  }
})

const fixedVersionOverview = computed(() => {
  const reportLocked = !!reportForcedVariant.value
  const payLocked = !!payForcedVariant.value
  return {
    reportLocked,
    payLocked,
    reportVariant: reportForcedVariant.value || '随机分流',
    payVariant: payForcedVariant.value || '随机分流',
    reportAuto: autoLockMeta.value.report?.auto || false,
    payAuto: autoLockMeta.value.pay?.auto || false,
    reportLockedAt: autoLockMeta.value.report?.at || '',
    payLockedAt: autoLockMeta.value.pay?.at || '',
    anyLocked: reportLocked || payLocked,
  }
})

const unlockRetestAdvice = computed(() => {
  const now = new Date()
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  const dayMs = 24 * 60 * 60 * 1000
  const thisStart = fmt(new Date(now.getTime() - 6 * dayMs))
  const thisEnd = fmt(now)
  const lastStart = fmt(new Date(now.getTime() - 13 * dayMs))
  const lastEnd = fmt(new Date(now.getTime() - 7 * dayMs))

  const thisExpose =
    eventCountByDay('report_ab_variant_exposed', thisStart, thisEnd) +
    eventCountByDay('pay_ab_variant_exposed', thisStart, thisEnd)
  const lastExpose =
    eventCountByDay('report_ab_variant_exposed', lastStart, lastEnd) +
    eventCountByDay('pay_ab_variant_exposed', lastStart, lastEnd)

  if (!fixedVersionOverview.value.anyLocked) {
    return '当前未固定版本，继续随机分流采样即可。'
  }
  if (!lastExpose) {
    return '已固定版本，但历史曝光样本较少，建议先观察 1 周后再决定是否解锁重测。'
  }
  if (thisExpose < Math.round(lastExpose * 0.5)) {
    return '近 7 日 A/B 曝光明显衰减，建议解锁回随机分流，重新采集样本验证文案。'
  }
  return '固定版本仍在有效采样区间，暂不建议解锁。'
})

const weeklyRecapMarkdown = computed(() => {
  const lines = [
    `## ${new Date().toISOString().slice(0, 10)}（自动复盘）`,
    '',
    '### 指标快照',
    `- 报告 -> 周任务：${growthOverview.value.reportToTask}%`,
    `- 专题任务完成率：${growthOverview.value.topicTaskDone}%`,
    `- 学习产出率：${growthOverview.value.learningOutputRate}%`,
    `- 试学 -> 支付：${growthOverview.value.trialToPay}%`,
    `- 7日留存代理：${growthOverview.value.retentionProxy} 天`,
    '',
    '### A/B 胜负',
    `- 报告页 CTA：A=${abWinner.value.report.rateA}% / B=${abWinner.value.report.rateB}%（胜出：${abWinner.value.report.winner}）`,
    `- 支付页 CTA：A=${abWinner.value.pay.rateA}% / B=${abWinner.value.pay.rateB}%（胜出：${abWinner.value.pay.winner}）`,
    '',
    '### 下周动作',
    ...nextActions.value.map((a) => `- ${a}`),
    '',
  ]
  return lines.join('\n')
})

async function copyWeeklyRecap() {
  if (!import.meta.client || !navigator.clipboard) return
  await navigator.clipboard.writeText(weeklyRecapMarkdown.value)
  copiedWeeklyRecap.value = true
  trackEvent('ops_weekly_recap_copy')
  setTimeout(() => {
    copiedWeeklyRecap.value = false
  }, 1500)
}

function refreshForcedVariantState() {
  if (!import.meta.client) return
  const reportForced = localStorage.getItem(REPORT_CTA_FORCE_VARIANT_KEY)
  const payForced = localStorage.getItem(PAY_CTA_FORCE_VARIANT_KEY)
  reportForcedVariant.value = reportForced === 'A' || reportForced === 'B' ? reportForced : ''
  payForcedVariant.value = payForced === 'A' || payForced === 'B' ? payForced : ''
}

function setForcedVariant(
  target: 'report' | 'pay',
  variant: 'A' | 'B',
  options?: { auto?: boolean },
) {
  if (!import.meta.client) return
  const nextMeta = { ...readAbAutoLockMeta() }
  const entry = { variant, at: new Date().toISOString(), auto: !!options?.auto }
  if (target === 'report') {
    localStorage.setItem(REPORT_CTA_FORCE_VARIANT_KEY, variant)
    reportForcedVariant.value = variant
    nextMeta.report = entry
  } else {
    localStorage.setItem(PAY_CTA_FORCE_VARIANT_KEY, variant)
    payForcedVariant.value = variant
    nextMeta.pay = entry
  }
  autoLockMeta.value = nextMeta
  writeAbAutoLockMeta(nextMeta)
  trackEvent('ops_ab_force_variant_set', { target, variant, auto: !!options?.auto })
}

function clearForcedVariant(target: 'report' | 'pay') {
  if (!import.meta.client) return
  const nextMeta = { ...readAbAutoLockMeta() }
  if (target === 'report') {
    localStorage.removeItem(REPORT_CTA_FORCE_VARIANT_KEY)
    reportForcedVariant.value = ''
    delete nextMeta.report
  } else {
    localStorage.removeItem(PAY_CTA_FORCE_VARIANT_KEY)
    payForcedVariant.value = ''
    delete nextMeta.pay
  }
  autoLockMeta.value = nextMeta
  writeAbAutoLockMeta(nextMeta)
  trackEvent('ops_ab_force_variant_clear', { target })
}

function applyRecommendedWinners() {
  if (abWinner.value.report.recommended) {
    setForcedVariant('report', abWinner.value.report.recommended)
  }
  if (abWinner.value.pay.recommended) {
    setForcedVariant('pay', abWinner.value.pay.recommended)
  }
}

function tryAutoLockWinners() {
  const notices: string[] = []
  if (!reportForcedVariant.value && abWinner.value.report.autoLockEligible && abWinner.value.report.recommended) {
    setForcedVariant('report', abWinner.value.report.recommended, { auto: true })
    trackEvent('ops_ab_auto_lock', { target: 'report', variant: abWinner.value.report.recommended })
    notices.push(`报告页已自动定版为 ${abWinner.value.report.recommended}`)
  }
  if (!payForcedVariant.value && abWinner.value.pay.autoLockEligible && abWinner.value.pay.recommended) {
    setForcedVariant('pay', abWinner.value.pay.recommended, { auto: true })
    trackEvent('ops_ab_auto_lock', { target: 'pay', variant: abWinner.value.pay.recommended })
    notices.push(`支付页已自动定版为 ${abWinner.value.pay.recommended}`)
  }
  autoLockNotice.value = notices.join('；')
}

function rollbackAllToRandomSplit() {
  clearForcedVariant('report')
  clearForcedVariant('pay')
  autoLockNotice.value = '已回滚到随机分流（报告页 + 支付页）。'
  trackEvent('ops_ab_rollback_random_split')
}

async function loadHomeworkQueue() {
  homeworkLoadError.value = ''
  try {
    const res = await $fetch<{
      ok: boolean
      pendingCount: number
      reviewedCount: number
      overdueCount: number
      records: HomeworkQueueItem[]
    }>('/api/homework?status=pending_human&limit=10')
    homeworkQueue.value = res.records
    homeworkPendingCount.value = res.pendingCount
    homeworkReviewedCount.value = res.reviewedCount
    homeworkOverdueCount.value = res.overdueCount
  } catch {
    homeworkLoadError.value = '作业队列加载失败'
  }
}

async function loadNotifyDispatchConfig() {
  try {
    const res = await $fetch<{
      ok: boolean
      config: typeof notifyDispatchConfig.value
    }>('/api/notifications/config')
    notifyDispatchConfig.value = res.config
  } catch {
    // noop
  }
}

async function loadNotificationQueue() {
  notificationLoadError.value = ''
  try {
    const res = await $fetch<{
      ok: boolean
      pendingCount: number
      failedCount: number
      openedCount: number
      records: OutboundNotification[]
    }>('/api/notifications')
    notificationQueue.value = res.records
    notificationPendingCount.value = res.pendingCount
    notificationFailedCount.value = res.failedCount
    notificationOpenedCount.value = res.openedCount
  } catch {
    notificationLoadError.value = '通知队列加载失败'
  }
}

async function copyNotificationText(item: OutboundNotification) {
  if (!import.meta.client) return
  try {
    await navigator.clipboard.writeText(item.body)
    copiedNotificationId.value = item.id
    trackEvent('ops_notification_copy', { id: item.id, channel: item.channel })
    setTimeout(() => {
      if (copiedNotificationId.value === item.id) copiedNotificationId.value = ''
    }, 2000)
  } catch {
    notificationLoadError.value = '复制失败，请手动选中文案'
  }
}

async function markNotificationSent(id: string) {
  markingNotificationId.value = id
  try {
    await $fetch('/api/notifications/sent', {
      method: 'POST',
      body: { id },
    })
    trackEvent('ops_notification_mark_sent', { id })
    await loadNotificationQueue()
  } catch {
    notificationLoadError.value = '标记已发送失败'
  } finally {
    markingNotificationId.value = ''
  }
}

async function dispatchNotification(id: string) {
  dispatchingNotificationId.value = id
  notificationDispatchError.value = ''
  try {
    await $fetch('/api/notifications/dispatch', {
      method: 'POST',
      body: { id },
    })
    trackEvent('ops_notification_dispatch', { id })
    await loadNotificationQueue()
  } catch (error) {
    notificationDispatchError.value =
      error instanceof Error ? error.message : 'Webhook 发送失败，请改用手动复制'
    await loadNotificationQueue()
  } finally {
    dispatchingNotificationId.value = ''
  }
}

async function dispatchAllNotifications() {
  dispatchingAll.value = true
  notificationDispatchError.value = ''
  try {
    const res = await $fetch<{ ok: boolean; sent: number; failed: number; skipped: number }>(
      '/api/notifications/dispatch',
      { method: 'POST', body: { all: true } },
    )
    trackEvent('ops_notification_dispatch_all', {
      sent: res.sent,
      failed: res.failed,
      skipped: res.skipped,
    })
    await loadNotificationQueue()
  } catch {
    notificationDispatchError.value = '批量发送失败'
  } finally {
    dispatchingAll.value = false
  }
}

async function sendSlaOverdueAlert() {
  sendingSlaAlert.value = true
  notificationDispatchError.value = ''
  try {
    const res = await $fetch<{ ok: boolean; skipped?: boolean; reason?: string }>(
      '/api/homework/sla-alert',
      { method: 'POST' },
    )
    if (!res.ok && !res.skipped) {
      notificationDispatchError.value = 'SLA 告警发送失败'
    } else if (res.skipped) {
      notificationDispatchError.value = res.reason || '当前无需发送 SLA 告警'
    } else {
      trackEvent('ops_sla_alert_sent', { overdue: homeworkOverdueCount.value })
    }
  } catch {
    notificationDispatchError.value = 'SLA 告警发送失败'
  } finally {
    sendingSlaAlert.value = false
  }
}

async function seedOpsDemoData() {
  seedingOpsDemo.value = true
  opsDemoNotice.value = ''
  try {
    await $fetch('/api/demo/ops-seed', { method: 'POST' })
    await loadHomeworkQueue()
    await loadNotificationQueue()
    opsDemoNotice.value = '已生成演示运营数据：待批改、已发送未读、已打开、发送失败。'
    trackEvent('ops_demo_seed')
    setTimeout(() => {
      opsDemoNotice.value = ''
    }, 3000)
  } catch {
    opsDemoNotice.value = '演示数据生成失败，请稍后重试'
  } finally {
    seedingOpsDemo.value = false
  }
}

function canDispatchItem(item: OutboundNotification) {
  if (item.channel === 'wechat') return notifyDispatchConfig.value.wecomConfigured
  if (item.channel === 'email') return notifyDispatchConfig.value.mailConfigured
  return false
}

function homeworkSlaText(item: HomeworkQueueItem) {
  void opsNowTick.value
  if (!item.slaDueAt) return ''
  return formatSlaCountdown(item.slaDueAt)
}

function homeworkSlaClass(item: HomeworkQueueItem) {
  void opsNowTick.value
  if (!item.slaDueAt) return 'text-slate-500'
  return isSlaOverdue(item.slaDueAt) ? 'text-rose-600 font-medium' : 'text-amber-700'
}

function notifyChannelLabel(channel?: string) {
  if (channel === 'email') return '邮件'
  if (channel === 'wechat') return '企微/微信'
  return '未知渠道'
}

function notificationStatusLabel(item: OutboundNotification) {
  if (item.openedAt) return '已打开'
  if (item.status === 'sent') return '已发送未读'
  if (item.status === 'failed') return '发送失败'
  return '待发送'
}

function notificationStatusClass(item: OutboundNotification) {
  if (item.openedAt) return 'text-emerald-700 bg-emerald-50 border-emerald-200'
  if (item.status === 'sent') return 'text-sky-700 bg-sky-50 border-sky-200'
  if (item.status === 'failed') return 'text-rose-700 bg-rose-50 border-rose-200'
  return 'text-amber-700 bg-amber-50 border-amber-200'
}

async function submitHomeworkReview(id: string) {
  const humanFeedback = homeworkReviewDrafts.value[id]?.trim()
  if (!humanFeedback || humanFeedback.length < 10) return
  homeworkReviewingId.value = id
  try {
    await $fetch('/api/homework/review', {
      method: 'POST',
      body: { id, humanFeedback, reviewer: '陈总监' },
    })
    trackEvent('ops_homework_review_submit', { id })
    delete homeworkReviewDrafts.value[id]
    await loadHomeworkQueue()
    await loadNotificationQueue()
  } catch {
    homeworkLoadError.value = '批改提交失败'
  } finally {
    homeworkReviewingId.value = ''
  }
}

function homeworkTypeLabel(type: string) {
  return homeworkTypeLabels[type as keyof typeof homeworkTypeLabels] || type
}

const priorityRiskAlert = computed(() => {
  if (!topicPriorityKpis.value.total) {
    return {
      level: 'neutral',
      title: '暂无专题任务数据',
      action: '先在专题页加入 Top2 任务，建立可观测样本。',
    }
  }

  if (topicPriorityKpis.value.highPending > 0 && topicPriorityKpis.value.lowRate > topicPriorityKpis.value.highRate) {
    return {
      level: 'high',
      title: '优先级倒挂风险',
      action: '高优先级待办未清，低优先级完成率更高。建议任务池默认先处理高优先级。',
    }
  }

  if (topicPriorityKpis.value.highRate < 40) {
    return {
      level: 'medium',
      title: '高优先级执行偏慢',
      action: '建议每天先完成 1 条高优先级任务，再处理中/低优先级任务。',
    }
  }

  return {
    level: 'good',
    title: '优先级执行健康',
    action: '当前执行顺序基本合理，可继续提升高优先级清单转化率。',
  }
})
</script>

<template>
  <div v-if="founderMode" class="space-y-6">
    <section class="glass-panel rounded-2xl border border-slate-200 p-6">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 class="text-2xl font-bold text-primary">运营看板（本地版）</h1>
          <p class="mt-2 text-sm text-slate-600">
            统计自测、学习点击、清单导出、报名等关键行为，辅助你做迭代决策。
          </p>
        </div>
        <button
          type="button"
          class="rounded-lg border border-primary bg-white px-4 py-2 text-sm font-medium text-primary hover:bg-slate-50 disabled:opacity-50"
          :disabled="seedingOpsDemo"
          @click="seedOpsDemoData"
        >
          {{ seedingOpsDemo ? '生成中...' : '一键生成演示数据' }}
        </button>
      </div>
      <p
        v-if="opsDemoNotice"
        class="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700"
      >
        {{ opsDemoNotice }}
      </p>
      <div class="mt-4 grid gap-3 sm:grid-cols-3">
        <div class="rounded-xl border border-slate-200 bg-white p-3">
          <p class="text-xs text-slate-500">累计事件数</p>
          <p class="mt-1 text-xl font-semibold text-primary">{{ total }}</p>
        </div>
        <div class="rounded-xl border border-slate-200 bg-white p-3">
          <p class="text-xs text-slate-500">今日事件数</p>
          <p class="mt-1 text-xl font-semibold text-primary">{{ todayCount }}</p>
        </div>
        <div class="rounded-xl border border-slate-200 bg-white p-3">
          <p class="text-xs text-slate-500">最近更新</p>
          <p class="mt-1 text-sm font-medium text-primary">{{ recentEvents[0]?.day || '暂无' }}</p>
        </div>
      </div>
    </section>

    <section class="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 class="text-lg font-semibold text-primary">增长总览卡（统一视图）</h2>
      <p class="mt-1 text-sm text-slate-600">将报告漏斗与专题漏斗统一到一组北极星指标，减少多区块切换成本。</p>
      <div class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div class="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p class="text-xs text-slate-500">报告 -> 周任务</p>
          <p class="mt-1 text-xl font-semibold text-primary">{{ growthOverview.reportToTask }}%</p>
        </div>
        <div class="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p class="text-xs text-slate-500">专题任务完成率</p>
          <p class="mt-1 text-xl font-semibold text-primary">{{ growthOverview.topicTaskDone }}%</p>
        </div>
        <div class="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p class="text-xs text-slate-500">学习产出率</p>
          <p class="mt-1 text-xl font-semibold text-primary">{{ growthOverview.learningOutputRate }}%</p>
        </div>
        <div class="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p class="text-xs text-slate-500">试学 -> 支付</p>
          <p class="mt-1 text-xl font-semibold text-primary">{{ growthOverview.trialToPay }}%</p>
        </div>
        <div class="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p class="text-xs text-slate-500">7日留存代理</p>
          <p class="mt-1 text-xl font-semibold text-primary">{{ growthOverview.retentionProxy }} 天</p>
        </div>
      </div>
    </section>

    <section class="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 class="text-lg font-semibold text-primary">核心转化指标（收敛版）</h2>
      <p class="mt-1 text-sm text-slate-600">优先追踪 2 个主指标：自测完成率、任务到清单转化率。</p>
      <div class="mt-4 grid gap-3 sm:grid-cols-2">
        <div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p class="text-xs text-slate-500">自测完成率</p>
          <p class="mt-1 text-2xl font-semibold text-primary">{{ coreKpis.assessmentCompletionRate }}%</p>
          <p class="mt-1 text-xs text-slate-500">
            开始答题 {{ coreKpis.quizStarted }} · 完成 {{ coreKpis.assessmentCompleted }}
          </p>
        </div>
        <div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p class="text-xs text-slate-500">任务 → 清单转化率</p>
          <p class="mt-1 text-2xl font-semibold text-primary">{{ coreKpis.taskChecklistRate }}%</p>
          <p class="mt-1 text-xs text-slate-500">
            任务访问 {{ coreKpis.tasksView }} · 打开清单 {{ coreKpis.tasksToChecklist }}
          </p>
        </div>
      </div>
    </section>

    <section class="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 class="text-lg font-semibold text-primary">周对比与显著变化</h2>
      <p class="mt-1 text-sm text-slate-600">当前周期：{{ weekCompare.thisRange }}（对比 {{ weekCompare.lastRange }}）。</p>
      <div class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div class="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p class="text-xs text-slate-500">报告访问</p>
          <p class="mt-1 text-sm font-semibold text-primary">
            {{ deltaText(weekCompare.thisData.reportView, weekCompare.lastData.reportView) }}
          </p>
        </div>
        <div class="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p class="text-xs text-slate-500">专题完成数</p>
          <p class="mt-1 text-sm font-semibold text-primary">
            {{ deltaText(weekCompare.thisData.topicDone, weekCompare.lastData.topicDone, '条') }}
          </p>
        </div>
        <div class="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p class="text-xs text-slate-500">学习产出率</p>
          <p class="mt-1 text-sm font-semibold text-primary">
            {{ deltaText(weekCompare.thisData.learningOutputRate, weekCompare.lastData.learningOutputRate, '%') }}
          </p>
        </div>
        <div class="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p class="text-xs text-slate-500">试学到支付</p>
          <p class="mt-1 text-sm font-semibold text-primary">
            {{ deltaText(weekCompare.thisData.trialToPay, weekCompare.lastData.trialToPay, '%') }}
          </p>
        </div>
        <div class="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p class="text-xs text-slate-500">7日留存代理</p>
          <p class="mt-1 text-sm font-semibold text-primary">
            {{ deltaText(weekCompare.thisData.retentionProxy, weekCompare.lastData.retentionProxy, '天') }}
          </p>
        </div>
      </div>
      <ul class="mt-3 list-disc space-y-1 pl-5 text-xs text-slate-600">
        <li v-for="tip in significantChanges" :key="tip">{{ tip }}</li>
      </ul>
    </section>

    <section class="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 class="text-lg font-semibold text-primary">本周下一步动作（自动建议）</h2>
      <p class="mt-1 text-sm text-slate-600">基于当前漏斗与周对比自动生成，直接可执行。</p>
      <button
        type="button"
        class="mt-3 rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
        @click="copyWeeklyRecap"
      >
        {{ copiedWeeklyRecap ? '已复制到剪贴板' : '一键复制为复盘日志条目' }}
      </button>
      <ul class="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
        <li v-for="action in nextActions" :key="action">{{ action }}</li>
      </ul>
    </section>

    <section class="rounded-2xl border border-violet-200 bg-violet-50/30 p-6">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 class="text-lg font-semibold text-primary">真人批改队列</h2>
          <p class="mt-1 text-sm text-slate-600">
            待批改 {{ homeworkPendingCount }}
            <span v-if="homeworkOverdueCount > 0" class="text-rose-600">
              · 逾期 {{ homeworkOverdueCount }}
            </span>
            · 累计已批改 {{ homeworkReviewedCount }}
          </p>
        </div>
        <button
          type="button"
          class="rounded-lg border border-slate-300 px-3 py-1.5 text-xs hover:bg-white"
          @click="loadHomeworkQueue"
        >
          刷新队列
        </button>
        <button
          v-if="homeworkOverdueCount > 0 && notifyDispatchConfig.slaAlertConfigured"
          type="button"
          class="rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs text-rose-700 hover:bg-rose-100 disabled:opacity-50"
          :disabled="sendingSlaAlert"
          @click="sendSlaOverdueAlert"
        >
          {{ sendingSlaAlert ? '发送中...' : '企微 SLA 告警' }}
        </button>
      </div>
      <p v-if="homeworkLoadError" class="mt-2 text-xs text-rose-600">{{ homeworkLoadError }}</p>
      <div v-if="!homeworkQueue.length" class="mt-3 rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
        暂无待批改作业。学员在 `/tools/homework` 勾选「申请真人批改」后会出现在此。
      </div>
      <article
        v-for="item in homeworkQueue"
        :key="item.id"
        class="mt-3 rounded-xl border border-violet-100 bg-white p-4 text-sm"
      >
        <div class="flex flex-wrap items-center justify-between gap-2">
          <p class="font-medium text-primary">{{ item.title }}</p>
          <span class="text-xs text-slate-500">{{ homeworkTypeLabel(item.type) }}</span>
        </div>
        <p class="mt-1 text-xs text-slate-500">
          {{ new Date(item.createdAt).toLocaleString('zh-CN') }}
          <span v-if="item.contact"> · 联系：{{ item.contact }}</span>
          <span v-if="item.notifyChannel"> · {{ notifyChannelLabel(item.notifyChannel) }}</span>
          <span v-if="item.slaDueAt" :class="homeworkSlaClass(item)">
            · SLA {{ homeworkSlaText(item) }}
          </span>
        </p>
        <p class="mt-2 max-h-32 overflow-y-auto text-xs text-slate-700 whitespace-pre-wrap">{{ item.content }}</p>
        <textarea
          v-model="homeworkReviewDrafts[item.id]"
          rows="3"
          class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
          placeholder="输入真人批改意见（≥10 字）..."
        />
        <button
          type="button"
          class="mt-2 rounded-lg bg-accent px-3 py-1.5 text-xs text-white hover:bg-accent-hover disabled:opacity-50"
          :disabled="homeworkReviewingId === item.id"
          @click="submitHomeworkReview(item.id)"
        >
          {{ homeworkReviewingId === item.id ? '提交中...' : '提交批改' }}
        </button>
      </article>
    </section>

    <section class="rounded-2xl border border-sky-200 bg-sky-50/30 p-6">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 class="text-lg font-semibold text-primary">通知触达状态</h2>
          <p class="mt-1 text-sm text-slate-600">
            批改完成后自动生成文案；配置 Webhook 后可一键发送，并追踪学员是否打开详情页。
          </p>
          <p class="mt-1 text-xs text-slate-500">
            企微 {{ notifyDispatchConfig.wecomConfigured ? '已配置' : '未配置' }}
            · 邮件 {{ notifyDispatchConfig.mailConfigured ? '已配置' : '未配置' }}
            · 自动发送 {{ notifyDispatchConfig.autoDispatch ? '开' : '关' }}
            · 已打开 {{ notificationOpenedCount }}
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button
            v-if="notifyDispatchConfig.wecomConfigured || notifyDispatchConfig.mailConfigured"
            type="button"
            class="rounded-lg bg-accent px-3 py-1.5 text-xs text-white hover:bg-accent-hover disabled:opacity-50"
            :disabled="dispatchingAll || actionableNotificationCount === 0"
            @click="dispatchAllNotifications"
          >
            {{ dispatchingAll ? '发送中...' : '一键发送待办' }}
          </button>
          <button
            type="button"
            class="rounded-lg border border-slate-300 px-3 py-1.5 text-xs hover:bg-white"
            @click="loadNotificationQueue"
          >
            刷新通知
          </button>
        </div>
      </div>
      <p v-if="notificationLoadError" class="mt-2 text-xs text-rose-600">{{ notificationLoadError }}</p>
      <p v-if="notificationDispatchError" class="mt-2 text-xs text-amber-700">{{ notificationDispatchError }}</p>
      <div
        v-if="!notificationQueue.length"
        class="mt-3 rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500"
      >
        暂无通知记录。提交批改后会在此生成通知并展示触达状态。
      </div>
      <article
        v-for="item in notificationQueue"
        :key="item.id"
        class="mt-3 rounded-xl border bg-white p-4 text-sm"
        :class="item.status === 'failed' ? 'border-rose-200' : 'border-sky-100'"
      >
        <div class="flex flex-wrap items-center justify-between gap-2">
          <p class="font-medium text-primary">{{ item.subject }}</p>
          <div class="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span>{{ notifyChannelLabel(item.channel) }} · {{ item.contact }}</span>
            <span
              class="rounded-full border px-2 py-0.5"
              :class="notificationStatusClass(item)"
            >
              {{ notificationStatusLabel(item) }}
            </span>
            <span v-if="item.autoDispatched" class="text-emerald-600">自动发送</span>
          </div>
        </div>
        <p v-if="item.sentAt || item.openedAt" class="mt-1 text-xs text-slate-500">
          <span v-if="item.sentAt">发送：{{ new Date(item.sentAt).toLocaleString('zh-CN') }}</span>
          <span v-if="item.openedAt"> · 打开：{{ new Date(item.openedAt).toLocaleString('zh-CN') }}</span>
        </p>
        <p v-if="item.dispatchError" class="mt-1 text-xs text-rose-600">{{ item.dispatchError }}</p>
        <pre class="mt-2 whitespace-pre-wrap rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs text-slate-700">{{ item.body }}</pre>
        <div class="mt-2 flex flex-wrap gap-2">
          <button
            v-if="canDispatchItem(item) && item.status !== 'sent'"
            type="button"
            class="rounded-lg border border-sky-300 bg-sky-50 px-3 py-1.5 text-xs text-sky-800 hover:bg-sky-100 disabled:opacity-50"
            :disabled="dispatchingNotificationId === item.id"
            @click="dispatchNotification(item.id)"
          >
            {{ dispatchingNotificationId === item.id ? '发送中...' : 'Webhook 发送' }}
          </button>
          <button
            type="button"
            class="rounded-lg border border-slate-300 px-3 py-1.5 text-xs hover:bg-slate-50"
            @click="copyNotificationText(item)"
          >
            {{ copiedNotificationId === item.id ? '已复制' : '复制文案' }}
          </button>
          <button
            v-if="item.status !== 'sent'"
            type="button"
            class="rounded-lg bg-accent px-3 py-1.5 text-xs text-white hover:bg-accent-hover disabled:opacity-50"
            :disabled="markingNotificationId === item.id"
            @click="markNotificationSent(item.id)"
          >
            {{ markingNotificationId === item.id ? '标记中...' : '标记已发送' }}
          </button>
        </div>
      </article>
    </section>

    <section class="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 class="text-lg font-semibold text-primary">固定版本状态总览</h2>
      <p class="mt-1 text-sm text-slate-600">查看当前是否已锁定 A/B 胜出版本，并决定是否回滚重测。</p>
      <div class="mt-4 grid gap-3 sm:grid-cols-2">
        <article class="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p class="text-sm font-semibold text-primary">报告页</p>
          <p class="mt-1 text-xs text-slate-600">
            当前：{{ fixedVersionOverview.reportVariant }}
            <span v-if="fixedVersionOverview.reportAuto">（自动定版）</span>
          </p>
          <p v-if="fixedVersionOverview.reportLockedAt" class="mt-1 text-xs text-slate-500">
            定版时间：{{ new Date(fixedVersionOverview.reportLockedAt).toLocaleString('zh-CN') }}
          </p>
        </article>
        <article class="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p class="text-sm font-semibold text-primary">支付页</p>
          <p class="mt-1 text-xs text-slate-600">
            当前：{{ fixedVersionOverview.payVariant }}
            <span v-if="fixedVersionOverview.payAuto">（自动定版）</span>
          </p>
          <p v-if="fixedVersionOverview.payLockedAt" class="mt-1 text-xs text-slate-500">
            定版时间：{{ new Date(fixedVersionOverview.payLockedAt).toLocaleString('zh-CN') }}
          </p>
        </article>
      </div>
      <p class="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
        解锁建议：{{ unlockRetestAdvice }}
      </p>
      <p v-if="autoLockNotice" class="mt-2 text-xs text-emerald-700">{{ autoLockNotice }}</p>
      <button
        type="button"
        class="mt-3 rounded-lg border border-rose-300 px-3 py-1.5 text-xs text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"
        :disabled="!fixedVersionOverview.anyLocked"
        @click="rollbackAllToRandomSplit"
      >
        一键回滚到随机分流
      </button>
    </section>

    <section class="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 class="text-lg font-semibold text-primary">A/B 胜负判断卡</h2>
      <p class="mt-1 text-sm text-slate-600">按“曝光 -> 点击”口径比较报告页与支付页 CTA 表现。</p>
      <button
        type="button"
        class="mt-3 rounded-lg border border-primary px-3 py-1.5 text-xs text-primary hover:bg-slate-50"
        @click="applyRecommendedWinners"
      >
        一键应用推荐固定版本
      </button>
      <button
        type="button"
        class="mt-3 ml-2 rounded-lg border border-emerald-300 px-3 py-1.5 text-xs text-emerald-700 hover:bg-emerald-50"
        @click="tryAutoLockWinners"
      >
        手动触发自动定版检查
      </button>
      <div class="mt-4 grid gap-3 sm:grid-cols-2">
        <article class="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p class="text-sm font-semibold text-primary">报告页 CTA</p>
          <p class="mt-1 text-xs text-slate-600">
            A：{{ abWinner.report.rateA }}%（{{ abWinner.report.clickA }}/{{ abWinner.report.exposeA }}）
            · B：{{ abWinner.report.rateB }}%（{{ abWinner.report.clickB }}/{{ abWinner.report.exposeB }}）
          </p>
          <p class="mt-2 text-xs text-slate-700">
            {{
              abWinner.report.ready
                ? `当前胜出：${abWinner.report.winner}（领先 ${abWinner.report.leadPct}%）`
                : `样本不足（需 A/B 各 ${abWinner.report.minSample} 次曝光）`
            }}
          </p>
          <p v-if="abWinner.report.autoLockEligible" class="mt-1 text-xs text-emerald-700">已满足自动定版条件</p>
          <p class="mt-1 text-xs text-slate-500">当前固定版本：{{ reportForcedVariant || '未固定' }}</p>
          <div class="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              class="rounded border border-slate-300 px-2 py-1 text-[11px] text-slate-700 hover:bg-white"
              :disabled="!abWinner.report.recommended"
              :class="!abWinner.report.recommended ? 'cursor-not-allowed opacity-50' : ''"
              @click="abWinner.report.recommended && setForcedVariant('report', abWinner.report.recommended)"
            >
              固定胜出版本（{{ abWinner.report.recommended || '-' }}）
            </button>
            <button
              type="button"
              class="rounded border border-slate-300 px-2 py-1 text-[11px] text-slate-700 hover:bg-white"
              @click="clearForcedVariant('report')"
            >
              清除固定
            </button>
          </div>
        </article>
        <article class="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p class="text-sm font-semibold text-primary">支付页 CTA</p>
          <p class="mt-1 text-xs text-slate-600">
            A：{{ abWinner.pay.rateA }}%（{{ abWinner.pay.clickA }}/{{ abWinner.pay.exposeA }}）
            · B：{{ abWinner.pay.rateB }}%（{{ abWinner.pay.clickB }}/{{ abWinner.pay.exposeB }}）
          </p>
          <p class="mt-2 text-xs text-slate-700">
            {{
              abWinner.pay.ready
                ? `当前胜出：${abWinner.pay.winner}（领先 ${abWinner.pay.leadPct}%）`
                : `样本不足（需 A/B 各 ${abWinner.pay.minSample} 次曝光）`
            }}
          </p>
          <p v-if="abWinner.pay.autoLockEligible" class="mt-1 text-xs text-emerald-700">已满足自动定版条件</p>
          <p class="mt-1 text-xs text-slate-500">当前固定版本：{{ payForcedVariant || '未固定' }}</p>
          <div class="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              class="rounded border border-slate-300 px-2 py-1 text-[11px] text-slate-700 hover:bg-white"
              :disabled="!abWinner.pay.recommended"
              :class="!abWinner.pay.recommended ? 'cursor-not-allowed opacity-50' : ''"
              @click="abWinner.pay.recommended && setForcedVariant('pay', abWinner.pay.recommended)"
            >
              固定胜出版本（{{ abWinner.pay.recommended || '-' }}）
            </button>
            <button
              type="button"
              class="rounded border border-slate-300 px-2 py-1 text-[11px] text-slate-700 hover:bg-white"
              @click="clearForcedVariant('pay')"
            >
              清除固定
            </button>
          </div>
        </article>
      </div>
    </section>

    <section class="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 class="text-lg font-semibold text-primary">报告页转化漏斗</h2>
      <p class="mt-1 text-sm text-slate-600">用于观察「报告 -> 周任务 -> 学习/清单」的真实转化。</p>
      <div class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div class="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p class="text-xs text-slate-500">报告页访问</p>
          <p class="mt-1 text-xl font-semibold text-primary">{{ funnel.reportView }}</p>
        </div>
        <div class="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p class="text-xs text-slate-500">进入周任务</p>
          <p class="mt-1 text-xl font-semibold text-primary">{{ funnel.toTasks }}</p>
          <p class="mt-1 text-xs text-slate-500">转化 {{ funnel.tasksRate }}%</p>
        </div>
        <div class="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p class="text-xs text-slate-500">去短板资源</p>
          <p class="mt-1 text-xl font-semibold text-primary">{{ funnel.toResources }}</p>
          <p class="mt-1 text-xs text-slate-500">转化 {{ funnel.resourcesRate }}%</p>
        </div>
        <div class="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p class="text-xs text-slate-500">同步到清单</p>
          <p class="mt-1 text-xl font-semibold text-primary">{{ funnel.toChecklist }}</p>
          <p class="mt-1 text-xs text-slate-500">转化 {{ funnel.checklistRate }}%</p>
        </div>
        <div class="rounded-xl border border-accent/30 bg-accent-muted/20 p-3">
          <p class="text-xs text-slate-500">次级动作总转化</p>
          <p class="mt-1 text-xl font-semibold text-accent">{{ funnel.anySecondary }}</p>
          <p class="mt-1 text-xs text-slate-500">转化 {{ funnel.secondaryRate }}%</p>
        </div>
      </div>
      <p class="mt-3 text-xs text-slate-500">
        说明：该漏斗为本地埋点统计（当前浏览器），用于快速验证 CTA 是否有效。
      </p>
    </section>

    <section class="rounded-2xl border border-indigo-200 bg-indigo-50/30 p-6">
      <h2 class="text-lg font-semibold text-primary">专题学习转化漏斗</h2>
      <p class="mt-1 text-sm text-slate-600">观察「专题访问 -> 加入任务 -> 完成打卡 -> 同步清单」执行链路。</p>
      <div class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div class="rounded-xl border border-slate-200 bg-white p-3">
          <p class="text-xs text-slate-500">专题页访问</p>
          <p class="mt-1 text-xl font-semibold text-primary">{{ topicFunnel.topicView }}</p>
        </div>
        <div class="rounded-xl border border-slate-200 bg-white p-3">
          <p class="text-xs text-slate-500">加入任务（Top2）</p>
          <p class="mt-1 text-xl font-semibold text-primary">{{ topicFunnel.addTop2 }}</p>
        </div>
        <div class="rounded-xl border border-slate-200 bg-white p-3">
          <p class="text-xs text-slate-500">加入任务（单条）</p>
          <p class="mt-1 text-xl font-semibold text-primary">{{ topicFunnel.addSingle }}</p>
          <p class="mt-1 text-xs text-slate-500">加入率 {{ topicFunnel.addRate }}%</p>
        </div>
        <div class="rounded-xl border border-slate-200 bg-white p-3">
          <p class="text-xs text-slate-500">任务完成打卡</p>
          <p class="mt-1 text-xl font-semibold text-primary">{{ topicFunnel.topicDone }}</p>
          <p class="mt-1 text-xs text-slate-500">完成率 {{ topicFunnel.doneRate }}%</p>
        </div>
        <div class="rounded-xl border border-accent/30 bg-accent-muted/20 p-3">
          <p class="text-xs text-slate-500">同步清单</p>
          <p class="mt-1 text-xl font-semibold text-accent">{{ topicFunnel.toChecklist }}</p>
          <p class="mt-1 text-xs text-slate-500">转化 {{ topicFunnel.checklistRate }}%</p>
        </div>
      </div>
      <p class="mt-3 text-xs text-slate-500">
        说明：同一用户多次操作会累计计数，用于比较不同版本链路优化是否有效。
      </p>
      <div class="mt-3 rounded-xl border border-indigo-200 bg-white p-3">
        <p class="text-xs text-slate-500">当前瓶颈</p>
        <p class="mt-1 text-sm font-semibold text-primary">{{ topicDiagnosis.bottleneck }}</p>
        <p class="mt-1 text-xs text-slate-600">建议动作：{{ topicDiagnosis.action }}</p>
      </div>
      <div class="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div class="rounded-xl border border-slate-200 bg-white p-3">
          <p class="text-xs text-slate-500">专题任务整体完成率</p>
          <p class="mt-1 text-xl font-semibold text-primary">{{ topicPriorityKpis.overallRate }}%</p>
          <p class="mt-1 text-xs text-slate-500">{{ topicPriorityKpis.done }}/{{ topicPriorityKpis.total }}</p>
        </div>
        <div class="rounded-xl border border-rose-200 bg-white p-3">
          <p class="text-xs text-slate-500">高优先级完成率</p>
          <p class="mt-1 text-xl font-semibold text-rose-700">{{ topicPriorityKpis.highRate }}%</p>
          <p class="mt-1 text-xs text-slate-500">{{ topicPriorityKpis.highDone }}/{{ topicPriorityKpis.highTotal }}</p>
        </div>
        <div class="rounded-xl border border-amber-200 bg-white p-3">
          <p class="text-xs text-slate-500">中优先级完成率</p>
          <p class="mt-1 text-xl font-semibold text-amber-700">{{ topicPriorityKpis.mediumRate }}%</p>
          <p class="mt-1 text-xs text-slate-500">{{ topicPriorityKpis.mediumDone }}/{{ topicPriorityKpis.mediumTotal }}</p>
        </div>
        <div class="rounded-xl border border-slate-200 bg-white p-3">
          <p class="text-xs text-slate-500">低优先级完成率</p>
          <p class="mt-1 text-xl font-semibold text-slate-700">{{ topicPriorityKpis.lowRate }}%</p>
          <p class="mt-1 text-xs text-slate-500">{{ topicPriorityKpis.lowDone }}/{{ topicPriorityKpis.lowTotal }}</p>
        </div>
      </div>
      <div
        class="mt-3 rounded-xl border p-3"
        :class="
          priorityRiskAlert.level === 'high'
            ? 'border-rose-200 bg-rose-50'
            : priorityRiskAlert.level === 'medium'
              ? 'border-amber-200 bg-amber-50'
              : priorityRiskAlert.level === 'good'
                ? 'border-emerald-200 bg-emerald-50'
                : 'border-slate-200 bg-white'
        "
      >
        <p class="text-xs text-slate-500">优先级偏离告警</p>
        <p class="mt-1 text-sm font-semibold text-primary">{{ priorityRiskAlert.title }}</p>
        <p class="mt-1 text-xs text-slate-600">{{ priorityRiskAlert.action }}</p>
      </div>
    </section>

    <section class="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 class="text-lg font-semibold text-primary">关键行为分布</h2>
      <ul class="mt-3 space-y-2 text-sm">
        <li
          v-for="[name, count] in byName"
          :key="name"
          class="rounded-lg border border-slate-100 bg-slate-50 p-3"
        >
          <div class="flex items-center justify-between gap-2">
            <span class="font-medium text-primary">{{ name }}</span>
            <span class="text-slate-600">{{ count }}</span>
          </div>
        </li>
      </ul>
    </section>

    <section class="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 class="text-lg font-semibold text-primary">指标口径说明</h2>
      <ul class="mt-3 list-disc space-y-1 pl-5 text-xs text-slate-600">
        <li>学习产出率 = `topic_outcome_pack_exported / resource_ai_topic_view`</li>
        <li>7日留存代理 = 近7天内发生“任务完成或阶段打卡”的活跃天数</li>
        <li>试学到支付转化 = `pay_click / trial_start`</li>
        <li>报告到任务转化 = `report_cta_primary_tasks / report_view`</li>
      </ul>
    </section>

    <section class="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 class="text-lg font-semibold text-primary">最近事件（30条）</h2>
      <ul class="mt-3 space-y-2 text-xs text-slate-600">
        <li
          v-for="(event, idx) in recentEvents"
          :key="`${event.at}-${idx}`"
          class="rounded-lg border border-slate-100 bg-slate-50 p-2.5"
        >
          <span class="font-medium text-primary">{{ event.name }}</span>
          <span class="mx-1 text-slate-400">·</span>
          <span>{{ new Date(event.at).toLocaleString('zh-CN') }}</span>
        </li>
      </ul>
    </section>
  </div>
  <div v-else class="mx-auto max-w-2xl space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
    <h1 class="text-xl font-semibold text-primary">运营看板受限</h1>
    <p class="text-sm text-slate-600">该页面仅在主理人模式下可见，用于运营数据与漏斗监控。</p>
    <NuxtLink to="/founder" class="inline-block rounded-lg border border-primary px-4 py-2 text-sm text-primary hover:bg-slate-50">
      前往主理人页开启模式 →
    </NuxtLink>
  </div>
</template>
