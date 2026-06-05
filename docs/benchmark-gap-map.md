# 竞品差距映射（执行版）

## 目标

将竞品能力差距映射到当前站点可落地页面，确保每个优化项都有对应实现入口。

## 差距 -> 现有模块映射

### 1) 学习成果证明不足

- 差距：缺少可分享、可复盘、可证明的阶段成果资产。
- 现有基础：
  - `pages/resources/ai-topics.vue`（专题学习与打卡）
  - `pages/tasks/index.vue`（专题任务池）
  - `pages/tools/checklist.vue`（决策清单与求职包导出）
- 规划动作：
  - 新增“阶段成果包导出”
  - 新增“周复盘自动模板”
  - 将“评审分与建议”写入导出历史

### 2) 陪跑机制不足

- 差距：缺少逾期提醒、风险预警、快速收敛动作。
- 现有基础：
  - `pages/tasks/index.vue`（优先级、待办筛选、快速动作）
  - `pages/ops/index.vue`（专题漏斗 + 告警）
- 规划动作：
  - 补充逾期提示与高优先级未完成告警
  - 补充“首周完成”事件作为执行里程碑

### 3) 商业转化链路不完整

- 差距：试学到支付路径可见度与可追踪性不足。
- 现有基础：
  - `pages/assessment/report.vue`（报告 CTA）
  - `pages/camp/pay.vue`（支付入口）
  - `lib/analytics.ts`（本地事件采集）
- 规划动作：
  - 新增“试学 7 天任务包导入”
  - 增加方案对比与支付前关键说明
  - 完整埋点：`trial_start`、`plan_compare_click`、`pay_click`

### 4) 运营可观测深度不足

- 差距：缺少北极星和周对比，诊断依赖人工。
- 现有基础：
  - `pages/ops/index.vue`（核心漏斗与事件分布）
- 规划动作：
  - 增加学习产出率、7日留存代理、试学到支付转化
  - 增加本周 vs 上周对比与自动显著变化提示
  - 汇总“增长总览卡”

### 5) 后端基础可信度不足

- 差距：同步与报名接口缺少版本和去重机制。
- 现有基础：
  - `server/api/sync/push.post.ts`、`server/api/sync/pull.post.ts`
  - `server/api/waitlist/index.post.ts`
- 规划动作：
  - 同步接口支持 payload 版本与冲突策略
  - 报名接口增加联系方式去重与来源追踪字段

### 6) 项目实战与 Eval 深度（2026-06 已启动）

- 差距：竞品有 6+ 项目实战与独立 Eval 模块。
- 已落地：
  - `pages/tools/project-lab.vue` + `lib/project-lab.ts`
  - `pages/tools/eval-lab.vue` + `lib/eval-lab.ts`
  - `pages/share/[slug].vue` + `server/api/share/*`
  - `pages/tools/showcase.vue` 路演 Rubric
- 待加强：路演录播视频占位（已支持链接 + 拍摄清单）

### 7) 轻量陪跑触点（2026-06 已启动）

- 差距：竞品有 1v1 答疑与作业点评。
- 已落地：
  - `pages/tools/homework.vue` + `server/api/homework/index.post.ts`
  - 模板化即时反馈，可升级进阶席位真人批改
  - 48h SLA + 通知文案队列
- 待加强：自动发送 webhook（已支持企微/邮件 Webhook，未配置时走手动队列）

### 8) 真人批改工作流（2026-06 已落地）

- 差距：竞品 1v1 作业点评、直播批改。
- 已落地：
  - 学员 `/tools/homework` 可申请真人批改（留联系方式）
  - `server/api/homework/review.post.ts` 主理人批改
  - `/ops` 真人批改队列 + 自动建议提醒
- 待加强：企微/邮件自动发送（已有人工文案队列）

### 9) 通知 SLA + 路演点评（2026-06 已落地）

- 差距：竞品有结业 Demo、批改通知与 SLA 承诺。
- 已落地：
  - 48h SLA 倒计时（学员端 + ops 逾期计数）
  - 批改后通知队列（企微/邮件文案复制 + 标记已发送）
  - `/tools/showcase` 路演 5 分钟 Demo Rubric
- 待加强：内置 SMTP（当前支持 Webhook 适配器）

### 10) Webhook 自动通知（2026-06 已落地）

- 差距：人工复制通知效率低，SLA 逾期无主动告警。
- 已落地：
  - 企微机器人 Webhook 自动/手动发送
  - 通用邮件 Webhook 适配器
  - ops「一键发送待办」+ SLA 逾期企微告警
  - showcase 录播链接占位
- 待加强：内置 SMTP 客户端

### 11) 批改已读回执（2026-06 已落地）

- 差距：通知发出后无法确认学员是否看到反馈。
- 已落地：
  - `/tools/homework/:id` 批改结果详情页
  - 打开详情自动记录 `feedbackReadAt` 与通知 `openedAt`
  - `/ops` 展示“已发送未读 / 已打开 / 发送失败”
- 待加强：未读 24h 自动二次提醒、学员端确认采纳反馈

## 验收口径

- 用户 10 分钟内完成：专题学习 -> 任务 -> 清单 -> 成果导出。
- 运营看板可直接观察：试学、执行、支付、产出四段转化。
- 同步与报名接口在版本和去重层面具备基础可控性。
