export type OptionKey = 'A' | 'B' | 'C' | 'D'

export interface Question {
  id: string
  dimension?: 'D1' | 'D2' | 'D3' | 'D4' | 'D5' | 'D6'
  text: string
  options: { key: OptionKey; label: string }[]
  background?: boolean
}

export const questions: Question[] = [
  {
    id: 'Q1',
    background: true,
    text: '你目前的角色最接近？',
    options: [
      { key: 'A', label: '产品经理（非 AI 专项）' },
      { key: 'B', label: 'AI / 智能化产品经理' },
      { key: 'C', label: '高级 PM / 产品负责人' },
      { key: 'D', label: '总监 / 负责人及以上' },
    ],
  },
  {
    id: 'Q2',
    background: true,
    text: '从事产品相关工作的年限？',
    options: [
      { key: 'A', label: '0～2 年' },
      { key: 'B', label: '3～5 年' },
      { key: 'C', label: '6～10 年' },
      { key: 'D', label: '10 年以上' },
    ],
  },
  {
    id: 'Q3',
    background: true,
    text: '你未来 6 个月最主要的目标？',
    options: [
      { key: 'A', label: '转入 AI 产品岗' },
      { key: 'B', label: '在当前岗位做出可量化 AI 成果' },
      { key: 'C', label: '带团队 / 建机制 / 规模化' },
      { key: 'D', label: '战略与商业决策（少做执行）' },
    ],
  },
  {
    id: 'Q4',
    dimension: 'D1',
    text: '业务方要求「做一个 Agent 自动搞定采购审批」，你的第一反应？',
    options: [
      { key: 'A', label: '先上 Agent，越快越好' },
      { key: 'B', label: '先梳理流程，能用规则/人工就不上 Agent' },
      { key: 'C', label: '先做 Copilot 辅助人审批，再视数据考虑 Agent' },
      { key: 'D', label: '直接拒绝：场景不适合自动化' },
    ],
  },
  {
    id: 'Q5',
    dimension: 'D1',
    text: '上线 RAG 知识库前，你认为最低限度必须有的是？',
    options: [
      { key: 'A', label: '选好向量模型' },
      { key: 'B', label: '有检索评测集 + 无答案/低置信度策略' },
      { key: 'C', label: '界面好看、回答快' },
      { key: 'D', label: '知识库文档越多越好' },
    ],
  },
  {
    id: 'Q6',
    dimension: 'D1',
    text: '模型回答偶尔「胡编」，你的产品策略更接近？',
    options: [
      { key: 'A', label: '提示用户「AI 可能出错」即可' },
      { key: 'B', label: '强制引用来源 + 低置信拒答 + 人工兜底路径' },
      { key: 'C', label: '换更大模型' },
      { key: 'D', label: '降低温度参数就够了' },
    ],
  },
  {
    id: 'Q7',
    dimension: 'D2',
    text: '新 AI 功能立项前，你通常会？',
    options: [
      { key: 'A', label: '看竞品有就跟进' },
      { key: 'B', label: '先定义业务指标与不做的替代方案' },
      { key: 'C', label: '等技术团队说可行再做' },
      { key: 'D', label: '先做 Demo 给老板看' },
    ],
  },
  {
    id: 'Q8',
    dimension: 'D2',
    text: '功能上线 3 个月，调用量低，你优先排查？',
    options: [
      { key: 'A', label: '模型不够准' },
      { key: 'B', label: '分发/培训/工作流是否嵌入、指标是否设对' },
      { key: 'C', label: '换 UI' },
      { key: 'D', label: '加更多模型能力' },
    ],
  },
  {
    id: 'Q9',
    dimension: 'D2',
    text: '如何定义这个 AI 功能「成功了」？',
    options: [
      { key: 'A', label: 'DAU / 调用次数' },
      { key: 'B', label: '业务结果 + 模型质量各至少 1 项' },
      { key: 'C', label: '老板满意' },
      { key: 'D', label: '竞品也有' },
    ],
  },
  {
    id: 'Q10',
    dimension: 'D3',
    text: '从 POC 到全量，你更认同？',
    options: [
      { key: 'A', label: '效果好就全量' },
      { key: 'B', label: '有阶段门：Eval、成本、监控、交付文档齐全' },
      { key: 'C', label: '客户催就上' },
      { key: 'D', label: 'POC 和规模用同一套代码' },
    ],
  },
  {
    id: 'Q11',
    dimension: 'D3',
    text: 'ToB 场景下，AI 功能「可规模化」通常意味着？',
    options: [
      { key: 'A', label: '模型 API 稳定' },
      { key: 'B', label: '多租户权限、审计、实施文档、客户成功话术齐全' },
      { key: 'C', label: '销售答应客户' },
      { key: 'D', label: '价格便宜' },
    ],
  },
  {
    id: 'Q12',
    dimension: 'D3',
    text: '推理成本月环比涨 40%，你第一步？',
    options: [
      { key: 'A', label: '换更便宜模型 / 缓存 / 限流，并复盘单位经济' },
      { key: 'B', label: '先不管，体验优先' },
      { key: 'C', label: '砍功能' },
      { key: 'D', label: '让用户少问几次' },
    ],
  },
  {
    id: 'Q13',
    dimension: 'D4',
    text: '用户纠错/点踩数据，你的产品设计是？',
    options: [
      { key: 'A', label: '只存日志给技术看' },
      { key: 'B', label: '进入标注/金标迭代闭环，有负责人和节奏' },
      { key: 'C', label: '不做，怕麻烦' },
      { key: 'D', label: '仅用于客服' },
    ],
  },
  {
    id: 'Q14',
    dimension: 'D4',
    text: '「护城河」在你当前产品里更接近？',
    options: [
      { key: 'A', label: '用了最新大模型' },
      { key: 'B', label: '嵌入工作流 + 数据飞轮 + 切换成本高' },
      { key: 'C', label: '功能多' },
      { key: 'D', label: '品牌广告' },
    ],
  },
  {
    id: 'Q15',
    dimension: 'D5',
    text: '算法同学说「做不了你要的准确率」，你通常？',
    options: [
      { key: 'A', label: '升级给老板' },
      { key: 'B', label: '一起拆指标、评测集与 MVP 范围' },
      { key: 'C', label: '换供应商' },
      { key: 'D', label: '降低预期不告知业务' },
    ],
  },
  {
    id: 'Q16',
    dimension: 'D5',
    text: '跨部门推 AI 项目，你最有力的是？',
    options: [
      { key: 'A', label: '个人魅力' },
      { key: 'B', label: '对齐对方 KPI + 试点数据 + 清晰里程碑' },
      { key: 'C', label: 'PPT 页数多' },
      { key: 'D', label: '领导批示' },
    ],
  },
  {
    id: 'Q17',
    dimension: 'D6',
    text: '过去 3 个月，你的 AI 学习更接近？',
    options: [
      { key: 'A', label: '收藏了很多文章/课程没怎么看完' },
      { key: 'B', label: '有固定每周时间，且产出过模板/清单' },
      { key: 'C', label: '只跟项目被迫学' },
      { key: 'D', label: '几乎没系统学' },
    ],
  },
  {
    id: 'Q18',
    dimension: 'D6',
    text: '若只能选 1 项作为「本周学习产出」，你会选？',
    options: [
      { key: 'A', label: '看完 10 篇公众号' },
      { key: 'B', label: '更新一版团队可用的 AI 决策清单或 Eval 表' },
      { key: 'C', label: '换一个模型 API' },
      { key: 'D', label: '参加一场分享无作业' },
    ],
  },
]

export const scoredQuestions = questions.filter((q) => !q.background)
