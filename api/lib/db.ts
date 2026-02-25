import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

// 数据库类型：'supabase' | 'sqlite'
const DB_TYPE = process.env.DB_TYPE || 'sqlite'

// Supabase 配置
const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// SQLite 导入（仅在本地模式使用）
let Database: any = null
let sqliteDb: any = null

// 初始化 SQLite（延迟加载）
function initSQLite() {
  if (sqliteDb) return sqliteDb

  try {
    const DatabaseModule = require('better-sqlite3')
    const path = require('path')
    const fs = require('fs')

    const dbPath = path.join(process.cwd(), 'data', 'novels.db')

    // 确保数据目录存在
    const dataDir = path.dirname(dbPath)
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true })
    }

    const db = new DatabaseModule(dbPath)
    db.pragma('foreign_keys = ON')
    sqliteDb = db
    return db
  } catch (error) {
    console.error('Failed to load better-sqlite3. Make sure it is installed for local development.')
    throw error
  }
}

if (DB_TYPE === 'sqlite') {
  initSQLite()
}

// Supabase 客户端（仅在 Supabase 模式使用）
let supabase: any = null

if (DB_TYPE === 'supabase') {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Missing Supabase URL or Service Role Key')
  }
  supabase = createClient(supabaseUrl, supabaseServiceRoleKey)
}

// 生成 UUID
export function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

// ==================== 通用数据库接口 ====================

export interface Novel {
  id: string
  user_id: string
  title: string
  description?: string
  genre?: string
  style?: string
  outline_text?: string
  outline_structure?: string
  rhythm_curve?: string
  created_at: string
  updated_at: string
}

export interface Chapter {
  id: string
  novel_id: string
  title: string
  content?: string
  chapter_number: number
  status: 'draft' | 'published' | 'archived'
  character_notes?: string
  created_at: string
  updated_at: string
}

export interface Character {
  id: string
  novel_id: string
  name: string
  age?: number
  gender?: string
  personality?: string
  background?: string
  appearance?: string
  relationships?: string
  created_at: string
  updated_at: string
}

// ==================== Novels ====================

export async function getNovels(userId: string): Promise<Novel[]> {
  if (DB_TYPE === 'supabase') {
    const { data, error } = await supabase
      .from('novels')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
  } else {
    return sqliteDb.prepare('SELECT * FROM novels WHERE user_id = ? ORDER BY created_at DESC').all(userId)
  }
}

export async function getNovelById(id: string): Promise<Novel | null> {
  if (DB_TYPE === 'supabase') {
    const { data, error } = await supabase.from('novels').select('*').eq('id', id).single()
    if (error) throw error
    return data
  } else {
    return sqliteDb.prepare('SELECT * FROM novels WHERE id = ?').get(id) || null
  }
}

