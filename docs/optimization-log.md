# AI 产品成长营优化日志

用于记录每一轮已落地优化，便于周复盘、对外汇报与后续版本规划。

## 2026-06-01（专题学习闭环专项）

### 学习资源与专题入口

- 在 `pages/resources/index.vue` 新增「大模型与智能体专题入口」卡片。
- 支持一键切换专题筛选、重置筛选、进入专题页。
- 聚合 AI 大模型/智能体主题文章，提升主题可见性。

### 专题页能力（`pages/resources/ai-topics.vue`）

- 新建专题页并按阶段组织内容：入门全景 / 架构与编排 / 评估与治理 / 面试表达。
- 增加学习进度条、阶段打卡、单篇打卡与本地持久化。
- 增加下一阶段 Top2 推荐与一键加入周任务。
- 增加单条加入周任务与同步到清单入口。
- 为专题任务写入优先级（高/中/低），并兼容历史任务数据。

### 周任务中心闭环（`pages/tasks/index.vue`）

- 新增「专题学习任务池」，承接专题页推荐任务。
- 支持任务打卡、移除、同步清单、一键同步待办到清单。
- 增加全部/待办筛选、清理已完成。
- 增加任务优先级切换（高/中/低）。
- 排序规则升级为「优先级优先 + 周次排序」。
- 增加高优先级完成率展示。

### 运营看板可观测性（`pages/ops/index.vue`）

- 新增专题学习转化漏斗：专题访问 -> 加入任务 -> 完成打卡 -> 同步清单。
- 新增漏斗自动瓶颈诊断与建议动作。
- 新增优先级执行指标：整体完成率、高/中/低优先级完成率。

### 埋点与数据追踪（新增关键事件）

- `resource_ai_topic_enter_page`
- `resource_ai_topic_view`
- `resource_ai_topic_add_top2_tasks`
- `resource_ai_topic_add_task`
- `resource_ai_topic_complete_toggle`
- `resource_ai_topic_stage_checkin`
- `resource_ai_topic_to_checklist`
- `tasks_topic_toggle_done`
- `tasks_topic_remove`
- `tasks_topic_to_checklist`
- `tasks_topic_filter_change`
- `tasks_topic_clear_completed`
- `tasks_topic_priority_change`

### 运行说明

- 主链接：`http://127.0.0.1:3000`
- 备用链接：`http://127.0.0.1:3026`

---

## 2026-06-01（执行优先级收敛）

### 本轮目标

- 让任务池从“可用”升级到“可执行”：明确下一步、减少执行顺序偏差。
- 让运营看板自动识别优先级偏离风险，给出纠偏建议。

### 已落地功能

- `pages/tasks/index.vue`
  - 新增「自动优先执行建议」卡片，展示当前待办优先级分布。
  - 新增快速动作：快速完成下一条、下一条同步清单。
  - 新增埋点：
    - `tasks_topic_quick_complete_next`
    - `tasks_topic_quick_sync_next`

- `pages/ops/index.vue`
  - 在优先级完成率基础上新增高/中/低待办统计。
  - 新增「优先级偏离告警」：
    - 高风险：高优先级待办未清且低优先级完成率更高（倒挂）。
    - 中风险：高优先级完成率偏低。
    - 健康：优先级执行顺序合理。

### 预期收益

- 用户执行路径更清晰，减少“低优先级先做”的常见偏差。
- 主理人可直接看到是否出现优先级倒挂，并快速做策略调整。

---

## 2026-06-01（增长看板收口增强）

### 本轮目标

- 让运营看板从“看数据”升级到“可直接执行”。
- 补齐关键指标口径，降低复盘沟通成本。

### 已落地功能

- `pages/ops/index.vue`
  - 新增「本周下一步动作（自动建议）」卡片，基于转化与执行状态生成 1-3 条可执行动作。
  - 新增「指标口径说明」卡片，明确学习产出率、7日留存代理、试学到支付、报告到任务转化公式。

### 预期收益

- 主理人无需手动解读指标即可得到本周动作建议。
- 团队复盘时口径一致，减少“同名指标不同算法”的沟通偏差。

---

## 2026-06-01（A/B 转化实验增强）

### 本轮目标

- 让报告页与支付页 CTA 可进行本地 A/B 验证。
- 让看板可以直接判断 A/B 胜负并一键输出复盘条目。

### 已落地功能

