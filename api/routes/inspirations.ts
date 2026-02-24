import express from 'express';
import { db, generateId } from '../lib/database.js';

const router = express.Router();

// 默认测试用户ID
const TEST_USER_ID = '00000000-0000-0000-0000-000000000000';

// 获取某部小说的所有灵感素材
router.get('/', (req, res) => {
  try {
    const { novel_id } = req.query;

    if (!novel_id || typeof novel_id !== 'string') {
      return res.status(400).json({ error: 'novel_id 是必需的' });
    }

    const materials = db.prepare(`
      SELECT * FROM inspiration_materials
      WHERE novel_id = ?
      ORDER BY created_at DESC
    `).all(novel_id);

    // 解析 JSON 字段
    const processedMaterials = materials.map(m => ({
      ...m,
      tags: JSON.parse(m.tags),
      used_chapters: JSON.parse(m.used_chapters),
      is_used: Boolean(m.is_used)
    }));

    res.json({ materials: processedMaterials });
  } catch (error) {
    console.error('获取灵感素材失败:', error);
    res.status(500).json({ error: '获取灵感素材失败' });
  }
});

// 获取单个灵感素材
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;

    const material = db.prepare(`
      SELECT * FROM inspiration_materials
      WHERE id = ?
    `).get(id);

    if (!material) {
      return res.status(404).json({ error: '灵感素材不存在' });
    }

    res.json({
      ...material,
      tags: JSON.parse(material.tags),
      used_chapters: JSON.parse(material.used_chapters),
      is_used: Boolean(material.is_used)
    });
  } catch (error) {
    console.error('获取灵感素材失败:', error);
    res.status(500).json({ error: '获取灵感素材失败' });
  }
});

// 创建灵感素材
router.post('/', (req, res) => {
  try {
    const { novel_id, content, category, tags, color } = req.body;

    if (!novel_id || !content) {
      return res.status(400).json({ error: 'novel_id 和 content 是必需的' });
    }

    // 验证小说是否存在
    const novel = db.prepare('SELECT id FROM novels WHERE id = ?').get(novel_id);
    if (!novel) {
      return res.status(404).json({ error: '小说不存在' });
    }

    const id = generateId();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO inspiration_materials (id, novel_id, content, category, tags, color, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      novel_id,
      content,
      category || 'general',
      JSON.stringify(tags || []),
      color || '#1890ff',
      now,
      now
    );

    const material = db.prepare('SELECT * FROM inspiration_materials WHERE id = ?').get(id);

    res.status(201).json({
      ...material,
      tags: JSON.parse(material.tags),
      used_chapters: JSON.parse(material.used_chapters),
      is_used: Boolean(material.is_used)
    });
  } catch (error) {
    console.error('创建灵感素材失败:', error);
    res.status(500).json({ error: '创建灵感素材失败' });
  }
});

// 更新灵感素材
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { content, category, tags, color } = req.body;

    // 检查是否存在
    const existing = db.prepare('SELECT * FROM inspiration_materials WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: '灵感素材不存在' });
    }

    const now = new Date().toISOString();

    const stmt = db.prepare(`
      UPDATE inspiration_materials
      SET content = COALESCE(?, content),
          category = COALESCE(?, category),
          tags = COALESCE(?, tags),
          color = COALESCE(?, color),
          updated_at = ?
      WHERE id = ?
    `);

    stmt.run(
      content,
      category,
      tags ? JSON.stringify(tags) : null,
      color,
      now,
      id
    );

    const material = db.prepare('SELECT * FROM inspiration_materials WHERE id = ?').get(id);

    res.json({
      ...material,
      tags: JSON.parse(material.tags),
      used_chapters: JSON.parse(material.used_chapters),
      is_used: Boolean(material.is_used)
    });
  } catch (error) {
    console.error('更新灵感素材失败:', error);
    res.status(500).json({ error: '更新灵感素材失败' });
  }
});

// 删除灵感素材
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;

    // 检查是否存在
    const existing = db.prepare('SELECT * FROM inspiration_materials WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: '灵感素材不存在' });
    }

    // 删除关联的章节灵感
    db.prepare('DELETE FROM chapter_inspirations WHERE inspiration_id = ?').run(id);

    // 删除灵感素材
    db.prepare('DELETE FROM inspiration_materials WHERE id = ?').run(id);

    res.json({ message: '删除成功' });
  } catch (error) {
    console.error('删除灵感素材失败:', error);
    res.status(500).json({ error: '删除灵感素材失败' });
  }
});

