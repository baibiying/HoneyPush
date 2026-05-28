# Zeabur 部署指南（国内访问更友好）

[Zeabur](https://zeabur.com) 可从 GitHub 一键部署 Next.js，并自带 PostgreSQL，一般比 `*.vercel.app` 更容易在国内打开。

## 一、准备

1. 注册 [Zeabur](https://zeabur.com)（可用 GitHub 登录）
2. 确保代码已推到 GitHub：`baibiying/HoneyPush`

## 二、创建项目

1. 控制台 → **New Project**
2. 选择区域（可选 **Hong Kong** 等对国内更友好的节点）

## 三、添加 PostgreSQL

1. 项目中点击 **Add Service** → **Template** / **Marketplace**
2. 搜索 **PostgreSQL** → 部署
3. 等待 Postgres 服务状态为 Running

## 四、部署 HoneyPush 应用

1. **Add Service** → **Git** → 选择仓库 `HoneyPush`，分支 `main`
2. Zeabur 会识别为 Next.js（已配置 `zbpack.json`）：
   - 构建：`bun run build:deploy`（含数据库迁移）
   - 启动：`bun run start`

## 五、配置环境变量（重要）

进入 **HoneyPush 应用服务** → **Variables**，添加：

| 变量名 | 值 |
|--------|-----|
| `DATABASE_URL` | `${POSTGRES_CONNECTION_STRING}` |
| `NEXT_PUBLIC_SITE_URL` | `${ZEABUR_WEB_URL}` |

可选：

| 变量名 | 说明 |
|--------|------|
| `LLM_API_KEY` | AI 排程（DeepSeek 等国内 API 更佳） |
| `LLM_BASE_URL` | 如 `https://api.deepseek.com/v1` |
| `LLM_MODEL` | 如 `deepseek-chat` |

保存后 **Redeploy** 一次。

> 若构建报「未配置 DATABASE_URL」，说明 Postgres 与应用不在同一 Project，或变量名写错。

## 六、绑定域名

1. 应用服务 → **Networking** / **Domains**
2. 使用 Zeabur 提供的 `*.zeabur.app` 域名，或绑定自己的域名
3. 将 `NEXT_PUBLIC_SITE_URL` 改为最终访问地址（若与 `${ZEABUR_WEB_URL}` 不同）

## 七、验证

1. 打开 Zeabur 给的网址
2. 注册账号 → 创建任务 → 进入监控页测试摄像头与人脸采集

## 与 Vercel 的区别

| | Vercel | Zeabur |
|---|--------|--------|
| 国内访问 | 常需 VPN | 通常更稳定 |
| 数据库 | Neon（需另配） | 同项目 PostgreSQL |
| 构建命令 | `vercel.json` | `zbpack.json` |

## 常见问题

**构建失败 `bun: command not found`**  
在 Variables 添加：`ZBPACK_BUILD_COMMAND=npm run build:deploy` 和 `ZBPACK_START_COMMAND=npm run start`（会用 npm 代替 bun）。

**人脸模型一直加载**  
确认 `public/models/*.bin` 已随仓库部署；生产环境只从同域 `/models` 加载，无需 VPN 访问国外 CDN。
