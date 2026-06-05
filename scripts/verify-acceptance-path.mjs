#!/usr/bin/env node

const base = process.env.BASE_URL || 'http://127.0.0.1:3030'

const routes = [
  { name: '自测入口', path: '/assessment' },
  { name: '答题页', path: '/assessment/quiz' },
  { name: '报告页', path: '/assessment/report' },
  { name: '周任务中心', path: '/tasks' },
  { name: '决策清单', path: '/tools/checklist' },
  { name: '专题页', path: '/resources/ai-topics' },
  { name: '项目 Lab', path: '/tools/project-lab' },
  { name: 'Eval Lab', path: '/tools/eval-lab' },
  { name: '作业提交', path: '/tools/homework' },
  { name: '路演 Rubric', path: '/tools/showcase' },
  { name: '样例成果页', path: '/share/demo-copilot-eval' },
  { name: '支付页', path: '/camp/pay' },
  { name: '运营看板', path: '/ops' },
]

async function checkRoute(item) {
  const url = `${base}${item.path}`
  const res = await fetch(url, { redirect: 'follow' })
  return {
    ...item,
    ok: res.ok,
    status: res.status,
  }
}

async function main() {
  console.log(`验收路径检查：${base}`)
  const results = []
  for (const item of routes) {
    try {
      results.push(await checkRoute(item))
    } catch (error) {
      results.push({
        ...item,
        ok: false,
        status: 0,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  let failed = 0
  for (const row of results) {
    const mark = row.ok ? 'OK' : 'FAIL'
    if (!row.ok) failed++
    const extra = row.error ? ` (${row.error})` : ''
    console.log(`[${mark}] ${row.name} ${row.path} -> ${row.status}${extra}`)
  }

  console.log('')
  console.log(`通过 ${results.length - failed}/${results.length}`)
  process.exit(failed ? 1 : 0)
}

main()
