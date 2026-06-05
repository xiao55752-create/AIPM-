import type { PublicSharePayload } from '~/lib/share-payload'

export const demoShareSlug = 'demo-copilot-eval'

export const demoShare: PublicSharePayload = {
  slug: demoShareSlug,
  title: '项目 Lab · 客服 Copilot Eval 改造',
  subtitle: '从“能回答”到“可上线”：围绕客服知识库问答建立 Eval 门禁与灰度策略。',
  kind: 'project-lab',
  score: 88,
  stage: '项目实战',
  role: 'AI PM',
  highlights: [
    '明确 MVP 边界',
    '建立 40 条黄金测试集',
    '识别 4 类 Badcase',
    '输出上线 Go/No-Go 门禁',
  ],
  body: [
    '### 项目背景',
    '客服团队每天处理约 1,200 条售后咨询，其中 35% 集中在发票、退款、物流和账号问题。原有知识库搜索依赖人工关键词，平均响应耗时约 4 分钟。',
    '',
    '### MVP 边界',
    '- 做：售后 FAQ 问答、知识库召回、答案引用来源、低置信度转人工',
    '- 不做：订单状态实时查询、复杂投诉仲裁、多轮销售推荐',
    '',
    '### Eval 设计',
    '- 黄金测试集：40 条真实脱敏问题，覆盖发票、退款、物流、账号 4 类场景',
    '- 核心指标：准确率 >= 85%，引用命中率 >= 90%，高风险误答 = 0',
    '- Badcase 分类：知识缺失、召回错误、答案过度推断、格式不合规',
    '',
    '### 关键结果',
    '- 首轮准确率：72% -> 86%',
    '- 高风险误答：3 条 -> 0 条',
    '- 低置信度转人工策略覆盖 12 条边界问题',
    '',
    '### 下一步',
    '灰度到 20% 售后工单，连续 7 天监控人工接管率、满意度与异常投诉，再决定是否扩大到全量。',
    '',
    '---',
    '简历一句话：主导客服 Copilot Eval 体系建设，基于 40 条黄金测试集和 4 类 Badcase 分类，将问答准确率从 72% 提升到 86%，并建立高风险误答为 0 的上线门禁。',
  ].join('\n'),
  publishedAt: '2026-06-03T10:00:00.000Z',
}

export const demoAssets = {
  projectTitle: '客服 Copilot Eval 改造',
  pitchTitle: '5 分钟路演：客服 Copilot 从试点到上线',
  reviewSummary: '主理人建议：补充灰度监控口径，并把“转人工策略”写进风险控制章节。',
  notificationStatus: '已自动发送 · 学员已打开',
}

export const demoProjectLabProgress = {
  projectId: 'eval-cycle',
  fields: {
    framework: [
      '离线集：40 条脱敏客服问题，覆盖发票、退款、物流、账号 4 类高频场景。',
      '在线监控：每日抽样 5% 会话，监控准确率、引用命中率、低置信度转人工率。',
      '人工抽检：每周由客服主管复核 20 条边界样本，更新黄金测试集。',
    ].join('\n'),
    metrics: [
      '准确率：目标 >= 85%，低于 80% 不扩量。',
      '引用命中率：目标 >= 90%，答案必须能追溯到知识库原文。',
      '高风险误答：目标 = 0，涉及退款承诺、赔付政策必须转人工。',
    ].join('\n'),
    badcases: [
      '1. 知识缺失：新退款政策未同步，答案仍引用旧规则。',
      '2. 召回错误：物流延迟问题误召回到退货流程。',
      '3. 过度推断：用户只问发票抬头，模型主动建议退货。',
      '4. 格式不合规：未展示引用来源，客服无法复核。',
      '5. 边界识别弱：投诉升级类问题未及时转人工。',
    ].join('\n'),
    fix: [
      '数据：将政策文档更新频率从每月改为每周，负责人：客服运营。',
      'Prompt：强制输出“引用来源 + 置信度 + 是否转人工”，负责人：AI PM。',
      '流程：高风险关键词命中时直接触发人工接管，负责人：客服主管。',
      '模型：保留当前模型，先通过检索和流程兜底降低误答。',
    ].join('\n'),
    review: [
      '准确率：72% -> 86%。',
      '引用命中率：81% -> 92%。',
      '高风险误答：3 条 -> 0 条。',
      '剩余风险：长尾政策问题仍依赖运营及时更新知识库，灰度期继续人工抽检。',
    ].join('\n'),
  },
  checklist: {
    framework: true,
    metrics: true,
    badcases: true,
    fix: true,
    review: true,
  },
}

export const demoShowcasePitch = {
  projectName: '客服 Copilot Eval 改造',
  pitchNotes: [
    '开场：客服每天 1,200 条咨询，35% 是重复售后问题，人工平均响应约 4 分钟。',
    'Demo：展示用户询问退款政策，Copilot 给出答案、引用来源和低置信度转人工。',
    '指标：准确率 72% 提升到 86%，高风险误答降到 0。',
    '取舍：本期不做订单实时查询，优先保证知识库问答可控上线。',
    '下一步：20% 工单灰度 7 天，观察人工接管率、满意度和异常投诉。',
  ].join('\n'),
  demoVideoUrl: 'https://www.bilibili.com/video/BV1demo',
  checklist: {
    hook: true,
    demo: true,
    metrics: true,
    tradeoff: true,
    next: true,
    qa: false,
  },
  videoChecklist: {
    v0: true,
    v1: true,
    v2: true,
    v3: true,
  },
}

export const demoHomeworkDraft = {
  type: 'project-lab',
  title: '客服 Copilot Eval 改造 · 路演稿',
  contact: 'wx: apgc-demo',
  content: [
    '项目背景：客服团队每天处理约 1,200 条售后咨询，其中 35% 集中在发票、退款、物流和账号问题。原知识库搜索依赖人工关键词，平均响应耗时约 4 分钟。',
    '',
    '本期目标：围绕客服知识库问答建立 Eval 门禁，先验证售后 FAQ 场景，目标准确率 >= 85%，引用命中率 >= 90%，高风险误答 = 0。',
    '',
    'MVP 边界：本期只做售后 FAQ 问答、知识库召回、答案引用来源、低置信度转人工；不做订单实时查询、复杂投诉仲裁和销售推荐。',
    '',
    'Eval 设计：40 条黄金测试集覆盖发票、退款、物流、账号 4 类场景。Badcase 分为知识缺失、召回错误、答案过度推断、格式不合规。',
    '',
    '结果：准确率从 72% 提升到 86%，高风险误答从 3 条降到 0 条，低置信度转人工策略覆盖 12 条边界问题。',
    '',
    '需要批改重点：请帮我看这份项目是否能写进简历，以及路演时“技术取舍”和“上线风险”是否讲清楚。',
  ].join('\n'),
}
