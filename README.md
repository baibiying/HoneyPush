# HoneyPush 督蜜

**Production:** [https://honeypush.vercel.app](https://honeypush.vercel.app)  
**Product spec:** [docs/PRODUCT.md](docs/PRODUCT.md)

Users in mainland China may need a VPN to open [https://honeypush.vercel.app/](https://honeypush.vercel.app/) (hosted on Vercel).

---

## English

### What this project does & how users interact

HoneyPush is an AI-powered scheduling and gamified supervision app for students and knowledge workers.

Typical flow:
1. **Plan** — Sign in, add tasks (natural language or manual), set availability, run AI scheduling.
2. **Execute** — Enter supervision mode, pick an officer, complete camera enrollment, run 25/5 focus blocks.
3. **Accountability** — Local CV detects distraction; officer reacts; block success/failure is recorded.
4. **Review** — Open the performance view for focus history and completion trends.

**Flow:** sign up → describe tasks → AI schedule → supervision → finish blocks → review.

### How AI is used

| Area | Technology | Role |
|---|---|---|
| Task parsing | LLM (`/api/ai-parse-task`) | Structured tasks from free text |
| Smart scheduling | LLM + server (`/api/ai-schedule`) | Calendar blocks from priority + availability |
| Supervision CV | `face-api.js` (browser) | Face enrollment & presence |
| Distraction hints | TensorFlow.js + COCO-SSD (optional) | Phone-use/distraction heuristics |
| Officer feedback | Pre-authored video states | Event-driven reactions (not generative video) |

LLM calls run on the server only (`LLM_API_KEY` / `OPENAI_API_KEY`). Rule-based fallback is used when no key is configured.

### Injective integration

Focus coins may evolve into an Injective on-chain token, with wallet claiming, streak rewards, and leaderboard/achievement settlement. This part is not implemented yet.

### Local development

```bash
docker compose up -d   # PostgreSQL (or: bun run db:up)
bun install
cp .env.example .env
bun run db:migrate
bun dev
```

Default DB: `postgresql://postgres:postgres@localhost:5432/honeypush`  
App: [http://localhost:3000](http://localhost:3000)

If `bun install` stalls on `sharp`:

```bash
SHARP_IGNORE_GLOBAL_LIBVIPS=1 bun install
```

### Environment variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (required) |
| `LLM_API_KEY` | AI parse & schedule key (optional) |
| `LLM_BASE_URL` | Default `https://api.openai.com/v1` |
| `LLM_MODEL` | Default `gpt-4o-mini` |
| `EAZO_PRIVATE_KEY` | Eazo embed session decrypt key |

Aliases: `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_MODEL`.

### Deploy (Vercel)

```bash
vercel deploy --prod
```

Set `DATABASE_URL` (e.g. Neon) in Vercel. Migrations run via `vercel.json` → `scripts/vercel-build.mjs`.  
Optional: `CRON_SECRET` for daily digest. `*.vercel.app` may need VPN in mainland China.

### Learn more

- [Next.js Documentation](https://nextjs.org/docs)

---

## 中文

### 项目做什么、用户如何使用

HoneyPush 是一个结合 AI 排期与游戏化监督执行的效率产品，面向学生和知识工作者。

主要流程：
1. **规划** — 登录后录入任务（自然语言或手动），设置可用时间，执行 AI 排期。
2. **执行** — 进入监督模式，选择监督官，完成摄像头采集后开始专注块（25/5）。
3. **监督反馈** — 本地视觉检测分心/离位，触发角色反馈，影响专注块结果。
4. **复盘** — 在表现面板查看专注数据与任务完成情况。

**典型路径：** 注册登录 → 输入任务 → AI 排期 → 开始监督 → 完成专注块 → 查看复盘。

### AI 如何在项目中被使用

| 模块 | 技术 | 作用 |
|---|---|---|
| 任务解析 | LLM（`/api/ai-parse-task`） | 将自然语言解析为结构化任务 |
| 智能排期 | LLM + 服务端（`/api/ai-schedule`） | 基于优先级与可用时间生成日程块 |
| 监督识别 | `face-api.js`（浏览器本地） | 人脸采集与在位检查 |
| 分心检测辅助 | TensorFlow.js + COCO-SSD（可选） | 手机/分心行为辅助识别 |
| 角色反馈 | 预制视频状态机 | 事件驱动反馈（非生成式视频） |

LLM 仅在服务端调用（`LLM_API_KEY` / `OPENAI_API_KEY`），未配置时有规则兜底。

### Injective 集成说明

「专注币」可演进为 Injective 链上代币，结合钱包领取、连续专注奖励、排行榜/成就结算。该部分尚未实现。

### 本地开发

```bash
docker compose up -d   # PostgreSQL（或 bun run db:up）
bun install
cp .env.example .env
bun run db:migrate
bun dev
```

默认连接串：`postgresql://postgres:postgres@localhost:5432/honeypush`  
访问地址：[http://localhost:3000](http://localhost:3000)

若 `bun install` 在 `sharp` 卡住：

```bash
SHARP_IGNORE_GLOBAL_LIBVIPS=1 bun install
```

### 环境变量

| 变量 | 说明 |
|---|---|
| `DATABASE_URL` | PostgreSQL 连接串（必填） |
| `LLM_API_KEY` | AI 解析与排期密钥（可选） |
| `LLM_BASE_URL` | 默认为 `https://api.openai.com/v1` |
| `LLM_MODEL` | 默认为 `gpt-4o-mini` |
| `EAZO_PRIVATE_KEY` | Eazo 嵌入场景会话解密密钥 |

别名：`OPENAI_API_KEY`、`OPENAI_BASE_URL`、`OPENAI_MODEL`。

### 部署（Vercel）

```bash
vercel deploy --prod
```

在 Vercel 配置 `DATABASE_URL`（如 Neon）后部署。构建会通过 `vercel.json` → `scripts/vercel-build.mjs` 自动执行迁移。  
可选：`CRON_SECRET`（每日提醒）。中国大陆访问 `*.vercel.app` 可能需要 VPN。

### 延伸阅读

- [Next.js Documentation](https://nextjs.org/docs)
