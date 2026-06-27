# 阿里云部署指南（HoneyPush 督蜜）

一台 **轻量应用服务器** 跑 App + PostgreSQL，大陆访问比 Vercel 稳定。月费约 **¥24–60**。

---

## 部署清单（按顺序做）

- [ ] 1. 购买 Ubuntu 轻量服务器（**不要**选 OpenClaw 应用镜像）
- [ ] 2. 防火墙放行 **22**、**3000**
- [ ] 3. 能登录服务器（SSH 密钥 或 Workbench）
- [ ] 4. 安装 Docker
- [ ] 5. 把代码传到服务器 `~/HoneyPush/`
- [ ] 6. 配置 `.env.production`
- [ ] 7. `docker compose ... up -d --build`
- [ ] 8. 浏览器打开 `http://<公网IP>:3000`

下文是每一步的详细说明。

---

## 1. 购买服务器

登录 [轻量应用服务器控制台](https://swas.console.aliyun.com/) → 创建实例。

| 项 | 怎么选 |
|---|---|
| 镜像 | **系统镜像 → Ubuntu 22.04**（不要选 OpenClaw 应用镜像） |
| 规格 | 2 核 2G 起；Docker 构建吃内存，卡/OOM 可升 2 核 4G |
| 地域 | 华东/华南均可；香港免备案但略贵 |
| 登录 | **密钥对**（下载 `.pem`）或 **自定义密码** |

记下：**公网 IP**（例：`47.102.98.10`）。

---

## 2. 放行防火墙端口

轻量服务器有**独立防火墙**（和安全组不是一回事）。

控制台 → 你的实例 → **防火墙** → 添加规则：

| 协议 | 端口 | 用途 |
|---|---|---|
| TCP | **22** | SSH / rsync 上传 |
| TCP | **3000** | 访问 HoneyPush |

授权对象可先填 `0.0.0.0/0`（仅 Demo；生产建议收窄）。

---

## 3. 登录服务器

### 方式 A：SSH + 密钥（本机终端）

创建实例时若下载了 `.pem`：

```bash
chmod 400 ~/Downloads/你的密钥.pem
ssh -i ~/Downloads/你的密钥.pem root@<公网IP>
```

### 方式 B：Workbench（不用配密钥，推荐新手）

控制台 → 实例 → **远程连接** → **Workbench**，浏览器里直接进终端。

### 常见 SSH 报错

| 报错 | 原因 | 处理 |
|---|---|---|
| `Connection refused` | 22 未放行或 ssh 未启动 | 检查防火墙；Workbench 里 `sudo systemctl start ssh` |
| `Permission denied (publickey)` | 没带 `.pem` | 用 `ssh -i xxx.pem root@...` 或改用 Workbench |

---

## 4. 安装 Docker

在服务器终端执行：

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker
docker compose version
```

**拉镜像慢：** 阿里云控制台 → 容器镜像服务 → **镜像加速器**，把地址写入 `/etc/docker/daemon.json`：

```json
{
  "registry-mirrors": ["https://你的加速器地址.mirror.aliyuncs.com"]
}
```

然后：

```bash
sudo systemctl restart docker
```

---

## 5. 上传代码

> 服务器在国内，**不要**指望 `git clone github.com`；也**不必**给服务器装 VPN。

### 方式 A：本机 rsync（Mac 已有代码，推荐）

```bash
cd /Users/abbybai/IdeaProjects/HoneyPush

# 有 .pem 密钥时（把路径换成你的）
rsync -avz \
  -e "ssh -i ~/Downloads/你的密钥.pem" \
  --exclude node_modules \
  --exclude .next \
  --exclude .git \
  ./ root@<公网IP>:~/HoneyPush/
```

没有密钥、只有 Workbench 时，用 **方式 B**。

### 方式 B：打包 + Workbench 上传（最稳）

**Mac 本地：**

```bash
cd /Users/abbybai/IdeaProjects/HoneyPush
tar czf ~/honeypush.tar.gz --exclude=node_modules --exclude=.next --exclude=.git .
```

Workbench 远程连接 → **上传文件** → 把 `honeypush.tar.gz` 传到 `/root/`。

**服务器：**

```bash
mkdir -p ~/HoneyPush
cd ~/HoneyPush
tar xzf ~/honeypush.tar.gz
ls   # 应能看到 docker-compose.prod.yml、Dockerfile 等
```

### 方式 C：Gitee 镜像（以后要 git pull）

1. [gitee.com](https://gitee.com) 导入 `baibiying/HoneyPush`
2. 服务器：`git clone https://gitee.com/<用户名>/HoneyPush.git`

---

## 6. 配置环境变量

在服务器上，**必须在 `~/HoneyPush/` 目录**（与 `docker-compose.prod.yml` 同级）：

```bash
cd ~/HoneyPush
cp .env.production.example .env.production
nano .env.production
```

**至少改这三项**（密码两处保持一致）：

```bash
POSTGRES_PASSWORD=换成你的强密码
DATABASE_URL=postgresql://postgres:换成你的强密码@postgres:5432/honeypush
NEXT_PUBLIC_SITE_URL=http://<公网IP>:3000
```

示例（IP 为 `47.102.98.10`）：

```bash
POSTGRES_PASSWORD=MyStr0ng-Pass!
DATABASE_URL=postgresql://postgres:MyStr0ng-Pass!@postgres:5432/honeypush
NEXT_PUBLIC_SITE_URL=http://47.102.98.10:3000
```

可选 AI 功能：

```bash
LLM_API_KEY=你的密钥
LLM_BASE_URL=https://api.deepseek.com/v1
LLM_MODEL=deepseek-chat
```

保存：`Ctrl+O` → 回车 → `Ctrl+X`。

---

## 7. 构建并启动

仍在 `~/HoneyPush/`：

```bash
npm run deploy:prod
```

等价于：

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

> **必须**带 `--env-file .env.production`，否则 Compose 读不到 `NEXT_PUBLIC_SITE_URL` 等变量，构建/启动会失败。

- 首次约 **5–15 分钟**（拉镜像 + 编译 Next.js）
- 看到 `Started` / 无报错即可

查看进度：

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f app
```

`Ctrl+C` 退出日志（不会停服务）。

---

## 8. 验证

**服务器上：**

```bash
curl http://127.0.0.1:3000/api/auth/me
# 期望：{"user":null}
```

**本机浏览器：**

```text
http://<公网IP>:3000
```

注册 → 登录 → 添加任务，应和本地一样流畅。

---

## 9. 日常运维

```bash
cd ~/HoneyPush

# 状态
docker compose --env-file .env.production -f docker-compose.prod.yml ps

# 应用日志
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f app

# 改代码后重新部署（先 rsync/上传新代码）
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build

# 停止
docker compose --env-file .env.production -f docker-compose.prod.yml down

# 停止并删数据卷（⚠️ 清空数据库）
docker compose --env-file .env.production -f docker-compose.prod.yml down -v
```

---

## 10. 环境变量说明

### 生产环境读哪个文件？

| 环境 | 配置文件 | 谁读取 |
|---|---|---|
| **本地开发** | `.env` | Next.js + 代码里的 `dotenv`（仅 `NODE_ENV !== production` 时） |
| **阿里云 Docker 生产** | **`.env.production`** | `docker-compose.prod.yml` 的 `env_file` → 注入为容器环境变量 |

应用代码**不直接打开** `.env.production`，只读 `process.env.DATABASE_URL` 等。  
Docker Compose 启动时把 `.env.production` 里的键值写进容器环境，和「读 `.env`」效果一样，只是文件名分开，避免和本地 `.env` 混淆。

**注意：**

- 不要把 `.env.production` 改名为 `.env` 也能跑——Compose 认的是 `env_file: .env.production`
- 镜像里**不会**打包 `.env` / `.env.production`（见 `.dockerignore`），密钥只在服务器磁盘上
- 改 `.env.production` 后需重建：`docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build`

### 变量列表

| 变量 | 必填 | 说明 |
|---|---|---|
| `POSTGRES_PASSWORD` | ✅ | PostgreSQL 密码 |
| `DATABASE_URL` | ✅ | App 连接串，`postgres` 为 Docker 服务名，密码与上一项一致 |
| `NEXT_PUBLIC_SITE_URL` | 建议 | 站点 URL，用于分享预览图 |
| `LLM_API_KEY` | 可选 | AI 排期/解析；不配则用规则兜底 |
| `LLM_BASE_URL` / `LLM_MODEL` | 可选 | LLM 提供商 |
| `CRON_SECRET` | 可选 | 定时 digest 接口鉴权 |

---

## 11. 绑定域名与 HTTPS（可选）

1. 域名 A 记录 → 公网 IP  
2. 大陆服务器对外提供 web 服务通常需 **ICP 备案**  
3. Nginx 反代 `127.0.0.1:3000`，配置 SSL  

```nginx
server {
    listen 80;
    server_name your-domain.com;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

改 `NEXT_PUBLIC_SITE_URL=https://your-domain.com` 后：

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build app
```

---

## 12. 故障排查

| 现象 | 处理 |
|---|---|
| `Connection refused` (SSH) | 防火墙加 **TCP 22** |
| `Permission denied (publickey)` | `ssh -i xxx.pem root@IP` 或用 Workbench |
| `POSTGRES_PASSWORD is missing` | 确认在 `~/HoneyPush/` 下有 `.env.production`，且含 `POSTGRES_PASSWORD` 与 `DATABASE_URL` |
| 页面打不开 | 防火墙加 **TCP 3000**；`docker compose ps` 看 app 是否 Up |
| 注册/登录失败 | `docker compose logs app` 看数据库报错 |
| `git clone` GitHub 失败 | 用 rsync / Workbench 上传，或 Gitee 镜像 |
| Docker build 很慢或失败 | 配镜像加速；内存不足升 2C4G |
| 改了 `.env.production` 不生效 | `docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build` 重建 app |

---

## 13. 费用参考

| 项目 | 月费 |
|---|---|
| 轻量 2C2G | ≈ ¥24–60 |
| PostgreSQL（同机 Docker） | ¥0 |
| 域名 + SSL | 可选 |

---

## 14. 与 Vercel 的区别

| | Vercel | 阿里云本方案 |
|---|---|---|
| 大陆访问 | 常需 VPN，易 `load failed` | 直连公网 IP |
| 数据库 | Neon 等外部服务 | 同机 PostgreSQL |
| 运维 | 免运维 | 自己管防火墙、备份 |
| 定时任务 | `vercel.json` cron | 需自建 cron 调 `/api/notifications/cron/daily-digest` |

数据备份：PostgreSQL 数据在 Docker volume `honeypush_pg_data`，重要数据请定期快照或 `pg_dump`。