// 标记灵感为已使用
router.post('/:id/mark-used', (req, res) => {
  try {
    const { id } = req.params;
    const { chapter_id } = req.body;

    if (!chapter_id) {
      return res.status(400).json({ error: 'chapter_id 是必需的' });
    }

    // 获取灵感素材
    const material = db.prepare('SELECT * FROM inspiration_materials WHERE id = ?').get(id);
    if (!material) {
      return res.status(404).json({ error: '灵感素材不存在' });
    }

    // 更新使用状态
    const usedChapters = JSON.parse(material.used_chapters);
    if (!usedChapters.includes(chapter_id)) {
      usedChapters.push(chapter_id);
    }

    const now = new Date().toISOString();

    db.prepare(`
      UPDATE inspiration_materials
      SET is_used = 1,
          used_chapters = ?,
          updated_at = ?
      WHERE id = ?
    `).run(JSON.stringify(usedChapters), now, id);

    // 创建关联记录
    const linkId = generateId();
    db.prepare(`
      INSERT INTO chapter_inspirations (id, chapter_id, inspiration_id, created_at)
      VALUES (?, ?, ?, ?)
    `).run(linkId, chapter_id, id, now);

    const updated = db.prepare('SELECT * FROM inspiration_materials WHERE id = ?').get(id);

    res.json({
      ...updated,
      tags: JSON.parse(updated.tags),
      used_chapters: JSON.parse(updated.used_chapters),
      is_used: Boolean(updated.is_used)
    });
  } catch (error) {
    console.error('标记灵感失败:', error);
    res.status(500).json({ error: '标记灵感失败' });
  }
});

// 取消标记灵感为已使用
router.post('/:id/unmark-used', (req, res) => {
  try {
    const { id } = req.params;
    const { chapter_id } = req.body;

    if (!chapter_id) {
      return res.status(400).json({ error: 'chapter_id 是必需的' });
    }

    // 获取灵感素材
    const material = db.prepare('SELECT * FROM inspiration_materials WHERE id = ?').get(id);
    if (!material) {
      return res.status(404).json({ error: '灵感素材不存在' });
    }

    // 更新使用状态
    const usedChapters = JSON.parse(material.used_chapters).filter((ch: string) => ch !== chapter_id);
    const isUsed = usedChapters.length > 0 ? 1 : 0;

    const now = new Date().toISOString();

    db.prepare(`
      UPDATE inspiration_materials
      SET is_used = ?,
          used_chapters = ?,
          updated_at = ?
      WHERE id = ?
    `).run(isUsed, JSON.stringify(usedChapters), now, id);

    // 删除关联记录
    db.prepare(`
      DELETE FROM chapter_inspirations
      WHERE chapter_id = ? AND inspiration_id = ?
    `).run(chapter_id, id);

    const updated = db.prepare('SELECT * FROM inspiration_materials WHERE id = ?').get(id);

    res.json({
      ...updated,
      tags: JSON.parse(updated.tags),
      used_chapters: JSON.parse(updated.used_chapters),
      is_used: Boolean(updated.is_used)
    });
  } catch (error) {
    console.error('取消标记失败:', error);
    res.status(500).json({ error: '取消标记失败' });
  }
});

// 获取章节关联的灵感
router.get('/chapter/:chapter_id', (req, res) => {
  try {
    const { chapter_id } = req.params;

    const inspirations = db.prepare(`
      SELECT im.*, ci.used_portion
      FROM inspiration_materials im
      INNER JOIN chapter_inspirations ci ON ci.inspiration_id = im.id
      WHERE ci.chapter_id = ?
      ORDER BY ci.created_at DESC
    `).all(chapter_id);

    const processedInspirations = inspirations.map(i => ({
      ...i,
      tags: JSON.parse(i.tags),
      used_chapters: JSON.parse(i.used_chapters),
      is_used: Boolean(i.is_used)
    }));

    res.json({ inspirations: processedInspirations });
  } catch (error) {
    console.error('获取章节灵感失败:', error);
    res.status(500).json({ error: '获取章节灵感失败' });
  }
});

export default router;
