# Railway 部署指南

[Railway](https://railway.com) 支持从 GitHub 部署全栈 Next.js，并可一键添加 PostgreSQL。配置已写入仓库根目录的 `railway.json`（使用项目内 `Dockerfile`）。

## 费用与国内访问（必读）

| 项目 | 说明 |
|------|------|
| 费用 | 新账号通常有约 **$5 试用额度**，用完后按用量计费（非长期完全免费） |
| 国内访问 | 节点主要在海外，`*.railway.app` **和 Vercel 类似，国内可能仍需 VPN** |
| 适合 | 想快速体验全栈部署、能接受英文控制台和可能 VPN 的用户 |

若目标是 **国内免 VPN**，更建议 [DEPLOY-CHINA.md](./DEPLOY-CHINA.md)（腾讯云 CloudBase）或本地开发。

---

## 部署步骤

### 1. 注册 Railway

1. 打开 https://railway.com ，用 GitHub 登录  
2. 授权访问仓库 `baibiying/HoneyPush`

### 2. 新建项目并部署应用

1. **New Project** → **Deploy from GitHub repo**  
2. 选择 `HoneyPush`，分支 `main`  
3. Railway 会检测到 `Dockerfile` 并开始构建（构建 + 启动时自动跑数据库迁移）

### 3. 添加 PostgreSQL

1. 在项目画布点击 **+ New** → **Database** → **PostgreSQL**  
2. 等待数据库服务变为 Active  

### 4. 连接数据库到应用

1. 点击 **HoneyPush 应用服务** → **Variables**  
2. **Add Reference** → 选择 Postgres 的 **`DATABASE_URL`**  
3. 保存后 Railway 会 **自动重新部署**

应用内会读到 `DATABASE_URL`（与 Neon/Vercel 相同变量名）。

### 5. 公网访问

1. 应用服务 → **Settings** → **Networking**  
2. **Generate Domain** → 得到 `xxx.up.railway.app`  
3. 可选：在 Variables 添加  
   - `NEXT_PUBLIC_SITE_URL` = `https://你的域名.up.railway.app`

### 6. 可选环境变量

| 变量 | 说明 |
|------|------|
| `LLM_API_KEY` | AI 排程 |
| `LLM_BASE_URL` | 如 `https://api.deepseek.com/v1` |
| `LLM_MODEL` | 如 `deepseek-chat` |

---

## 构建说明

- **Dockerfile**：安装依赖 → `npm run build` → 启动时 `docker-entrypoint.sh` 执行 `db:migrate` 再 `npm start`  
- **端口**：Railway 注入 `PORT`，Next.js 会自动使用  
- **人脸模型**：同域 `/models`，不依赖国外 CDN  

---

## 常见问题

**构建失败：数据库相关**  
先添加 PostgreSQL 并 **引用 `DATABASE_URL`**，再 Redeploy。

**启动后 502**  
查看 **Deploy Logs**；确认迁移成功、Postgres 已连接。

**国内打不开**  
属网络环境问题，可换 CloudBase / 本地开发，或配合 VPN 访问 Railway 域名。

**额度用完**  
在 Railway 控制台查看 Usage，或绑定支付方式； Hobby 级流量小项目通常几美元/月量级。

---

## 与 Vercel 对比

| | Vercel | Railway |
|---|--------|---------|
| 免费 | Hobby 较宽松 | 试用额度后计费 |
| Postgres | 需 Neon 等 | 项目内一键添加 |
| 国内访问 | 常需 VPN | 也常需 VPN |
| 配置 | `vercel.json` | `railway.json` + `Dockerfile` |
