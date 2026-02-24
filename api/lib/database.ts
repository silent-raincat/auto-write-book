import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = path.join(process.cwd(), 'data', 'novels.db');

// 确保数据目录存在
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// 创建数据库连接
export const db = new Database(dbPath);

// 启用外键约束
db.pragma('foreign_keys = ON');

// 初始化数据库表
export function initializeDatabase() {
  // 检查 worldview_entries 表是否存在
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='worldview_entries'").all() as Array<{ name: string }>;
  const tableExists = tables.length > 0;

  let needsMigration = false;
  if (tableExists) {
    // 检查表结构是否需要升级
    const tableInfo = db.prepare("PRAGMA table_info(worldview_entries)").all() as Array<{ name: string }>;
    const hasParentId = tableInfo.some(col => col.name === 'parent_id');
    const hasEntryType = tableInfo.some(col => col.name === 'entry_type');

    // 如果表结构不完整，重建表
    if (!hasParentId || !hasEntryType) {
      needsMigration = true;
    }
  }

  if (needsMigration) {
    console.log('检测到旧的 worldview_entries 表结构，正在升级...');

    // 备份现有数据
    const existingData = db.prepare('SELECT * FROM worldview_entries').all() as Array<any>;

    // 删除旧表
    db.exec('DROP TABLE IF EXISTS worldview_entries');

    // 创建新表
    db.exec(`
      CREATE TABLE worldview_entries (
        id TEXT PRIMARY KEY,
        novel_id TEXT NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
        parent_id TEXT REFERENCES worldview_entries(id) ON DELETE SET NULL,
        title TEXT NOT NULL,
        content TEXT,
        entry_type TEXT DEFAULT 'concept' CHECK(entry_type IN ('civilization', 'faction', 'item', 'skill', 'concept', 'character', 'location', 'event', 'rule')),
        tags TEXT DEFAULT '[]',
        related_entries TEXT DEFAULT '[]',
        related_characters TEXT DEFAULT '[]',
        metadata TEXT DEFAULT '{}',
        is_locked INTEGER DEFAULT 0,
        source_type TEXT DEFAULT 'manual' CHECK(source_type IN ('manual', 'ai_analyzed', 'ai_generated')),
        confidence REAL DEFAULT 1.0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
    `);

    // 迁移现有数据（如果有的话）
    if (existingData.length > 0) {
      console.log(`迁移 ${existingData.length} 条现有数据...`);
      const migrateStmt = db.prepare(`
        INSERT INTO worldview_entries (id, novel_id, title, content, tags, related_entries, related_characters, metadata, is_locked, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const row of existingData) {
        try {
          migrateStmt.run(
            row.id,
            row.novel_id,
            row.title,
            row.content,
            row.tags || '[]',
            row.related_entries || '[]',
            row.related_characters || '[]',
            row.metadata || '{}',
            row.is_locked || 0,
            row.created_at,
            row.updated_at
          );
        } catch (error) {
          console.error('迁移数据失败:', row.id, error);
        }
      }
      console.log('数据迁移完成');
    }
  } else if (!tableExists) {
    // 如果表不存在，直接创建新表
    db.exec(`
      CREATE TABLE worldview_entries (
        id TEXT PRIMARY KEY,
        novel_id TEXT NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
        parent_id TEXT REFERENCES worldview_entries(id) ON DELETE SET NULL,
        title TEXT NOT NULL,
        content TEXT,
        entry_type TEXT DEFAULT 'concept' CHECK(entry_type IN ('civilization', 'faction', 'item', 'skill', 'concept', 'character', 'location', 'event', 'rule')),
        tags TEXT DEFAULT '[]',
        related_entries TEXT DEFAULT '[]',
        related_characters TEXT DEFAULT '[]',
        metadata TEXT DEFAULT '{}',
        is_locked INTEGER DEFAULT 0,
        source_type TEXT DEFAULT 'manual' CHECK(source_type IN ('manual', 'ai_analyzed', 'ai_generated')),
        confidence REAL DEFAULT 1.0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
    `);
  }

  // 用户表
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      name TEXT NOT NULL,
      plan TEXT DEFAULT 'free' CHECK(plan IN ('free', 'premium')),
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // 小说表
  db.exec(`
    CREATE TABLE IF NOT EXISTS novels (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      genre TEXT,
      style TEXT,
      outline_text TEXT,
      outline_structure TEXT,
      rhythm_curve TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // 章节表
  db.exec(`
    CREATE TABLE IF NOT EXISTS chapters (
      id TEXT PRIMARY KEY,
      novel_id TEXT NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      content TEXT,
      chapter_number INTEGER NOT NULL,
      status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'published', 'archived')),
      character_notes TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // 章节版本表
  db.exec(`
    CREATE TABLE IF NOT EXISTS chapter_versions (
      id TEXT PRIMARY KEY,
      chapter_id TEXT NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      version_number INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // 角色表
  db.exec(`
    CREATE TABLE IF NOT EXISTS characters (
      id TEXT PRIMARY KEY,
      novel_id TEXT NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      age INTEGER,
      gender TEXT,
      personality TEXT,
      background TEXT,
      appearance TEXT,
      relationships TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // 角色关系表
  db.exec(`
    CREATE TABLE IF NOT EXISTS character_relationships (
      id TEXT PRIMARY KEY,
      novel_id TEXT NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
      character_id TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
      related_character_id TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
      relationship_type TEXT NOT NULL,
      relationship_description TEXT,
      intensity INTEGER DEFAULT 5 CHECK(intensity >= 1 AND intensity <= 10),
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'estranged', 'deceased', 'complicated')),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(character_id, related_character_id)
    );
  `);

  // 角色状态表（角色弧光）
  db.exec(`
    CREATE TABLE IF NOT EXISTS character_states (
      id TEXT PRIMARY KEY,
      novel_id TEXT NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
      character_id TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
      chapter_id TEXT REFERENCES chapters(id) ON DELETE SET NULL,
      state_type TEXT NOT NULL CHECK(state_type IN ('emotion', 'motivation', 'condition', 'goal')),
      state_name TEXT NOT NULL,
      state_value TEXT,
      importance INTEGER DEFAULT 5 CHECK(importance >= 1 AND importance <= 10),
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // 世界观分类表
  db.exec(`
    CREATE TABLE IF NOT EXISTS worldview_categories (
      id TEXT PRIMARY KEY,
      novel_id TEXT NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      icon TEXT,
      color TEXT,
      display_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // 注意：worldview_entries 表已在迁移逻辑中创建，此处不再重复创建

  // 知识库文件表
  db.exec(`
    CREATE TABLE IF NOT EXISTS knowledge_files (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      filename TEXT NOT NULL,
      file_type TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      storage_path TEXT NOT NULL,
      content_summary TEXT,
      extracted_data TEXT,
      is_processed INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // 灵感素材表
  db.exec(`
    CREATE TABLE IF NOT EXISTS inspiration_materials (
      id TEXT PRIMARY KEY,
      novel_id TEXT NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      category TEXT DEFAULT 'general' CHECK(category IN ('scene', 'dialogue', 'plot', 'atmosphere', 'action', 'character', 'general')),
      tags TEXT DEFAULT '[]',
      is_used INTEGER DEFAULT 0,
      used_chapters TEXT DEFAULT '[]',
      color TEXT DEFAULT '#1890ff',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // 章节灵感关联表
  db.exec(`
    CREATE TABLE IF NOT EXISTS chapter_inspirations (
      id TEXT PRIMARY KEY,
      chapter_id TEXT NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
      inspiration_id TEXT NOT NULL REFERENCES inspiration_materials(id) ON DELETE CASCADE,
      used_portion TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // 创建索引
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_novels_user_id ON novels(user_id);
    CREATE INDEX IF NOT EXISTS idx_chapters_novel_id ON chapters(novel_id);
    CREATE INDEX IF NOT EXISTS idx_chapters_status ON chapters(status);
    CREATE INDEX IF NOT EXISTS idx_characters_novel_id ON characters(novel_id);
    CREATE INDEX IF NOT EXISTS idx_characters_name ON characters(name);
    CREATE INDEX IF NOT EXISTS idx_character_relationships_novel ON character_relationships(novel_id);
    CREATE INDEX IF NOT EXISTS idx_character_relationships_character ON character_relationships(character_id);
    CREATE INDEX IF NOT EXISTS idx_character_relationships_related ON character_relationships(related_character_id);
    CREATE INDEX IF NOT EXISTS idx_character_relationships_type ON character_relationships(relationship_type);
    CREATE INDEX IF NOT EXISTS idx_character_states_novel ON character_states(novel_id);
    CREATE INDEX IF NOT EXISTS idx_character_states_character ON character_states(character_id);
    CREATE INDEX IF NOT EXISTS idx_character_states_chapter ON character_states(chapter_id);
    CREATE INDEX IF NOT EXISTS idx_character_states_type ON character_states(state_type);
    CREATE INDEX IF NOT EXISTS idx_worldview_categories_novel ON worldview_categories(novel_id);
    CREATE INDEX IF NOT EXISTS idx_worldview_entries_novel ON worldview_entries(novel_id);
    CREATE INDEX IF NOT EXISTS idx_worldview_entries_parent ON worldview_entries(parent_id);
    CREATE INDEX IF NOT EXISTS idx_knowledge_files_user_id ON knowledge_files(user_id);
    CREATE INDEX IF NOT EXISTS idx_knowledge_files_is_processed ON knowledge_files(is_processed);
    CREATE INDEX IF NOT EXISTS idx_inspiration_materials_novel_id ON inspiration_materials(novel_id);
    CREATE INDEX IF NOT EXISTS idx_inspiration_materials_category ON inspiration_materials(category);
    CREATE INDEX IF NOT EXISTS idx_inspiration_materials_is_used ON inspiration_materials(is_used);
    CREATE INDEX IF NOT EXISTS idx_chapter_inspirations_chapter_id ON chapter_inspirations(chapter_id);
    CREATE INDEX IF NOT EXISTS idx_chapter_inspirations_inspiration_id ON chapter_inspirations(inspiration_id);
  `);

  // 创建默认测试用户
  const defaultUserId = '00000000-0000-0000-0000-000000000000';
  const userExists = db.prepare('SELECT id FROM users WHERE id = ?').get(defaultUserId);

  if (!userExists) {
    db.prepare(`
      INSERT INTO users (id, email, name, plan)
      VALUES (?, ?, ?, ?)
    `).run(defaultUserId, 'test@local.dev', 'Test User', 'free');
    console.log('✅ 默认用户已创建');
  }

  console.log('✅ 数据库初始化完成');
}

// 生成 UUID 的辅助函数
export function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// 关闭数据库连接
export function closeDatabase() {
  db.close();
}

// 进程退出时关闭数据库
process.on('exit', closeDatabase);
