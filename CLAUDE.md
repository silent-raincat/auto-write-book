# AI 小说创作系统 - 项目说明

## 项目概述

这是一个基于大语言模型的自动小说创作系统，采用全栈架构（React + Node.js + Express）。

**当前状态**: 正在从 Supabase 云数据库迁移到本地 SQLite 数据库。

## 技术栈

### 前端
- **框架**: React 18 + TypeScript
- **构建工具**: Vite
- **UI 组件**: Ant Design 5
- **状态管理**: Zustand
- **路由**: React Router DOM
- **图表**: ECharts (关系图谱)
- **样式**: Tailwind CSS

### 后端
- **运行时**: Node.js
- **框架**: Express
- **数据库**: SQLite (better-sqlite3)
- **AI 集成**: ModelScope API

## 本地化架构

### 数据库方案

使用 **SQLite** + **better-sqlite3** 实现本地数据库：
- 文件位置: `data/novels.db`
- 同步 API，高性能
- 无需额外数据库服务
- 数据完全本地存储

### 目录结构

```
auto_write_book/
├── api/                    # 后端 API
│   ├── lib/
│   │   ├── supabase.ts    # ~~已弃用~~
│   │   └── database.ts    # 本地数据库 (新增)
│   └── routes/            # API 路由
├── data/                  # 本地数据目录
│   └── novels.db          # SQLite 数据库文件
├── src/                   # 前端源码
├── supabase/             # ~~已弃用~~
└── CLAUDE.md             # 本文件
```

## 已实现功能

### 1. 角色系统增强
- ✅ 角色关系管理（表单编辑）
- ✅ 角色关系图谱（ECharts 可视化）
- ✅ 角色弧光（章节关联式状态记录）

### 2. 世界观设定管理
- ✅ 自定义分类系统
- ✅ 设定条目管理
- ✅ 关联角色和条目
- ✅ 搜索功能

### 3. 个人中心
- ✅ 用户信息管理
- ✅ 数据统计展示
- ✅ ModelScope API Key 管理（已预设默认值）

### 4. 基础功能
- ✅ 小说项目管理
- ✅ 章节编辑
- ✅ AI 内容生成
- ✅ 大纲生成

## 待实现（本地化迁移）

### Phase 1: 数据库层
- [ ] 创建 SQLite 数据库初始化脚本
- [ ] 定义所有表结构
- [ ] 实现数据库迁移系统

### Phase 2: 后端 API
- [ ] 替换 Supabase 客户端为本地数据库
- [ ] 更新所有 API 路由使用本地数据库
- [ ] 添加数据备份/恢复功能

### Phase 3: 测试验证
- [ ] 测试所有 CRUD 操作
- [ ] 验证新功能正常工作
- [ ] 性能优化

## 环境配置

### 环境变量 (.env)

```env
# 本地模式
LOCAL_MODE=true

# 后端端口
PORT=3002

# ModelScope API Key (已预设)
MODELSCOPE_API_KEY=ms-54964895-9e08-409e-80ab-fe3709c1b1e0
```

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 访问应用
# 前端: http://localhost:5173
# 后端: http://localhost:3002
```

## 注意事项

1. **数据存储**: 所有数据存储在本地 `data/novels.db` 文件中
2. **数据备份**: 建议定期备份 `data` 目录
3. **AI 功能**: 使用预设的 ModelScope API Key，无需额外配置

## 更新日志

### 2026-01-18
- 决定从 Supabase 迁移到本地 SQLite 数据库
- 开始本地化实现
