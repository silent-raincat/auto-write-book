# AI 小说创作系统 - 项目状态文档

> 更新时间：2026-02-25
> 项目版本：v0.1.0

## 项目概述

一个基于大语言模型的智能小说创作系统，采用全栈架构（React + Node.js + Express），支持云端部署。

---

## 部署状态

### 当前部署

| 服务 | URL | 状态 | 备注 |
|------|-----|------|------|
| **前端 (Vercel)** | https://autowritebook.vercel.app | ✅ 在线 | 自动部署 |
| **后端 API (Railway)** | https://auto-write-book-production.up.railway.app | ✅ 在线 | 需要配置环境变量 |
| **数据库 (Supabase)** | https://vqzquozjtftgcufnrsin.supabase.co | ✅ 配置 | 需要添加 password_hash 列 |

### 待完成配置

#### 1. Supabase 数据库
执行以下 SQL 添加 password_hash 列：
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
```

#### 2. Railway 环境变量
| 变量名 | 值 |
|--------|-----|
| `JWT_SECRET` | `novel-writing-jwt-secret-key-2024-change-in-production` |
| `JWT_EXPIRES_IN` | `7d` |
| `DB_TYPE` | `supabase` |
| `VITE_SUPABASE_URL` | `https://vqzquozjtftgcufnrsin.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGc...Yecs` |

---

## 已实现功能

### 核心功能
- ✅ 小说项目管理（创建、编辑、删除）
- ✅ 章节编辑（富文本编辑器）
- ✅ AI 内容生成（基于 ModelScope API）
- ✅ 大纲生成

### 角色系统
- ✅ 角色管理（创建、编辑、删除）
- ✅ 角色关系管理
- ✅ 角色关系图谱（ECharts 可视化）
- ✅ 角色弧光（章节关联式状态记录）

### 世界观设定
- ✅ 自定义分类系统
- ✅ 设定条目管理
- ✅ 关联角色和条目
- ✅ 搜索功能
- ✅ 智能世界观分析

### 灵感管理
- ✅ 灵感素材池
- ✅ 分类管理
- ✅ 关联章节

### 用户系统
- ✅ 用户注册/登录
- ✅ JWT 认证
- ✅ 个人中心
- ✅ ModelScope API Key 管理（用户级别）

### 部署配置
- ✅ Vercel 前端部署
- ✅ Railway 后端部署
- ✅ Supabase 云数据库
- ✅ 双数据库支持（本地 SQLite / 云端 Supabase）

---

## 待实现功能

### 高优先级
- [ ] 章节版本历史查看
- [ ] 章节对比功能
- [ ] 导出小说为 PDF/EPUB
- [ ] 批量生成章节

### 中优先级
- [ ] 协作编辑功能
- [ ] 评论系统
- [ ] 标签和分类管理
- [ ] 搜索优化

### 低优先级
- [ ] 数据备份/恢复
- [ ] 数据导入/导出
- [ ] 多语言支持
- [ ] 深色模式优化

---

## 技术栈

### 前端
```
- React 18 + TypeScript
- Vite (构建工具)
- Ant Design 5 (UI 组件)
- Zustand (状态管理)
- React Router DOM (路由)
- ECharts (图表可视化)
- React Quill (富文本编辑器)
- Tailwind CSS (样式)
```

### 后端
```
- Node.js + Express + TypeScript
- SQLite / Supabase (数据库)
- JWT (认证)
- bcryptjs (密码加密)
- ModelScope API (AI 集成)
```

### 部署
```
- Vercel (前端托管)
- Railway (后端 API)
- Supabase (云数据库)
```

---

## 项目结构