- `pages/assessment/report.vue`
  - 新增报告页 CTA 文案 A/B 版本曝光逻辑。
  - 新增曝光埋点：`report_ab_variant_exposed`。
  - 主 CTA 与试学事件携带 `variant` 字段。

- `pages/camp/pay.vue`
  - 新增支付页标题/副文案 A/B 版本曝光逻辑。
  - 新增曝光埋点：`pay_ab_variant_exposed`。
  - `plan_compare_click`、`pay_click` 增加 `variant` 字段。

- `pages/ops/index.vue`
  - 新增「A/B 胜负判断卡」，按曝光->点击口径比较 A/B。
  - 新增「一键复制为复盘日志条目」按钮，自动生成 markdown 周复盘片段。
  - 新增埋点：`ops_weekly_recap_copy`。

### 预期收益

- 能更快判断“哪套文案更能促成点击”，减少凭感觉改文案。
- 主理人可直接复制复盘条目，降低周复盘整理成本。

---

## 2026-06-01（A/B 样本阈值与停机增强）

### 本轮目标

- 给 A/B 判断增加最小样本门槛，避免小样本误判。
- 支持在运营看板一键固定胜出版本并可随时回滚。

### 已落地功能

- `pages/ops/index.vue`
  - A/B 胜负卡增加样本阈值提示（A/B 各至少 20 次曝光）。
  - 新增“固定胜出版本 / 清除固定 / 一键应用推荐固定版本”。
  - 新增固定版本埋点：
    - `ops_ab_force_variant_set`
    - `ops_ab_force_variant_clear`

- `pages/assessment/report.vue`
  - 支持读取 `apgc-report-cta-force-variant` 强制版本。
  - 暴露事件增加 `forced` 字段，区分实验流量与固定流量。

- `pages/camp/pay.vue`
  - 支持读取 `apgc-pay-cta-force-variant` 强制版本。
  - 暴露事件增加 `forced` 字段，区分实验流量与固定流量。

- `README.md`
  - 新增 A/B 实验口径、最小样本规则、停机规则与固定开关键名。

### 预期收益

- 降低 A/B 过早下结论导致的错误决策风险。
- 主理人可直接复制复盘条目，降低周复盘整理成本。

---

## 2026-06-01（A/B 定版与验收路径）

### 本轮目标

- 提供固定版本总览、自动定版、一键回滚随机分流。
- 提供可重复执行的验收路径脚本。

### 已落地功能

- `lib/ab-experiment.ts`：A/B 定版常量与元数据读写。
- `pages/ops/index.vue`
  - 新增「固定版本状态总览」与解锁重测建议。
  - 新增自动定版（样本达标 + 领先 >=10%）与 `ops_ab_auto_lock` 埋点。
  - 新增「一键回滚到随机分流」与 `ops_ab_rollback_random_split` 埋点。
- `scripts/verify-acceptance-path.mjs`：一键检查自测->任务->清单->专题->支付->看板路由可用性。

### 预期收益

- 主理人可在看板内完成“定版/回滚/重测”闭环，无需改代码。
- 发布前可用脚本快速验收关键路径是否可访问。

---

## 2026-06-01（竞品差距 Phase A/B/C）

### 本轮目标

- 补齐竞品「项目实战 / Eval / 信任转化 / 作业点评」差距。
- 打通公开成果页与求职包分享链路。

### 已落地功能

- **项目 Lab**：`pages/tools/project-lab.vue`、`lib/project-lab.ts`（MVP / RAG / Eval 三模板）
- **Eval Lab**：`pages/tools/eval-lab.vue`、`lib/eval-lab.ts`
- **公开成果页**：`pages/share/[slug].vue`、`server/api/share/publish.post.ts`、`server/api/share/[slug].get.ts`
- **作业提交**：`pages/tools/homework.vue`、`server/api/homework/index.post.ts`（模板化反馈）
- **转化与信任**：`/camp` 社会证明与团队咨询；`/camp/pay` 保障条款；报告页转岗 4 步路径
- **内容 freshness**：`/resources` 本周热点运营位
- **清单增强**：导出求职包自动发布成果页
- **修复**：`/camp` 报名 `campaign` 字段错误（`body` 未定义）

### 埋点（新增）

- `project_lab_*`、`eval_lab_*`、`homework_*`、`weekly_pick_click`
- `career_step_*`、`checklist_publish_share`、`camp_team_inquiry_view`

### 预期收益

- 用户可在 10 分钟内完成「项目/Eval → 成果页 → 作业反馈」闭环。
- 团队席位与 B2B 咨询有独立入口与 source/campaign 追踪。

