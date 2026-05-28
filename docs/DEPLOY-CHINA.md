# 国内访问部署说明

## 为什么 Vercel 需要 VPN？

`*.vercel.app` 在国内网络下经常被限速或阻断。  
这不是应用代码 bug，而是 **托管平台节点在海外**。

仅改前端代码 **无法** 让 `https://honeypush.vercel.app` 在国内稳定直连。

## 推荐方案：自建 Docker（香港 / 国内服务器）

用户访问你的服务器 IP 或已备案域名，**不需要 VPN**，监控页模型也从同域 `/models` 加载。

### 1. 准备服务器

- 香港或国内云主机（1 核 2G 起）
- 安装 Docker 与 Docker Compose

### 2. 部署

```bash
git clone https://github.com/baibiying/HoneyPush.git
cd HoneyPush
cp .env.production.example .env.production
# 编辑 .env.production，至少配置 LLM_API_KEY（可选）

docker compose -f docker-compose.prod.yml up -d --build
```

浏览器打开：`http://你的服务器IP:3000`

### 3. 绑定域名（可选）

- **香港服务器**：域名 A 记录指向 IP 即可
- **大陆服务器**：需 ICP 备案后才能用 80/443 域名

### 4. 与 Vercel 版区别

| | Vercel | Docker 自建 |
|---|--------|-------------|
| 国内直连 | 通常需 VPN | 可直连 |
| 数据库 | Neon（海外） | 同机 PostgreSQL |
| 人脸模型 | `/models` 同域 | `/models` 同域 |

## 已做的代码优化（两版通用）

- 字体改为 `next/font` 打包，不再运行时请求 Google Fonts
- 生产环境人脸权重 **仅** 从 `/models` 加载，不走 jsDelivr
- CSP 收紧，减少对外网 CDN 依赖

## 仍可能走外网的接口（按需）

- **LLM**：`LLM_BASE_URL` 指向 DeepSeek 等国内 API 时无需 VPN
- **B 站预览**：`player.bilibili.com`
- **教官视频代理**：`124.221.38.152:8080`（若在国内，反而更快）