```
auto_write_book/
├── api/                        # 后端 API
│   ├── lib/
│   │   ├── db.ts              # 数据库抽象层
│   │   ├── database.ts        # SQLite 实现
│   │   └── supabase.ts        # Supabase 客户端
│   ├── routes/                # API 路由
│   │   ├── auth.ts            # 认证相关
│   │   ├── novels.ts          # 小说管理
│   │   ├── chapters.ts        # 章节管理
│   │   ├── characters.ts      # 角色管理
│   │   ├── characterRelationships.ts
│   │   ├── characterStates.ts
│   │   ├── worldviewCategories.ts
│   │   ├── worldviewEntries.ts
│   │   ├── inspirations.ts    # 灵感管理
│   │   ├── ai.ts             # AI 生成
│   │   └── users.ts          # 用户管理
│   ├── app.ts                # Express 应用配置
│   ├── server.ts             # 服务器入口
│   └── index.ts              # Vercel 入口
├── src/                       # 前端源码
│   ├── components/
│   │   ├── layout/           # 布局组件
│   │   ├── auth/             # 认证组件
│   │   └── ...
│   ├── pages/
│   │   ├── auth/             # 登录/注册页面
│   │   ├── dashboard/        # 仪表盘
│   │   ├── editor/           # 编辑器
│   │   ├── characters/       # 角色管理
│   │   ├── worldview/        # 世界观
│   │   └── profile/          # 个人中心
│   ├── stores/               # Zustand 状态管理
│   │   ├── useAuthStore.ts
│   │   ├── useCharacterStore.ts
│   │   └── useWorldViewStore.ts
│   └── lib/
│       ├── api.ts            # API 客户端
│       └── utils.ts         # 工具函数
├── scripts/                  # 部署脚本
├── data/                     # 本地数据目录
├── vercel.json              # Vercel 配置
├── railway.json             # Railway 配置
└── package.json
```

---

## 环境变量配置

### 本地开发 (.env)
```env
# 数据库类型
DB_TYPE=sqlite

# 服务器配置
PORT=3002
NODE_ENV=development

# JWT 认证
JWT_SECRET=novel-writing-jwt-secret-key-2024-change-in-production
JWT_EXPIRES_IN=7d

# ModelScope AI
MODELSCOPE_API_KEY=ms-54964895-9e08-409e-80ab-fe3709c1b1e0
```

### 云端部署

#### Vercel 环境变量
```
DB_TYPE=supabase
```

#### Railway 环境变量
```
DB_TYPE=supabase
VITE_SUPABASE_URL=https://vqzquozjtftgcufnrsin.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
JWT_SECRET=novel-writing-jwt-secret-key-2024-change-in-production
JWT_EXPIRES_IN=7d
NODE_ENV=production
PORT=3002
```

---

## 常用命令

### 开发
```bash
# 启动开发服务器（前端 + 后端）
npm run dev

# 仅启动前端
npm run client:dev

# 仅启动后端
npm run server:dev

# 代码检查
npm run check
npm run lint
```

### 构建
```bash
# 构建生产版本
npm run build:prod

# 本地运行生产版本
npm run prod
```

### 部署
```bash
# 部署到 Vercel（预览）
npm run deploy

# 部署到 Vercel（生产）
npm run deploy:prod

# 使用部署脚本
scripts/deploy.bat    # Windows
scripts/deploy.sh     # Linux/Mac
```

---

## 数据库架构

### 主要表结构

#### users (用户表)
| 列 | 类型 | 说明 |
|----|------|------|
| id | TEXT | 主键 |
| email | TEXT | 邮箱（唯一） |
| password_hash | TEXT | 密码哈希 |
| name | TEXT | 名称 |
| plan | TEXT | free/premium |
| created_at | TIMESTAMPTZ | 创建时间 |

#### novels (小说表)
| 列 | 类型 | 说明 |
|----|------|------|
| id | TEXT | 主键 |
| user_id | TEXT | 用户 ID（外键） |
| title | TEXT | 标题 |
| description | TEXT | 简介 |
| genre | TEXT | 类型 |
| style | TEXT | 风格 |
| outline_text | TEXT | 大纲文本 |
| outline_structure | TEXT | 大纲结构（JSON） |
| rhythm_curve | TEXT | 节奏曲线（JSON） |
| created_at | TIMESTAMPTZ | 创建时间 |
| updated_at | TIMESTAMPTZ | 更新时间 |

