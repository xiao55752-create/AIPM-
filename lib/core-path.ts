export interface CorePathStep {
  id: string
  label: string
  shortLabel: string
  title: string
  desc: string
  to: string
}

export const corePathSteps: CorePathStep[] = [
  {
    id: 'assess',
    label: '1 自测定位',
    shortLabel: '自测',
    title: '先定位能力差距',
    desc: '5 分钟完成能力雷达，知道自己该补哪几周。',
    to: '/assessment',
  },
  {
    id: 'learn',
    label: '2 学习资源',
    shortLabel: '资源',
    title: '按周补关键资源',
    desc: '只学能转成产出的文章、书籍和视频。',
    to: '/resources',
  },
  {
    id: 'project',
    label: '3 项目 Lab',
    shortLabel: '项目',
    title: '做一个可展示项目',
    desc: '用 MVP / RAG / Eval 模板生成简历级交付物。',
    to: '/tools/project-lab',
  },
  {
    id: 'showcase',
    label: '4 路演 Demo',
    shortLabel: '路演',
    title: '讲清项目价值',
    desc: '5 分钟 Demo Rubric，准备结业路演和面试表达。',
    to: '/tools/showcase',
  },
  {
    id: 'review',
    label: '5 作业批改',
    shortLabel: '批改',
    title: '拿到真人反馈',
    desc: '提交项目或路演稿，48h 内获得主理人批改。',
    to: '/tools/homework',
  },
  {
    id: 'share',
    label: '6 成果页',
    shortLabel: '成果',
    title: '沉淀公开成果',
    desc: '把项目、清单和反馈沉淀成求职/晋升材料。',
    to: '/tools/checklist',
  },
]
