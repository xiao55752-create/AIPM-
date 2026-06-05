export interface CaseStudy {
  slug: string
  title: string
  summary: string
  tags: string[]
  sections: { heading: string; body: string }[]
  weeklyAction: string
}

export const cases: CaseStudy[] = [
  {
    slug: 'bid-agent',
    title: '政企招投标场景下的标书智能体',
    summary:
      '合规、闭环与可交付：Skills 原子化 + 人机协同，支持私有化与信创部署。',
    tags: ['D1', 'D3', 'W4'],
    weeklyAction: '用决策清单过 1 个在研需求',
    sections: [
      {
        heading: '局面',
        body: '国央企招投标要的是合规可审计、数据不出域，不是单纯「生成文字」。',
      },
      {
        heading: '判断',
        body: '分阶段闭环；Skills 原子化；关键环节 Human-in-the-loop；多形态部署。',
      },
      {
        heading: '结果',
        body: '分钟级解析与生成/审查能力；多家政企试点（细节可职业沟通中补充）。',
      },
    ],
  },
  {
    slug: 'school-enterprise',
    title: '校企 AI 匹配平台',
    summary: '数千项需求与成果对接，促成数千项合作；系列项目回款数千万级。',
    tags: ['D2', 'D4', 'W2'],
    weeklyAction: '写清 3 个业务指标 + 1 个不用 AI 的替代方案',
    sections: [
      {
        heading: '局面',
        body: '信息发布多、真实合作少，需可运营的匹配能力。',
      },
      {
        heading: '判断',
        body: '匹配质量 > 页面数量；指标绑定运营与回款。',
      },
      {
        heading: '结果',
        body: '4100+ 需求、2000+ 成果、3500+ 合作促成（脱敏区间表述）。',
      },
    ],
  },
  {
    slug: 'smart-investment',
    title: 'ToG 智慧招商',
    summary: '数千企业入驻，平台成交额过亿级；产业大脑支撑千万级运营目标。',
    tags: ['D2', 'D5', 'W3'],
    weeklyAction: '写清：用户离开你的产品，损失是什么？',
    sections: [
      {
        heading: '局面',
        body: '园区与政府要的是入驻、成交、可量化成效。',
      },
      {
        heading: '判断',
        body: '内核是匹配 + 运营转化；新概念只是交互手段。',
      },
      {
        heading: '结果',
        body: '8000+ 入驻；成交额过亿级（脱敏区间表述）。',
      },
    ],
  },
]

export function getCase(slug: string) {
  return cases.find((c) => c.slug === slug)
}
