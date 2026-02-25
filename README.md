# AI Novel Writing System

一个基于大语言模型的智能小说创作系统，采用全栈架构（React + Node.js + Express）。

## 特性

- **小说项目管理** - 创建、编辑、管理小说项目
- **章节编辑** - 支持富文本编辑，自动保存
- **AI 内容生成** - 基于 ModelScope API 的智能内容生成
- **角色管理** - 角色关系图谱、角色弧光追踪
- **世界观设定** - 自定义分类系统，设定条目管理
- **灵感素材库** - 收集和管理创作灵感
- **本地/云端双模式** - 支持 SQLite 本地存储和 Supabase 云端存储

## 技术栈

### 前端
- React 18 + TypeScript
- Vite (构建工具)
- Ant Design 5 (UI 组件)
- Zustand (状态管理)
- React Router DOM (路由)
- ECharts (关系图谱)
- Tailwind CSS (样式)

### 后端
- Node.js + Express
- SQLite (本地数据库) / Supabase (云端数据库)
- ModelScope API (AI 集成)

## 快速开始

### 本地开发

```bash
# 克隆项目
git clone <repository-url>
cd auto_write_book

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 访问应用
# 前端: http://localhost:5173
# 后端: http://localhost:3002
```

### 环境配置

复制 `.env.example` 到 `.env` 并配置环境变量：

```env
# 数据库类型: 'sqlite' (本地) 或 'supabase' (云端)
DB_TYPE=sqlite

# Supabase 配置 (仅云端模式需要)
VITE_SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# 服务器端口
PORT=3002

# ModelScope API Key
MODELSCOPE_API_KEY=ms-54964895-9e08-409e-80ab-fe3709c1b1e0
```

## 云端部署

### 使用 Vercel 部署 (推荐)

最简单的部署方式是使用 Vercel，可以同时部署前端和后端。

**步骤：**

1. **设置 Supabase 数据库**
   - 访问 https://supabase.com 创建项目
   - 在 SQL Editor 中运行 `DEPLOYMENT.md` 中的数据库脚本
   - 获取 API 凭证

2. **部署到 Vercel**
   ```bash
   # 安装 Vercel CLI
   npm i -g vercel

   # 部署
   npm run deploy:prod
   ```

3. **配置环境变量**
   - 在 Vercel 项目设置中添加：
     - `DB_TYPE=supabase`
     - `VITE_SUPABASE_URL=your-supabase-url`
     - `SUPABASE_SERVICE_ROLE_KEY=your-service-role-key`
     - `MODELSCOPE_API_KEY=ms-54964895-9e08-409e-80ab-fe3709c1b1e0`

详细部署指南请查看 [DEPLOYMENT.md](./DEPLOYMENT.md)

### 使用部署脚本

**Windows:**
```bash
scripts\deploy.bat
```

**Linux/Mac:**
```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

## 项目结构

```
auto_write_book/
├── api/                    # 后端 API
│   ├── lib/
│   │   ├── db.ts          # 数据库抽象层 (支持 SQLite/Supabase)
│   │   ├── database.ts    # SQLite 实现
│   │   └── supabase.ts    # Supabase 客户端
│   ├── routes/            # API 路由
│   ├── app.ts             # Express 应用配置
│   ├── server.ts          # 服务器入口
│   └── index.ts           # Vercel 入口
├── src/                   # 前端源码
│   ├── components/        # React 组件
│   ├── pages/            # 页面组件
│   ├── lib/              # 工具库
│   └── main.tsx          # 前端入口
├── data/                  # 本地数据目录 (SQLite)
├── scripts/               # 部署脚本
├── vercel.json           # Vercel 配置
├── railway.json          # Railway 配置
└── package.json
```

## 数据库架构

项目支持两种数据库：

### SQLite (本地开发)
- 文件位置: `data/novels.db`
- 同步 API，高性能
- 无需额外服务

### Supabase (云端部署)
- PostgreSQL 数据库
- 免费额度: 500MB 存储
- 支持行级安全策略

**主要表结构：**
- `users` - 用户表
- `novels` - 小说表
- `chapters` - 章节表
- `characters` - 角色表
- `character_relationships` - 角色关系表
- `character_states` - 角色状态表
- `worldview_categories` - 世界观分类表
- `worldview_entries` - 世界观条目表
- `inspiration_materials` - 灵感素材表

## 开发命令

```bash
# 开发模式 (前端 + 后端)
npm run dev

# 仅启动前端开发服务器
npm run client:dev

# 仅启动后端开发服务器
npm run server:dev

# 构建生产版本
npm run build:prod

# 本地运行生产版本
npm run prod

# 代码检查
npm run check
npm run lint

# 部署到 Vercel (预览)
npm run deploy

# 部署到 Vercel (生产)
npm run deploy:prod
```

## 费用说明

使用免费服务部署，总成本为 **$0/月**：

| 服务 | 免费额度 |
|------|----------|
| Vercel | 100GB 带宽/月 |
| Supabase | 500MB 数据库 |

## 常见问题

### 如何切换数据库模式？

修改 `.env` 文件中的 `DB_TYPE` 变量：
- `DB_TYPE=sqlite` - 使用本地 SQLite
- `DB_TYPE=supabase` - 使用 Supabase 云端数据库

### 本地数据存储在哪里？

SQLite 数据库文件位于 `data/novels.db`。建议定期备份此文件。

### 如何备份云端数据？

Supabase 控制台 → Database → Backups → 启用每日备份

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！