export async function createNovel(novel: Omit<Novel, 'id' | 'created_at' | 'updated_at'>): Promise<Novel> {
  const id = generateId()
  const now = new Date().toISOString()
  const newNovel = { ...novel, id, created_at: now, updated_at: now }

  if (DB_TYPE === 'supabase') {
    const { data, error } = await supabase.from('novels').insert(newNovel).select().single()
    if (error) throw error
    return data
  } else {
    sqliteDb.prepare(`
      INSERT INTO novels (id, user_id, title, description, genre, style, outline_text, outline_structure, rhythm_curve, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, newNovel.user_id, newNovel.title, newNovel.description, newNovel.genre, newNovel.style,
      newNovel.outline_text, newNovel.outline_structure, newNovel.rhythm_curve, now, now)
    return sqliteDb.prepare('SELECT * FROM novels WHERE id = ?').get(id)
  }
}

export async function updateNovel(id: string, updates: Partial<Novel>): Promise<Novel | null> {
  const updateData = { ...updates, updated_at: new Date().toISOString() }

  if (DB_TYPE === 'supabase') {
    const { data, error } = await supabase.from('novels').update(updateData).eq('id', id).select().single()
    if (error) throw error
    return data
  } else {
    const allowedFields = ['title', 'description', 'genre', 'style', 'outline_text', 'outline_structure', 'rhythm_curve']
    const updateFields: string[] = []
    const values: any[] = []

    for (const field of allowedFields) {
      if (field in updates) {
        updateFields.push(`${field} = ?`)
        values.push(updates[field])
      }
    }

    if (updateFields.length === 0) return null

    updateFields.push('updated_at = ?')
    values.push(new Date().toISOString())
    values.push(id)

    sqliteDb.prepare(`UPDATE novels SET ${updateFields.join(', ')} WHERE id = ?`).run(...values)
    return sqliteDb.prepare('SELECT * FROM novels WHERE id = ?').get(id) || null
  }
}

export async function deleteNovel(id: string): Promise<boolean> {
  if (DB_TYPE === 'supabase') {
    const { error } = await supabase.from('novels').delete().eq('id', id)
    return !error
  } else {
    const result = sqliteDb.prepare('DELETE FROM novels WHERE id = ?').run(id)
    return result.changes > 0
  }
}

// ==================== Chapters ====================

export async function getChapters(novelId: string): Promise<Chapter[]> {
  if (DB_TYPE === 'supabase') {
    const { data, error } = await supabase
      .from('chapters')
      .select('*')
      .eq('novel_id', novelId)
      .order('chapter_number', { ascending: true })
    if (error) throw error
    return data
  } else {
    return sqliteDb.prepare('SELECT * FROM chapters WHERE novel_id = ? ORDER BY chapter_number ASC').all(novelId)
  }
}

export async function getChapterById(id: string): Promise<Chapter | null> {
  if (DB_TYPE === 'supabase') {
    const { data, error } = await supabase.from('chapters').select('*').eq('id', id).single()
    if (error) throw error
    return data
  } else {
    return sqliteDb.prepare('SELECT * FROM chapters WHERE id = ?').get(id) || null
  }
}

export async function createChapter(chapter: Omit<Chapter, 'id' | 'created_at' | 'updated_at'>): Promise<Chapter> {
  const id = generateId()
  const now = new Date().toISOString()

  if (DB_TYPE === 'supabase') {
    const { data, error } = await supabase
      .from('chapters')
      .insert({ ...chapter, id, created_at: now, updated_at: now })
      .select()
      .single()
    if (error) throw error
    return data
  } else {
    sqliteDb.prepare(`
      INSERT INTO chapters (id, novel_id, title, content, chapter_number, status, character_notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, chapter.novel_id, chapter.title, chapter.content, chapter.chapter_number, chapter.status,
      chapter.character_notes, now, now)
    return sqliteDb.prepare('SELECT * FROM chapters WHERE id = ?').get(id)
  }
}

export async function updateChapter(id: string, updates: Partial<Chapter>): Promise<Chapter | null> {
  const updateData = { ...updates, updated_at: new Date().toISOString() }

  if (DB_TYPE === 'supabase') {
    const { data, error } = await supabase.from('chapters').update(updateData).eq('id', id).select().single()
    if (error) throw error
    return data
  } else {
    const allowedFields = ['title', 'content', 'status', 'character_notes']
    const updateFields: string[] = []
    const values: any[] = []

    for (const field of allowedFields) {
      if (field in updates) {
        updateFields.push(`${field} = ?`)
        values.push(updates[field])
      }
    }

    if (updateFields.length === 0) return null

    updateFields.push('updated_at = ?')
    values.push(new Date().toISOString())
    values.push(id)

    sqliteDb.prepare(`UPDATE chapters SET ${updateFields.join(', ')} WHERE id = ?`).run(...values)
    return sqliteDb.prepare('SELECT * FROM chapters WHERE id = ?').get(id) || null
  }
}

export async function deleteChapter(id: string): Promise<boolean> {
  if (DB_TYPE === 'supabase') {
    const { error } = await supabase.from('chapters').delete().eq('id', id)
    return !error
  } else {
    const result = sqliteDb.prepare('DELETE FROM chapters WHERE id = ?').run(id)
    return result.changes > 0
  }
}

// ==================== Characters ====================

export async function getCharacters(novelId: string): Promise<Character[]> {
  if (DB_TYPE === 'supabase') {
    const { data, error } = await supabase
      .from('characters')
      .select('*')
      .eq('novel_id', novelId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
  } else {
    return sqliteDb.prepare('SELECT * FROM characters WHERE novel_id = ?').all(novelId)
  }
}

export async function getCharacterById(id: string): Promise<Character | null> {
  if (DB_TYPE === 'supabase') {
    const { data, error } = await supabase.from('characters').select('*').eq('id', id).single()
    if (error) throw error
    return data
  } else {
    return sqliteDb.prepare('SELECT * FROM characters WHERE id = ?').get(id) || null
  }
}

export async function createCharacter(character: Omit<Character, 'id' | 'created_at' | 'updated_at'>): Promise<Character> {
  const id = generateId()
  const now = new Date().toISOString()

  if (DB_TYPE === 'supabase') {
    const { data, error } = await supabase
      .from('characters')
      .insert({ ...character, id, created_at: now, updated_at: now })
      .select()
      .single()
    if (error) throw error
    return data
  } else {
    sqliteDb.prepare(`
      INSERT INTO characters (id, novel_id, name, age, gender, personality, background, appearance, relationships, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, character.novel_id, character.name, character.age, character.gender,
      character.personality, character.background, character.appearance,
      character.relationships || '[]', now, now)
    return sqliteDb.prepare('SELECT * FROM characters WHERE id = ?').get(id)
  }
}

export async function updateCharacter(id: string, updates: Partial<Character>): Promise<Character | null> {
  const updateData = { ...updates, updated_at: new Date().toISOString() }

  if (DB_TYPE === 'supabase') {
    const { data, error } = await supabase.from('characters').update(updateData).eq('id', id).select().single()
    if (error) throw error
    return data
  } else {
    const allowedFields = ['name', 'age', 'gender', 'personality', 'background', 'appearance', 'relationships']
    const updateFields: string[] = []
    const values: any[] = []

    for (const field of allowedFields) {
      if (field in updates) {
        updateFields.push(`${field} = ?`)
        values.push(updates[field])
      }
    }

    if (updateFields.length === 0) return null

    updateFields.push('updated_at = ?')
    values.push(new Date().toISOString())
    values.push(id)

    sqliteDb.prepare(`UPDATE characters SET ${updateFields.join(', ')} WHERE id = ?`).run(...values)
    return sqliteDb.prepare('SELECT * FROM characters WHERE id = ?').get(id) || null
  }
}

export async function deleteCharacter(id: string): Promise<boolean> {
  if (DB_TYPE === 'supabase') {
    const { error } = await supabase.from('characters').delete().eq('id', id)
    return !error
  } else {
    const result = sqliteDb.prepare('DELETE FROM characters WHERE id = ?').run(id)
    return result.changes > 0
  }
}

// ==================== Character Relationships ====================

export interface CharacterRelationship {
  id: string
  novel_id: string
  character_id: string
  related_character_id: string
  relationship_type: string
  relationship_description?: string
  intensity: number
  status: 'active' | 'estranged' | 'deceased' | 'complicated'
  created_at: string
  updated_at: string
}

export async function getCharacterRelationships(novelId: string): Promise<CharacterRelationship[]> {
  if (DB_TYPE === 'supabase') {
    const { data, error } = await supabase
      .from('character_relationships')
      .select('*')
      .eq('novel_id', novelId)
    if (error) throw error
    return data
  } else {
    return sqliteDb.prepare('SELECT * FROM character_relationships WHERE novel_id = ?').all(novelId)
  }
}

export async function getRelationshipsByCharacter(characterId: string): Promise<CharacterRelationship[]> {
  if (DB_TYPE === 'supabase') {
    const { data, error } = await supabase
      .from('character_relationships')
      .select('*')
      .or(`character_id.eq.${characterId},related_character_id.eq.${characterId}`)
    if (error) throw error
    return data
  } else {
    return sqliteDb.prepare(`
      SELECT * FROM character_relationships
      WHERE character_id = ? OR related_character_id = ?
    `).all(characterId, characterId)
  }
}

export async function createCharacterRelationship(relationship: Omit<CharacterRelationship, 'id' | 'created_at' | 'updated_at'>): Promise<CharacterRelationship> {
  const id = generateId()
  const now = new Date().toISOString()

  if (DB_TYPE === 'supabase') {
    const { data, error } = await supabase
      .from('character_relationships')
      .insert({ ...relationship, id, created_at: now, updated_at: now })
      .select()
      .single()
    if (error) throw error
    return data
  } else {
    sqliteDb.prepare(`
      INSERT INTO character_relationships (id, novel_id, character_id, related_character_id, relationship_type, relationship_description, intensity, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, relationship.novel_id, relationship.character_id, relationship.related_character_id,
      relationship.relationship_type, relationship.relationship_description, relationship.intensity,
      relationship.status, now, now)
    return sqliteDb.prepare('SELECT * FROM character_relationships WHERE id = ?').get(id)
  }
}

export async function updateCharacterRelationship(id: string, updates: Partial<CharacterRelationship>): Promise<CharacterRelationship | null> {
  const updateData = { ...updates, updated_at: new Date().toISOString() }

  if (DB_TYPE === 'supabase') {
    const { data, error } = await supabase.from('character_relationships').update(updateData).eq('id', id).select().single()
    if (error) throw error
    return data
  } else {
    const allowedFields = ['relationship_type', 'relationship_description', 'intensity', 'status']
    const updateFields: string[] = []
    const values: any[] = []

    for (const field of allowedFields) {
      if (field in updates) {
        updateFields.push(`${field} = ?`)
        values.push(updates[field])
      }
    }

    if (updateFields.length === 0) return null

    updateFields.push('updated_at = ?')
    values.push(new Date().toISOString())
    values.push(id)

    sqliteDb.prepare(`UPDATE character_relationships SET ${updateFields.join(', ')} WHERE id = ?`).run(...values)
    return sqliteDb.prepare('SELECT * FROM character_relationships WHERE id = ?').get(id) || null
  }
}

export async function deleteCharacterRelationship(id: string): Promise<boolean> {
  if (DB_TYPE === 'supabase') {
    const { error } = await supabase.from('character_relationships').delete().eq('id', id)
    return !error
  } else {
    const result = sqliteDb.prepare('DELETE FROM character_relationships WHERE id = ?').run(id)
    return result.changes > 0
  }
}

// ==================== Character States ====================

export interface CharacterState {
  id: string
  novel_id: string
  character_id: string
  chapter_id?: string
  state_type: 'emotion' | 'motivation' | 'condition' | 'goal'
  state_name: string
  state_value?: string
  importance: number
  created_at: string
}

export async function getCharacterStates(novelId: string, characterId?: string): Promise<CharacterState[]> {
  if (DB_TYPE === 'supabase') {
    let query = supabase.from('character_states').select('*').eq('novel_id', novelId)
    if (characterId) query = query.eq('character_id', characterId)
    const { data, error } = await query.order('created_at', { ascending: true })
    if (error) throw error
    return data
  } else {
    if (characterId) {
      return sqliteDb.prepare('SELECT * FROM character_states WHERE novel_id = ? AND character_id = ?').all(novelId, characterId)
    }
    return sqliteDb.prepare('SELECT * FROM character_states WHERE novel_id = ?').all(novelId)
  }
}

export async function createCharacterState(state: Omit<CharacterState, 'id' | 'created_at'>): Promise<CharacterState> {
  const id = generateId()
  const now = new Date().toISOString()

  if (DB_TYPE === 'supabase') {
    const { data, error } = await supabase
      .from('character_states')
      .insert({ ...state, id, created_at: now })
      .select()
      .single()
    if (error) throw error
    return data
  } else {
    sqliteDb.prepare(`
      INSERT INTO character_states (id, novel_id, character_id, chapter_id, state_type, state_name, state_value, importance, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, state.novel_id, state.character_id, state.chapter_id, state.state_type,
      state.state_name, state.state_value, state.importance, now)
    return sqliteDb.prepare('SELECT * FROM character_states WHERE id = ?').get(id)
  }
}

export async function deleteCharacterState(id: string): Promise<boolean> {
  if (DB_TYPE === 'supabase') {
    const { error } = await supabase.from('character_states').delete().eq('id', id)
    return !error
  } else {
    const result = sqliteDb.prepare('DELETE FROM character_states WHERE id = ?').run(id)
    return result.changes > 0
  }
}

// ==================== World View ====================

export interface WorldViewCategory {
  id: string
  novel_id: string
  name: string
  description?: string
  icon?: string
  color?: string
  display_order: number
  created_at: string
  updated_at: string
}

export interface WorldViewEntry {
  id: string
  novel_id: string
  parent_id?: string
  title: string
  content?: string
  entry_type: 'civilization' | 'faction' | 'item' | 'skill' | 'concept' | 'character' | 'location' | 'event' | 'rule'
  tags: string
  related_entries: string
  related_characters: string
  metadata: string
  is_locked: boolean
  source_type: 'manual' | 'ai_analyzed' | 'ai_generated'
  confidence: number
  created_at: string
  updated_at: string
}

export async function getWorldViewCategories(novelId: string): Promise<WorldViewCategory[]> {
  if (DB_TYPE === 'supabase') {
    const { data, error } = await supabase
      .from('worldview_categories')
      .select('*')
      .eq('novel_id', novelId)
      .order('display_order', { ascending: true })
    if (error) throw error
    return data
  } else {
    return sqliteDb.prepare('SELECT * FROM worldview_categories WHERE novel_id = ? ORDER BY display_order ASC').all(novelId)
  }
}

export async function createWorldViewCategory(category: Omit<WorldViewCategory, 'id' | 'created_at' | 'updated_at'>): Promise<WorldViewCategory> {
  const id = generateId()
  const now = new Date().toISOString()

  if (DB_TYPE === 'supabase') {
    const { data, error } = await supabase
      .from('worldview_categories')
      .insert({ ...category, id, created_at: now, updated_at: now })
      .select()
      .single()
    if (error) throw error
    return data
  } else {
    sqliteDb.prepare(`
      INSERT INTO worldview_categories (id, novel_id, name, description, icon, color, display_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, category.novel_id, category.name, category.description, category.icon,
      category.color, category.display_order, now, now)
    return sqliteDb.prepare('SELECT * FROM worldview_categories WHERE id = ?').get(id)
  }
}

export async function updateWorldViewCategory(id: string, updates: Partial<WorldViewCategory>): Promise<WorldViewCategory | null> {
  const updateData = { ...updates, updated_at: new Date().toISOString() }

  if (DB_TYPE === 'supabase') {
    const { data, error } = await supabase.from('worldview_categories').update(updateData).eq('id', id).select().single()
    if (error) throw error
    return data
  } else {
    const allowedFields = ['name', 'description', 'icon', 'color', 'display_order']
    const updateFields: string[] = []
    const values: any[] = []

    for (const field of allowedFields) {
      if (field in updates) {
        updateFields.push(`${field} = ?`)
        values.push(updates[field])
      }
    }

    if (updateFields.length === 0) return null

    updateFields.push('updated_at = ?')
    values.push(new Date().toISOString())
    values.push(id)

    sqliteDb.prepare(`UPDATE worldview_categories SET ${updateFields.join(', ')} WHERE id = ?`).run(...values)
    return sqliteDb.prepare('SELECT * FROM worldview_categories WHERE id = ?').get(id) || null
  }
}

export async function deleteWorldViewCategory(id: string): Promise<boolean> {
  if (DB_TYPE === 'supabase') {
    const { error } = await supabase.from('worldview_categories').delete().eq('id', id)
    return !error
  } else {
    const result = sqliteDb.prepare('DELETE FROM worldview_categories WHERE id = ?').run(id)
    return result.changes > 0
  }
}

export async function getWorldViewEntries(novelId: string, categoryId?: string): Promise<WorldViewEntry[]> {
  if (DB_TYPE === 'supabase') {
    let query = supabase.from('worldview_entries').select('*').eq('novel_id', novelId)
    const { data, error } = await query.order('created_at', { ascending: false })
    if (error) throw error
    return data
  } else {
    return sqliteDb.prepare('SELECT * FROM worldview_entries WHERE novel_id = ? ORDER BY created_at DESC').all(novelId)
  }
}

export async function createWorldViewEntry(entry: Omit<WorldViewEntry, 'id' | 'created_at' | 'updated_at'>): Promise<WorldViewEntry> {
  const id = generateId()
  const now = new Date().toISOString()

  if (DB_TYPE === 'supabase') {
    const { data, error } = await supabase
      .from('worldview_entries')
      .insert({ ...entry, id, created_at: now, updated_at: now })
      .select()
      .single()
    if (error) throw error
    return data
  } else {
    sqliteDb.prepare(`
      INSERT INTO worldview_entries (id, novel_id, parent_id, title, content, entry_type, tags, related_entries, related_characters, metadata, is_locked, source_type, confidence, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, entry.novel_id, entry.parent_id, entry.title, entry.content, entry.entry_type,
      entry.tags, entry.related_entries, entry.related_characters, entry.metadata,
      entry.is_locked ? 1 : 0, entry.source_type, entry.confidence, now, now)
    return sqliteDb.prepare('SELECT * FROM worldview_entries WHERE id = ?').get(id)
  }
}

export async function updateWorldViewEntry(id: string, updates: Partial<WorldViewEntry>): Promise<WorldViewEntry | null> {
  const updateData = { ...updates, updated_at: new Date().toISOString() }

  if (DB_TYPE === 'supabase') {
    const { data, error } = await supabase.from('worldview_entries').update(updateData).eq('id', id).select().single()
    if (error) throw error
    return data
  } else {
    const allowedFields = ['parent_id', 'title', 'content', 'entry_type', 'tags', 'related_entries', 'related_characters', 'metadata', 'is_locked', 'source_type', 'confidence']
    const updateFields: string[] = []
    const values: any[] = []

    for (const field of allowedFields) {
      if (field in updates) {
        updateFields.push(`${field} = ?`)
        values.push(updates[field])
      }
    }

    if (updateFields.length === 0) return null

    updateFields.push('updated_at = ?')
    values.push(new Date().toISOString())
    values.push(id)

    sqliteDb.prepare(`UPDATE worldview_entries SET ${updateFields.join(', ')} WHERE id = ?`).run(...values)
    return sqliteDb.prepare('SELECT * FROM worldview_entries WHERE id = ?').get(id) || null
  }
}

export async function deleteWorldViewEntry(id: string): Promise<boolean> {
  if (DB_TYPE === 'supabase') {
    const { error } = await supabase.from('worldview_entries').delete().eq('id', id)
    return !error
  } else {
    const result = sqliteDb.prepare('DELETE FROM worldview_entries WHERE id = ?').run(id)
    return result.changes > 0
  }
}

// ==================== Inspiration Materials ====================

export interface InspirationMaterial {
  id: string
  novel_id: string
  content: string
  category: 'scene' | 'dialogue' | 'plot' | 'atmosphere' | 'action' | 'character' | 'general'
  tags: string
  is_used: boolean
  used_chapters: string
  color: string
  created_at: string
  updated_at: string
}

export async function getInspirationMaterials(novelId: string): Promise<InspirationMaterial[]> {
  if (DB_TYPE === 'supabase') {
    const { data, error } = await supabase
      .from('inspiration_materials')
      .select('*')
      .eq('novel_id', novelId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
  } else {
    return sqliteDb.prepare('SELECT * FROM inspiration_materials WHERE novel_id = ? ORDER BY created_at DESC').all(novelId)
  }
}

export async function createInspirationMaterial(material: Omit<InspirationMaterial, 'id' | 'created_at' | 'updated_at'>): Promise<InspirationMaterial> {
  const id = generateId()
  const now = new Date().toISOString()

  if (DB_TYPE === 'supabase') {
    const { data, error } = await supabase
      .from('inspiration_materials')
      .insert({ ...material, id, created_at: now, updated_at: now })
      .select()
      .single()
    if (error) throw error
    return data
  } else {
    sqliteDb.prepare(`
      INSERT INTO inspiration_materials (id, novel_id, content, category, tags, is_used, used_chapters, color, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, material.novel_id, material.content, material.category, material.tags,
      material.is_used ? 1 : 0, material.used_chapters, material.color, now, now)
    return sqliteDb.prepare('SELECT * FROM inspiration_materials WHERE id = ?').get(id)
  }
}

export async function updateInspirationMaterial(id: string, updates: Partial<InspirationMaterial>): Promise<InspirationMaterial | null> {
  const updateData = { ...updates, updated_at: new Date().toISOString() }

  if (DB_TYPE === 'supabase') {
    const { data, error } = await supabase.from('inspiration_materials').update(updateData).eq('id', id).select().single()
    if (error) throw error
    return data
  } else {
    const allowedFields = ['content', 'category', 'tags', 'is_used', 'used_chapters', 'color']
    const updateFields: string[] = []
    const values: any[] = []

    for (const field of allowedFields) {
      if (field in updates) {
        updateFields.push(`${field} = ?`)
        values.push(updates[field])
      }
    }

    if (updateFields.length === 0) return null

    updateFields.push('updated_at = ?')
    values.push(new Date().toISOString())
    values.push(id)

    sqliteDb.prepare(`UPDATE inspiration_materials SET ${updateFields.join(', ')} WHERE id = ?`).run(...values)
    return sqliteDb.prepare('SELECT * FROM inspiration_materials WHERE id = ?').get(id) || null
  }
}

export async function deleteInspirationMaterial(id: string): Promise<boolean> {
  if (DB_TYPE === 'supabase') {
    const { error } = await supabase.from('inspiration_materials').delete().eq('id', id)
    return !error
  } else {
    const result = sqliteDb.prepare('DELETE FROM inspiration_materials WHERE id = ?').run(id)
    return result.changes > 0
  }
}

// ==================== Users ====================

export interface User {
  id: string
  email: string
  name: string
  plan: 'free' | 'premium'
  created_at: string
}

export async function getUserById(userId: string): Promise<User | null> {
  if (DB_TYPE === 'supabase') {
    const { data, error } = await supabase.from('users').select('*').eq('id', userId).single()
    if (error) throw error
    return data
  } else {
    return sqliteDb.prepare('SELECT * FROM users WHERE id = ?').get(userId) || null
  }
}

export async function createUser(user: Omit<User, 'created_at'>): Promise<User> {
  const now = new Date().toISOString()

  if (DB_TYPE === 'supabase') {
    const { data, error } = await supabase
      .from('users')
      .insert({ ...user, created_at: now })
      .select()
      .single()
    if (error) throw error
    return data
  } else {
    sqliteDb.prepare(`
      INSERT INTO users (id, email, name, plan, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(user.id, user.email, user.name, user.plan, now)
    return sqliteDb.prepare('SELECT * FROM users WHERE id = ?').get(user.id)
  }
}

export async function updateUser(userId: string, updates: Partial<User>): Promise<User | null> {
  const updateData = { ...updates }

  if (DB_TYPE === 'supabase') {
    const { data, error } = await supabase.from('users').update(updateData).eq('id', userId).select().single()
    if (error) throw error
    return data
  } else {
    const allowedFields = ['email', 'name', 'plan']
    const updateFields: string[] = []
    const values: any[] = []

    for (const field of allowedFields) {
      if (field in updates) {
        updateFields.push(`${field} = ?`)
        values.push(updates[field])
      }
    }

    if (updateFields.length === 0) return null

    values.push(userId)

    sqliteDb.prepare(`UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`).run(...values)
    return sqliteDb.prepare('SELECT * FROM users WHERE id = ?').get(userId) || null
  }
}

// ==================== 初始化 ====================

export async function initializeDatabase() {
  if (DB_TYPE === 'sqlite') {
    // SQLite 初始化逻辑（保持原有的 database.ts 逻辑）
    const { initializeDatabase: initSqlite } = require('./database.js')
    initSqlite()
  }
  // Supabase 不需要初始化（已在控制台创建表）
}

// 导出当前数据库类型
export { DB_TYPE }
