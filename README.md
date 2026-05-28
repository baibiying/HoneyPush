# HoneyPush 督蜜

**Production:** [https://honeypush.vercel.app](https://honeypush.vercel.app) · **线上地址:** 同上  
**Product spec:** [docs/PRODUCT.md](docs/PRODUCT.md) · **产品文档:** 同上

---

## What this project does & how users interact · 项目做什么、用户如何使用

HoneyPush is an AI-powered scheduling and gamified supervision app for students and knowledge workers.

Typical flow:
1. **Plan** — Sign in, add tasks (natural language or manual), set availability, run AI scheduling.
2. **Execute** — Enter supervision mode, pick an officer, complete camera enrollment, run 25/5 focus blocks.
3. **Accountability** — Local CV detects distraction; officer reacts; block success/failure is recorded.
4. **Review** — Open the performance view for focus history and completion trends.

**Flow:** sign up → describe tasks → AI schedule → supervision → finish blocks → review.

HoneyPush 是一款结合 AI 排期与游戏化监督执行的效率产品，面向学生和知识工作者。

主要流程：
1. **规划** — 登录后录入任务（自然语言或手动），设置可用时间，执行 AI 排期。
2. **执行** — 进入监督模式，选择监督官，完成摄像头采集后开始专注块（25/5）。
3. **监督反馈** — 本地视觉检测分心/离位，触发角色反馈，影响专注块结果。
4. **复盘** — 在表现面板查看专注数据与任务完成情况。

**典型路径：** 注册登录 → 输入任务 → AI 排期 → 开始监督 → 完成专注块 → 查看复盘。

---

## How AI is used · AI 如何在项目中被使用

| Area / 模块 | Technology / 技术 | Role / 作用 |
|---|---|---|
| Task parsing / 任务解析 | LLM (`/api/ai-parse-task`) | Structured tasks from free text / 自然语言 → 结构化任务 |
| Smart scheduling / 智能排期 | LLM + server (`/api/ai-schedule`) | Calendar blocks from priority + availability / 生成可执行日程块 |
| Supervision CV / 监督识别 | `face-api.js` (browser) | Face enrollment & presence / 人脸采集与在位检查 |
| Distraction hints / 分心辅助 | TensorFlow.js + COCO-SSD (optional) | Phone-use heuristics / 摸鱼行为辅助识别 |
| Officer feedback / 角色反馈 | Pre-authored video states | Event-driven reactions (not generative video) / 预制视频状态机 |

LLM calls run on the server only (`LLM_API_KEY` / `OPENAI_API_KEY`). Rule-based fallback if no API key.

LLM 仅在服务端调用，密钥不下发前端。未配置 `LLM_API_KEY` 时使用规则兜底。

---

## Injective integration · Injective 集成说明

**EN — Current status:** not integrated. No Injective SDK, wallet, or on-chain logic; data lives in PostgreSQL.

**EN — Future possibility:** Focus coins may become a token on Injective, with wallet claiming, streak rewards, and leaderboard/achievement settlement. Roadmap only.

**中文 — 当前状态：** 未集成。无 Injective SDK、钱包或链上交易；数据在 PostgreSQL。

**中文 — 未来可能性：** 「专注币」可演进为链上代币，结合 Injective 做领取、连续专注奖励、排行榜/成就结算。尚未实现。

---

## Local development · 本地开发

**EN**

```bash
docker compose up -d   # PostgreSQL (or: bun run db:up)
bun install
cp .env.example .env
bun run db:migrate
bun dev
```

Default DB: `postgresql://postgres:postgres@localhost:5432/honeypush`  
App: [http://localhost:3000](http://localhost:3000)

If `bun install` stalls on `sharp`: `SHARP_IGNORE_GLOBAL_LIBVIPS=1 bun install`

**中文**

```bash
docker compose up -d   # 或 bun run db:up
bun install
cp .env.example .env
bun run db:migrate
bun dev
```

默认连接串见 `.env.example`：`postgresql://postgres:postgres@localhost:5432/honeypush`  
未启动 Docker Postgres 时会报数据库连接错误。

---

## Environment variables · 环境变量

| Variable | EN | 中文 |
|---|---|---|
| `DATABASE_URL` | PostgreSQL (required) | 数据库连接串（必填） |
| `LLM_API_KEY` | AI parse & schedule (optional) | AI 解析与排期（可选） |
| `LLM_BASE_URL` | Default `https://api.openai.com/v1` | 可选，兼容 OpenAI 协议 |
| `LLM_MODEL` | Default `gpt-4o-mini` | 可选模型名 |
| `EAZO_PRIVATE_KEY` | Eazo embed session decrypt | Eazo 嵌入时的会话解密 |

Aliases: `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_MODEL`.

---

## Deploy (Vercel) · 部署

**EN**

```bash
vercel deploy --prod
```

Set `DATABASE_URL` (e.g. Neon) in Vercel. Migrations run via `vercel.json` → `scripts/vercel-build.mjs`.  
Optional: `CRON_SECRET` for daily digest. `*.vercel.app` may need VPN in mainland China.

**中文**

在 Vercel 配置 `DATABASE_URL`（如 Neon）后执行 `vercel deploy --prod`。构建会自动跑数据库迁移。国内访问 `*.vercel.app` 可能需 VPN。

---

## Learn more · 延伸阅读

- [Eazo Documentation](https://docs.eazo.ai)
- [Next.js Documentation](https://nextjs.org/docs)
