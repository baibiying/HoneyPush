# HoneyPush · Product Document / 产品文档

> **HoneyPush** — AI scheduling + gamified video supervision / AI 智能排期 + 游戏化视频监督

HoneyPush helps students and knowledge workers turn messy to-dos into focused execution: plan with AI, supervise with camera-based accountability, then review performance.

`HoneyPush` 致力于解决「多线任务优先级混乱」与「执行期间沉迷手机」，帮助用户重塑时间感知与专注力。

---

## 1. Implemented features (current build) · 当前已实现功能

**EN** — Shipped in code today (not roadmap):

| Area | Details |
|---|---|
| Account & data | Email auth (`/api/auth/*`), task CRUD (`/api/tasks`), PostgreSQL |
| AI | Natural-language parse (`/api/ai-parse-task`), AI schedule (`/api/ai-schedule`), rule fallback |
| Supervision | Officer selection (Yuri), local `face-api.js` + `/models`, distraction alerts, 25/5 blocks |
| Review | Outcome modal, `/api/performance`, `/api/stats`, map performance entry |
| Platform | Daily digest cron, Eazo profile sync (`/api/user/profile`) |
| Deploy | Production: **Vercel**; local DB: `docker-compose.yml` |

**中文** — 以代码为准、已上线可用：

- 邮箱注册 / 登录 / 登出 / 会话校验（`/api/auth/*`）
- 任务 CRUD 与调度字段（`/api/tasks`、`/api/tasks/[id]`）
- 自然语言任务解析、智能排期；LLM 不可用时规则兜底
- 监督模式、Yuri 监督官、本地人脸检测、分心/离位判定、25/5 工作流
- 专注结果、表现面板、冒险地图入口
- 每日提醒 cron、Eazo 用户同步
- 生产：**Vercel**；本地：**docker compose** PostgreSQL

---

## 2. Background · 背景

**EN** — Productivity tools often split into passive planners (no execution help) and harsh lock-down apps (hard to sustain). HoneyPush closes the loop: **AI planning → supervised execution → feedback**.

**中文** — 纯规划类工具依赖极高自律；纯限制类（如强制锁机）易引发逆反。市场需要「理清任务 + 有趣、有陪伴感的强监督执行」闭环。

---

## 3. Why we build · 为什么做

**EN**

- Bridge planning and execution; AI lowers the cost of breaking down and ordering tasks.
- Add emotional feedback via officer personas and gamification so focus feels less lonely.

**中文**

- **弥合规划与执行**：降低「启动瘫痪」门槛。
- **情绪价值**：AI 角色（毒舌、严厉、温柔等）与游戏化，让专注更可坚持。

---

## 4. Target users · 用户定位

| EN | 中文 |
|---|---|
| **Core:** exam prep, university coursework | **核心：** 备考党、高校学生（论文/期末） |
| **Secondary:** office workers, freelancers, multi-task pros | **次核心：** 打工人、自由职业、多线程职场人 |

---

## 5. Key pain points · 核心痛点

**EN**

1. Start paralysis — too many tasks, no clear first step  
2. Interruptions — phone pulls attention during work  
3. No accountability — hard to persist alone  

**中文**

1. **启动困难** — 多线任务无法排序，干脆刷手机  
2. **过程断触** — 「只看 5 分钟」变成浪费数小时  
3. **缺乏反馈** — 缺少外部监督，容易中途放弃  

---

## 6. How AI helps · 借用 AI 的优势

| EN | 中文 |
|---|---|
| **NLP / LLM** — chat-style input → tasks, DDL, schedule | **NLP** — 聊天式输入，提取 DDL、耗时、排期 |
| **CV** — local webcam checks for distraction (privacy-first) | **CV** — 摄像头本地检测低头/玩手机/离座 |
| **Persona** — officer reactions tied to focus behavior | **LLM Persona** — 监督员人设与差异化反馈 |

---

## 7. Core modules · 核心功能模块

### 7.1 Smart scheduling · 智能排期引擎

**EN** — Natural-language (or manual) task intake; AI extracts deadline, duration, Eisenhower quadrant; maps tasks into availability with pomodoro-style blocks (25 min focus + 5 min break); user can edit the calendar.

**中文** — 支持自然语言/文字输入；自动识别任务、DDL、时长与四象限（紧急重要 / 重要不紧急 / 紧急不重要 / 不重要不紧急）；按可用时间切块，用户可再编辑。

### 7.2 Immersive supervision · 沉浸监督局

**EN (shipped)** — User picks a task → supervision overlay → camera enrollment → focus blocks; local CV triggers officer video/audio; strikes can fail a block; focus coins & stats update.

**EN (roadmap)** — Live co-study rooms, 1:1 human supervision (not in current build).

**中文（已上线）** — 选任务进入监督；本地 AI 视觉；摸鱼触发角色互动（如尤里）；PC/Pad 体验最佳。

**中文（规划）** — 真人同频自习室、付费一对一监督等。

**Officer personas / AI 角色（规划扩展）**

| Role / 角色 | Vibe / 性格 | Example / 典型反馈 |
|---|---|---|
| Yuri / 尤里 | Strict, dark humor / 铁血幽默 | Red alert when phone detected / 玩手机红光警报 |
| Sister Gu / 顾姐 | Sarcastic / 毒舌 | 「DDL 拖到下辈子」式吐槽 |
| Lin Feng / 林风 | Gentle coach / 温柔学长 | 鼓励式提醒与休息建议 |

### 7.3 Review & growth · 数据复盘

**EN (shipped)** — Performance APIs, focus history, completion trends on the adventure map.

**EN (roadmap)** — Heatmaps, phone-pickup charts, ROI vs AI estimates, highlight clips for social share.

**中文（已上线）** — 表现面板、专注与任务统计。

**中文（规划）** — 热力图、摸鱼折线、预估 vs 实际 ROI、高光/处刑片段导出分享。

### 7.4 Profile & rewards · 个人档案局

**EN** — Focus coins from completed blocks; officer preferences; privacy: CV runs locally, frames not sent to cloud vision APIs.

**中文** — 专注币、数字工牌式偏好统计；摄像头画面本地分析，不上传云端做轮廓识别以外的用途。

---

## 8. Injective (roadmap) · Injective（规划）

**EN** — Not integrated today. Future: tokenize focus coins on Injective; wallet claim; streak and leaderboard settlement.

**中文** — 当前未集成。未来可将专注币上链，配合钱包领取与成就结算。