---

## 2026-06-02（真人批改工作流）

### 已落地功能

- `lib/homework.ts`：状态机 `auto_reviewed | pending_human | human_reviewed`
- `server/api/homework/index.get.ts`、`review.post.ts`、`[id].get.ts`
- `pages/tools/homework.vue`：申请真人批改 + 刷新批改状态
- `pages/ops/index.vue`：真人批改队列 + `ops_homework_review_submit` 埋点

### 预期收益

- 对标起点/慕课「作业点评」触点，进阶席位可承诺 48h 真人反馈。
- 主理人可在 ops 看板统一处理待批改，无需切换 CRM。

---

## 2026-06-02（通知 SLA + 路演点评）

### 已落地功能

- **48h SLA**：`lib/homework.ts` 倒计时工具；学员 `/tools/homework` 显示剩余/逾期
- **通知队列**：`lib/notifications.ts`、`server/api/notifications/*`；批改后生成企微/邮件文案
- **ops 增强**：逾期计数、待发送通知（复制文案 + 标记已发送）
- **路演 Rubric**：`pages/tools/showcase.vue`、`lib/showcase.ts`（5 分钟 Demo 自评 + 大纲）
- **入口**：`/camp`、`/tools`、`/tools/project-lab` → `/tools/showcase`
- **验收**：`scripts/verify-acceptance-path.mjs` 增至 12 项路由

### 埋点（新增）

- `showcase_view`、`showcase_rubric_toggle`、`showcase_pitch_copy`、`showcase_to_homework`
- `ops_notification_copy`、`ops_notification_mark_sent`

### 预期收益

- 进阶席位可承诺 48h SLA，逾期可在 ops 一眼识别。
- 批改完成有标准通知文案，降低手动跟进成本。
- 路演模块补齐竞品「结业 Demo / 项目展示」触点。

---

## 2026-06-02（Webhook 自动通知 + 录播占位）

### 已落地功能

- **企微 Webhook 自动发送**：`server/utils/notify-dispatch.ts`；批改后若配置 `NUXT_WECOM_WEBHOOK_URL` 则自动推送
- **邮件 Webhook**：可选 `NUXT_MAIL_WEBHOOK_URL`（POST `{ to, subject, body }`）
- **ops 一键发送**：`/api/notifications/dispatch`；失败状态可重试；SLA 逾期企微告警
- **路演录播占位**：`/tools/showcase` 录播链接 + 拍摄自检清单
- **preview 重启加固**：`restart-preview.sh` 双重释放 3030，减少 EADDRINUSE

### 环境变量

```bash
NUXT_WECOM_WEBHOOK_URL=https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx
NUXT_MAIL_WEBHOOK_URL=https://your-mail-relay.example/send   # 可选
NUXT_SLA_ALERT_WEBHOOK_URL=...                                # 可选，默认同企微
NUXT_NOTIFY_AUTO_DISPATCH=true                                # 设为 false 则仅手动发送
```

### 埋点（新增）

- `ops_notification_dispatch`、`ops_notification_dispatch_all`、`ops_sla_alert_sent`
- `showcase_video_check`

### 预期收益

- 批改完成可零人工复制（配置 Webhook 后），未配置时仍保留手动队列。
- 路演录播链路就绪，开营后可直接粘贴链接申请异步点评。

---

## 2026-06-03（批改结果详情 + 已读回执）

### 已落地功能

- **批改结果详情页**：`pages/tools/homework/[id].vue`，通知链接直达作业详情
- **已读回执**：`POST /api/homework/:id/read`，打开详情页后记录 `feedbackReadAt`
- **通知打开状态**：通知记录新增 `openedAt`，ops 可看到“待发送 / 已发送未读 / 已打开 / 发送失败”
- **学员端入口**：`/tools/homework` 最近提交中可进入批改详情
- **通知文案升级**：企微/邮件内容改为直达详情页链接

### 埋点（新增）

- `homework_detail_view`、`homework_feedback_read`、`homework_open_detail`

### 预期收益

- 批改链路从“通知已发出”升级为“确认学员已打开反馈”。
- 主理人可在 ops 识别未读学员，便于二次跟进。

---

## 后续追加模板

可按以下格式追加每轮迭代：

```md
## YYYY-MM-DD（迭代主题）

### 本轮目标
- ...

### 已落地功能
- ...

### 指标变化（如有）
- ...

### 下轮计划
- ...
```