#### chapters (章节表)
| 列 | 类型 | 说明 |
|----|------|------|
| id | TEXT | 主键 |
| novel_id | TEXT | 小说 ID（外键） |
| title | TEXT | 标题 |
| content | TEXT | 内容 |
| chapter_number | INTEGER | 章节号 |
| status | TEXT | draft/published/archived |
| character_notes | TEXT | 角色备注（JSON） |
| created_at | TIMESTAMPTZ | 创建时间 |
| updated_at | TIMESTAMPTZ | 更新时间 |

#### characters (角色表)
| 列 | 类型 | 说明 |
|----|------|------|
| id | TEXT | 主键 |
| novel_id | TEXT | 小说 ID（外键） |
| name | TEXT | 名称 |
| age | INTEGER | 年龄 |
| gender | TEXT | 性别 |
| personality | TEXT | 性格 |
| background | TEXT | 背景 |
| appearance | TEXT | 外貌 |
| relationships | TEXT | 关系（JSON） |
| created_at | TIMESTAMPTZ | 创建时间 |
| updated_at | TIMESTAMPTZ | 更新时间 |

#### character_relationships (角色关系表)
| 列 | 类型 | 说明 |
|----|------|------|
| id | TEXT | 主键 |
| novel_id | TEXT | 小说 ID（外键） |
| character_id | TEXT | 角色 ID（外键） |
| related_character_id | TEXT | 关联角色 ID（外键） |
| relationship_type | TEXT | 关系类型 |
| relationship_description | TEXT | 关系描述 |
| intensity | INTEGER | 强度 (1-10) |
| status | TEXT | active/estranged/deceased/complicated |
| created_at | TIMESTAMPTZ | 创建时间 |
| updated_at | TIMESTAMPTZ | 更新时间 |

#### character_states (角色状态表)
| 列 | 类型 | 说明 |
|----|------|------|
| id | TEXT | 主键 |
| novel_id | TEXT | 小说 ID（外键） |
| character_id | TEXT | 角色 ID（外键） |
| chapter_id | TEXT | 章节 ID（外键，可空） |
| state_type | TEXT | emotion/motivation/condition/goal |
| state_name | TEXT | 状态名称 |
| state_value | TEXT | 状态值 |
| importance | INTEGER | 重要性 (1-10) |
| created_at | TIMESTAMPTZ | 创建时间 |

#### worldview_categories (世界观分类表)
| 列 | 类型 | 说明 |
|----|------|------|
| id | TEXT | 主键 |
| novel_id | TEXT | 小说 ID（外键） |
| name | TEXT | 名称 |
| description | TEXT | 描述 |
| icon | TEXT | 图标 |
| color | TEXT | 颜色 |
| display_order | INTEGER | 显示顺序 |
| created_at | TIMESTAMPTZ | 创建时间 |
| updated_at | TIMESTAMPTZ | 更新时间 |

#### worldview_entries (世界观条目表)
| 列 | 类型 | 说明 |
|----|------|------|
| id | TEXT | 主键 |
| novel_id | TEXT | 小说 ID（外键） |
| parent_id | TEXT | 父条目 ID（外键，可空） |
| title | TEXT | 标题 |
| content | TEXT | 内容 |
| entry_type | TEXT | 条目类型 |
| tags | TEXT | 标签（JSON） |
| related_entries | TEXT | 关联条目（JSON） |
| related_characters | TEXT | 关联角色（JSON） |
| metadata | TEXT | 元数据（JSON） |
| is_locked | BOOLEAN | 是否锁定 |
| source_type | TEXT | manual/ai_analyzed/ai_generated |
| confidence | REAL | 置信度 |
| created_at | TIMESTAMPTZ | 创建时间 |
| updated_at | TIMESTAMPTZ | 更新时间 |

#### inspiration_materials (灵感素材表)
| 列 | 类型 | 说明 |
|----|------|------|
| id | TEXT | 主键 |
| novel_id | TEXT | 小说 ID（外键） |
| content | TEXT | 内容 |
| category | TEXT | 类别 |
| tags | TEXT | 标签（JSON） |
| is_used | BOOLEAN | 是否已使用 |
| used_chapters | TEXT | 使用的章节（JSON） |
| color | TEXT | 颜色 |
| created_at | TIMESTAMPTZ | 创建时间 |
| updated_at | TIMESTAMPTZ | 更新时间 |

