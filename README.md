# AI 产品成长营

十年政企 AI 产品总监（陈总监）沉淀的 **Vue 3 + Nuxt 3** 成长网站：自测 → 个性化 12 周路径 → 案例 → 工具箱。

**内容 playbook（文案/规则源）：** `../ai-product-director-playbook/`

## 技术栈

- **Vue 3** + **Nuxt 3** + **TypeScript**
- **Tailwind CSS**
- 前端 localStorage + Nuxt Server API（云同步 / 报名）

## 设计系统

- 设计规范：[`DESIGN.md`](./DESIGN.md)

## 本地开发

```bash
cd ai-product-growth-camp
npm install
npm run dev
```

打开 http://127.0.0.1:3000

## 构建

```bash
npm run build    # SSR
npm run generate # 静态站（GitHub Pages）
```

## 部署到 GitHub

### 1. 创建仓库并推送

```bash
cd ai-product-growth-camp
git init
git add .
git commit -m "feat: AI product growth camp MVP (Nuxt 3)"
git branch -M main
git remote add origin https://github.com/你的用户名/ai-product-growth-camp.git
git push -u origin main
```

### 2. 推荐：Vercel + GitHub（最简单）

1. 登录 [vercel.com](https://vercel.com)，用 GitHub 授权  
2. **Import** 该仓库  
3. Framework Preset: **Nuxt.js**  
4. Deploy  

每次 `git push` 自动发布。

### 3. 备选：GitHub Pages（静态）

1. 在 `nuxt.config.ts` 设置 `app.baseURL` 为你的仓库路径（如 `/ai-product-growth-camp/`）  
2. 运行 `npm run generate`，输出在 `.output/public`  
3. 用 GitHub Actions 部署（见 `.github/workflows/pages.yml`）  
4. 仓库 Settings → Pages → Source: GitHub Actions  

详见 [DEPLOY.md](./DEPLOY.md)

## 发布准备

- 上线执行清单：[`LAUNCH-CHECKLIST.md`](./LAUNCH-CHECKLIST.md)

## 后端与支付配置

- 云同步接口：`/api/sync/push`、`/api/sync/pull`（按设备码）
- 报名接口：`/api/waitlist`（GET/POST）
- 数据文件默认写入项目根目录 `.data/`
- 支付链接配置（可选）：

```bash
NUXT_PUBLIC_PAYMENT_LINKS_BASIC="https://你的支付链接/basic"
NUXT_PUBLIC_PAYMENT_LINKS_PRO="https://你的支付链接/pro"
NUXT_PUBLIC_PAYMENT_LINKS_TEAM="https://你的支付链接/team"
NUXT_FOUNDER_MODE_PASSWORD="你的主理人口令"
```

说明：主理人模式口令通过后默认授权 12 小时，超时需重新验证。

## 增长指标定义

- `报告 -> 周任务转化率`：`report_cta_primary_tasks / report_view`
- `任务 -> 清单转化率`：`tasks_open_checklist / tasks_view`
- `专题任务完成率`：`tasks_topic_toggle_done(done=true) / 专题任务总量`
- `学习产出率`：`topic_outcome_pack_exported / resource_ai_topic_view`
- `试学 -> 支付转化率`：`pay_click / trial_start`
- `7 日留存代理`：近 7 天内发生任务完成或阶段打卡事件的活跃天数

## 埋点事件字典（核心）

- `trial_start`：从报告页启动试学 7 天任务包
- `plan_compare_click`：支付页点击方案对比
- `pay_click`：支付入口点击
- `first_week_done`：周任务中心完成 W1
- `topic_outcome_pack_exported`：专题页导出阶段成果包
- `tasks_topic_quick_complete_next`：任务池快速完成下一条
- `tasks_topic_quick_sync_next`：任务池快速同步下一条到清单
- `tasks_topic_priority_change`：任务优先级调整

## 数据版本说明

- 云同步接口 `POST /api/sync/push`
  - 支持字段：`payloadVersion`、`clientUpdatedAt`、`conflictStrategy`
  - 冲突策略：`last_write_wins`（默认）、`server_wins`、`client_wins`
- 云同步接口 `POST /api/sync/pull`
  - 返回 `serverMeta.payloadVersion` 与 `stale`，用于判断客户端是否过期
- 报名接口 `POST /api/waitlist`
  - 支持 `source`、`campaign`
  - 按 `contact` 去重，重复报名返回历史记录而非新增

## A/B 实验口径与停机规则

- 实验页面：
  - 报告页 CTA（`report_ab_variant_exposed` -> `report_cta_primary_tasks`）
  - 支付页 CTA（`pay_ab_variant_exposed` -> `pay_click`）
- 胜负口径：点击率 = 点击数 / 曝光数，A/B 分别计算后比较
- 最小样本规则：A 与 B 各至少 `20` 次曝光才允许判定胜负
- 停机规则（建议）：
  - 若一侧点击率持续领先 `>=10%` 且满足最小样本，可固定胜出版本
  - 若差异 `<5%`，继续采样，不建议提前固定
  - 固定版本后仍保留事件追踪，供后续复盘与回滚
- 固定开关（主理人看板）：
  - `apgc-report-cta-force-variant`
  - `apgc-pay-cta-force-variant`
- 自动定版规则：满足最小样本 + 领先幅度 `>=10%` 时，可在运营看板自动/手动定版
- 验收脚本：`node scripts/verify-acceptance-path.mjs`（默认检查 `http://127.0.0.1:3030`）

## 页面

| 路径 | 说明 |
|------|------|
| `/` | 首页 |
| `/assessment` | 自测入口 |
| `/assessment/quiz` | 18 题（一题一屏） |
| `/assessment/report` | 雷达报告 |
| `/path` | 12 周路径（接自测个性化） |
| `/tasks` | 周任务中心（进度看板） |
| `/market` | 招聘对标 |
| `/founder` | 主理人 |
| `/founder/cases` | 实战案例 |
| `/tools` | 工具箱 |
| `/tools/checklist` | 在线决策清单 |
| `/tools/notes` | 学习笔记模板 |
| `/tools/narrative` | 战役叙事 / 述职模板 |
| `/tools/metrics` | AI 指标看板 |
| `/tools/weekly` | 周报一页纸 |
| `/ops` | 运营看板（本地埋点） |
| `/resources` | 学习资源 |
| `/camp` | 成长营 |
| `/camp/pay` | 支付入口 |

## 许可证

Private / 待定
