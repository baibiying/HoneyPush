# HoneyPush Product Document

> **HoneyPush** — AI scheduling + gamified video supervision

HoneyPush helps students and knowledge workers turn messy to-dos into focused execution: plan with AI, supervise with camera-based accountability, then review performance.

---

## 1) Implemented Features (Current Build)

Shipped in code today (not roadmap):

| Area | Details |
|---|---|
| Account & data | Email auth (`/api/auth/*`), task CRUD (`/api/tasks`), PostgreSQL |
| AI | Natural-language parse (`/api/ai-parse-task`), AI schedule (`/api/ai-schedule`), rule fallback |
| Supervision | Officer selection (Yuri), local `face-api.js` + `/models`, distraction alerts, 25/5 blocks |
| Review | Outcome modal, `/api/performance`, `/api/stats`, map performance entry |
| Platform | Daily digest cron, Eazo profile sync (`/api/user/profile`) |
| Deploy | Production: **Vercel**; local DB: `docker-compose.yml` |

---

## 2) Background

Productivity tools often split into passive planners (no execution help) and harsh lock-down apps (hard to sustain). HoneyPush closes the loop: **AI planning → supervised execution → feedback**.

---

## 3) Why We Build

- Bridge planning and execution; AI lowers the cost of breaking down and ordering tasks.
- Add emotional feedback via officer personas and gamification so focus feels less lonely.

---

## 4) Target Users

| Segment | Users |
|---|---|
| **Core** | Exam prep students and university coursework users |
| **Secondary** | Office workers, freelancers, and multi-task professionals |

---

## 5) Key Pain Points

1. Start paralysis — too many tasks, no clear first step  
2. Interruptions — phone pulls attention during work  
3. No accountability — hard to persist alone  

---

## 6) How AI Helps

| AI capability | Product value |
|---|---|
| NLP / LLM | Chat-style input to structured tasks, deadlines, and schedule |
| Computer vision | Local webcam checks for distraction (privacy-first) |
| Persona feedback | Officer reactions tied to focus behavior |

---

## 7) Core Modules

### 7.1 Smart Scheduling

Natural-language (or manual) task intake; AI extracts deadline, duration, Eisenhower quadrant; maps tasks into availability with pomodoro-style blocks (25 min focus + 5 min break). Users can edit the calendar.

### 7.2 Immersive Supervision

**Shipped:** User picks a task → supervision overlay → camera enrollment → focus blocks; local CV triggers officer video/audio; strikes can fail a block; focus coins and stats update.

**Roadmap:** Live co-study rooms, 1:1 human supervision.

**Officer personas (roadmap expansion):**

| Role | Vibe | Example |
|---|---|---|
| Yuri | Strict, dark humor | Red alert when phone is detected |
| Sister Gu | Sarcastic | Sharp deadline-shaming feedback |
| Lin Feng | Gentle coach | Encouraging break/focus reminders |

### 7.3 Review & Growth

**Shipped:** Performance APIs, focus history, completion trends on the adventure map.

**Roadmap:** Heatmaps, phone-pickup charts, ROI vs AI estimates, highlight clips for social sharing.

### 7.4 Profile & Rewards

Focus coins from completed blocks, officer preference signals, and privacy-by-default (CV runs locally; frames are not sent to cloud vision APIs).

---

## 8) Injective (Roadmap)

Not integrated today. Future direction: tokenize focus coins on Injective with wallet claim, streak rewards, and leaderboard/achievement settlement.

---

# HoneyPush 产品文档

> **HoneyPush** — AI 智能排期 + 游戏化视频监督

`HoneyPush` 致力于解决「多线任务优先级混乱」与「执行期间沉迷手机」，帮助用户重塑时间感知与专注力：先用 AI 做规划，再通过监督执行，最后复盘提升。

---

## 1）当前已实现功能（以代码为准）

- 邮箱注册 / 登录 / 登出 / 会话校验（`/api/auth/*`）
- 任务 CRUD 与调度字段（`/api/tasks`、`/api/tasks/[id]`）
- 自然语言任务解析、智能排期；LLM 不可用时规则兜底
- 监督模式、Yuri 监督官、本地人脸检测、分心/离位判定、25/5 工作流
- 专注结果、表现面板、冒险地图入口
- 每日提醒 cron、Eazo 用户同步（`/api/user/profile`）
- 生产部署：**Vercel**；本地数据库：**docker compose** PostgreSQL

---

## 2）背景

现有效率工具往往走向两个极端：纯规划工具难落地，强限制工具难坚持。HoneyPush 目标是形成闭环：**AI 规划 → 监督执行 → 反馈复盘**。

---

## 3）为什么做

- **弥合规划与执行**：降低「启动瘫痪」门槛。
- **情绪价值**：通过监督官人设和游戏化反馈，提高长期可坚持性。

---

## 4）用户定位

| 层级 | 人群 |
|---|---|
| **核心** | 备考党、高校学生（论文/期末） |
| **次核心** | 打工人、自由职业者、多线程职场人 |

---

## 5）核心痛点

1. **启动困难**：任务太多，不知先做什么  
2. **过程断触**：执行中频繁被手机拉走注意力  
3. **缺乏反馈**：没有外部监督难以长期坚持  

---

## 6）AI 带来的价值

| 能力 | 作用 |
|---|---|
| NLP / LLM | 聊天式输入转结构化任务、DDL、排期 |
| 计算机视觉 | 本地摄像头识别分心行为，保障隐私 |
| 人设反馈 | 将监督结果映射为角色互动，提升执行体验 |

---

## 7）核心模块

### 7.1 智能排期

支持自然语言/手动录入；自动识别任务、DDL、时长与四象限；按可用时间生成番茄钟式日程块（25 分钟专注 + 5 分钟休息），并允许用户编辑。

### 7.2 沉浸监督局

**已上线：** 选任务进入监督 → 摄像头采集 → 专注块执行；本地视觉触发监督官视频/音效反馈；累计警告可导致专注块失败；产出专注币和统计。

**规划中：** 真人同频自习室、付费一对一监督。

**角色扩展（规划）：**

| 角色 | 性格 | 示例反馈 |
|---|---|---|
| 尤里 | 铁血、黑色幽默 | 检测到玩手机触发红光警报 |
| 顾姐 | 毒舌讽刺 | 强化 DDL 压力式提醒 |
| 林风 | 温柔鼓励 | 温和的休息与回到任务提醒 |

### 7.3 数据复盘

**已上线：** 表现 API、专注历史、完成趋势（冒险地图入口）。  
**规划中：** 热力图、摸鱼频率曲线、预估 vs 实际 ROI、高光片段导出分享。

### 7.4 档案与奖励

通过专注块获得专注币，沉淀监督偏好；隐私默认本地优先（摄像头画面不上传云端进行视觉识别）。

---

## 8）Injective（规划）

当前未集成。未来可将专注币代币化并接入 Injective，实现钱包领取、连续专注奖励、排行榜/成就结算。