---

## API 端点

### 认证相关
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `GET /api/auth/me` - 获取当前用户
- `POST /api/auth/logout` - 退出登录
- `PUT /api/auth/profile` - 更新用户资料

### 小说管理
- `GET /api/novels` - 获取小说列表
- `GET /api/novels/:id` - 获取单个小说
- `POST /api/novels` - 创建小说
- `PUT /api/novels/:id` - 更新小说
- `DELETE /api/novels/:id` - 删除小说

### 章节管理
- `GET /api/chapters?novelId=:id` - 获取章节列表
- `GET /api/chapters/:id` - 获取单个章节
- `POST /api/chapters` - 创建章节
- `PUT /api/chapters/:id` - 更新章节
- `DELETE /api/chapters/:id` - 删除章节

### 角色管理
- `GET /api/characters?novelId=:id` - 获取角色列表
- `GET /api/characters/:id` - 获取单个角色
- `POST /api/characters` - 创建角色
- `PUT /api/characters/:id` - 更新角色
- `DELETE /api/characters/:id` - 删除角色

### AI 生成
- `POST /api/ai/generate-chapter` - 生成章节内容
- `POST /api/ai/generate-outline` - 生成大纲
- `POST /api/ai/rewrite` - 重写内容

---

## 费用说明

使用免费服务部署，总成本 **$0/月**：

| 服务 | 免费额度 | 月费用 |
|------|----------|--------|
| Vercel | 100GB 带宽 | $0 |
| Railway | $5 额度 | $0 |
| Supabase | 500MB 数据库 | $0 |

---

## 问题排查

### 本地开发
**问题：API 请求失败**
- 检查后端是否运行在 3002 端口
- 检查 `.env` 文件配置

**问题：数据库错误**
- 检查 `data/novels.db` 文件是否存在
- 尝试删除 `data` 目录后重启

### 云端部署
**问题：Vercel 部署失败**
- 检查 `.vercelignore` 文件
- 查看构建日志

**问题：Railway 健康检查失败**
- 检查环境变量配置
- 确保设置了 `DB_TYPE=supabase`

**问题：认证失败**
- 检查 Railway 中是否设置了 `JWT_SECRET`
- 检查 Supabase 中是否添加了 `password_hash` 列

---

## 下一步计划

### 短期（1-2周）
- [ ] 完成待配置项（Supabase password_hash 列、Railway 环境变量）
- [ ] 添加章节版本历史功能
- [ ] 实现导出 PDF 功能
- [ ] 优化 AI 生成质量

### 中期（1-2月）
- [ ] 多用户协作功能
- [ ] 评论和反馈系统
- [ ] 数据备份和恢复
- [ ] 性能优化

### 长期（3-6月）
- [ ] 移动端适配
- [ ] 多语言支持
- [ ] 高级 AI 功能（角色扮演、情节推演）
- [ ] 付费计划

---

## 贡献指南

### 开发规范
- 使用 TypeScript 进行类型检查
- 遵循 ESLint 规则
- 组件使用函数式组件 + Hooks
- API 调用统一使用 `src/lib/api.ts`

### Git 工作流
```bash
# 创建功能分支
git checkout -b feature/your-feature-name

# 提交更改
git add .
git commit -m "feat: add your feature"

# 推送分支
git push origin feature/your-feature-name

# 创建 Pull Request
```

### Commit 消息规范
- `feat:` 新功能
- `fix:` 修复 bug
- `docs:` 文档更新
- `style:` 代码格式调整
- `refactor:` 代码重构
- `test:` 测试相关
- `chore:` 构建/工具相关

---

## 联系方式

- GitHub: https://github.com/silent-raincat/auto-write-book
- 部署地址: https://autowritebook.vercel.app

---

## 许可证

MIT License
