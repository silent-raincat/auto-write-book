import { Router, type Request, type Response } from 'express';
import OpenAI from 'openai';
import { db, generateId } from '../lib/database.js';

const router = Router();

function getAiClient(): OpenAI | null {
  const modelscopeBaseUrl = process.env.MODELSCOPE_BASE_URL || 'https://api-inference.modelscope.cn/v1';
  const modelscopeKey = process.env.MODELSCOPE_API_KEY;
  if (modelscopeKey) {
    return new OpenAI({ apiKey: modelscopeKey, baseURL: modelscopeBaseUrl });
  }

  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    return new OpenAI({ apiKey: openaiKey });
  }

  return null;
}

function getModelId(): string {
  return process.env.AI_MODEL_ID || 'deepseek-ai/DeepSeek-V3.2';
}

function tryExtractJsonObject(raw: string): string {
  const text = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  if (text.startsWith('{') && text.endsWith('}')) return text;
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first >= 0 && last > first) return text.slice(first, last + 1);
  return text;
}

// 获取某部小说的世界观树形结构
router.get('/tree/:novelId', (req: Request, res: Response) => {
  try {
    const { novelId } = req.params;

    const entries = db.prepare(`
      SELECT * FROM worldview_entries
      WHERE novel_id = ?
      ORDER BY created_at ASC
    `).all(novelId) as Array<any>;

    // 构建树形结构
    const entryMap = new Map();
    const rootEntries: any[] = [];

    entries.forEach(entry => {
      const parsed = {
        ...entry,
        tags: JSON.parse(entry.tags),
        related_entries: JSON.parse(entry.related_entries),
        related_characters: JSON.parse(entry.related_characters),
        metadata: JSON.parse(entry.metadata),
        children: []
      };
      entryMap.set(entry.id, parsed);
    });

    entries.forEach(entry => {
      const parsed = entryMap.get(entry.id);
      if (entry.parent_id && entryMap.has(entry.parent_id)) {
        entryMap.get(entry.parent_id).children.push(parsed);
      } else {
        rootEntries.push(parsed);
      }
    });

    res.json({ success: true, data: rootEntries });
  } catch (error: any) {
    console.error('Get worldview tree error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// AI解析用户输入并自动创建/归类世界观条目
router.post('/analyze', async (req: Request, res: Response) => {
  try {
    const { novelId, content } = req.body;

    if (!novelId || !content) {
      return res.status(400).json({ success: false, error: 'novelId and content are required' });
    }

    // 获取小说现有世界观条目作为上下文
    const existingEntries = db.prepare(`
      SELECT id, title, content, entry_type, tags
      FROM worldview_entries
      WHERE novel_id = ?
      ORDER BY created_at DESC
      LIMIT 50
    `).all(novelId) as Array<any>;

    // 构建AI提示词
    const contextPrompt = existingEntries.length > 0
      ? `\n\n【已有的世界观设定】（请注意关联和归类）\n${existingEntries.map(e => `- ${e.title}(${e.entry_type}): ${e.content?.substring(0, 100)}...`).join('\n')}`
      : '';

    const systemPrompt = `你是一位专业的世界观设定分析助手。你的任务是从用户输入的内容中提取世界观设定元素，并智能归类。

【输出格式】严格按以下JSON格式输出，不要有任何其他文字：
{
  "entries": [
    {
      "title": "条目名称",
      "content": "详细描述",
      "entry_type": "类型(civilization/faction/item/skill/concept/character/location/event/rule)",
      "tags": ["标签1", "标签2"],
      "parent_title": "父级条目名称（如果应该归属到某个已有条目下）",
      "parent_id": "父级条目ID（如果能匹配到已有的）",
      "suggested_relations": ["相关的其他条目名称"]
    }
  ]
}

【分析规则】
1. 识别所有实体、概念、物品、技能等
2. 判断每个元素的类型
3. 如果提到"XX是YY的一种"或"XX属于YY"，则YY应该是parent
4. 如果能匹配到已有条目，使用已有的ID作为parent_id
5. 提取关键词作为标签
6. 描述要详细完整`;

    const userPrompt = `请分析以下内容，提取世界观设定元素：${contextPrompt}\n\n【用户输入】\n${content}`;

    // 调用AI分析
    const openai = getAiClient();
    let analysis;

    if (!openai) {
      return res.status(500).json({
        success: false,
        error: '未配置AI API密钥，请在环境变量中设置 MODELSCOPE_API_KEY 或 OPENAI_API_KEY'
      });
    }

    try {
      const response = await openai.chat.completions.create({
        model: getModelId(),
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 2000
      } as any);

      const aiContent = response.choices[0]?.message?.content || '{}';
      const jsonStr = tryExtractJsonObject(aiContent);
      analysis = JSON.parse(jsonStr);
    } catch (aiError) {
      console.error('AI analysis error:', aiError);
      return res.status(500).json({
        success: false,
        error: `AI分析失败: ${aiError instanceof Error ? aiError.message : '未知错误'}`
      });
    }

    // 创建条目
    const createdEntries: any[] = [];
    const titleToIdMap = new Map();

    // 构建已有条目的标题->ID映射
    existingEntries.forEach(e => {
      titleToIdMap.set(e.title, e.id);
    });

    for (const entryData of analysis.entries) {
      let parentId = entryData.parent_id;

      // 如果指定了parent_title但没有parent_id，尝试查找
      if (entryData.parent_title && !parentId) {
        parentId = titleToIdMap.get(entryData.parent_title);
      }

      // 如果parent是新创建的条目，从createdEntries中找
      if (entryData.parent_title && !parentId) {
        const parent = createdEntries.find(e => e.title === entryData.parent_title);
        if (parent) {
          parentId = parent.id;
        }
      }

      const id = generateId();
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO worldview_entries (id, novel_id, parent_id, title, content, entry_type, tags, source_type, confidence, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        novelId,
        parentId || null,
        entryData.title,
        entryData.content,
        entryData.entry_type,
        JSON.stringify(entryData.tags || []),
        'ai_analyzed',
        0.9,
        now,
        now
      );

      const newEntry = db.prepare('SELECT * FROM worldview_entries WHERE id = ?').get(id);
      createdEntries.push(newEntry);
      titleToIdMap.set(entryData.title, id);
    }

    res.json({
      success: true,
      data: {
        created: createdEntries,
        message: `成功识别并创建了 ${createdEntries.length} 个世界观条目`
      }
    });

  } catch (error: any) {
    console.error('Analyze worldview error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 手动创建/更新世界观条目
router.post('/entry', (req: Request, res: Response) => {
  try {
    const { novelId, parentId, title, content, entry_type, tags } = req.body;

    if (!novelId || !title) {
      return res.status(400).json({ success: false, error: 'novelId and title are required' });
    }

    const id = generateId();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO worldview_entries (id, novel_id, parent_id, title, content, entry_type, tags, source_type, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      novelId,
      parentId || null,
      title,
      content || null,
      entry_type || 'concept',
      JSON.stringify(tags || []),
      'manual',
      now,
      now
    );

    const entry = db.prepare('SELECT * FROM worldview_entries WHERE id = ?').get(id);

    res.status(201).json({ success: true, data: entry });
  } catch (error: any) {
    console.error('Create entry error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 更新世界观条目
router.put('/entry/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, content, entry_type, tags, parent_id } = req.body;

    const now = new Date().toISOString();

    db.prepare(`
      UPDATE worldview_entries
      SET title = COALESCE(?, title),
          content = COALESCE(?, content),
          entry_type = COALESCE(?, entry_type),
          tags = COALESCE(?, tags),
          parent_id = COALESCE(?, parent_id),
          updated_at = ?
      WHERE id = ?
    `).run(
      title,
      content,
      entry_type,
      tags ? JSON.stringify(tags) : null,
      parent_id,
      now,
      id
    );

    const entry = db.prepare('SELECT * FROM worldview_entries WHERE id = ?').get(id);

    if (!entry) {
      return res.status(404).json({ success: false, error: 'Entry not found' });
    }

    res.json({ success: true, data: entry });
  } catch (error: any) {
    console.error('Update entry error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 删除世界观条目
router.delete('/entry/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // 检查是否有子条目
    const children = db.prepare('SELECT COUNT(*) as count FROM worldview_entries WHERE parent_id = ?').get(id) as { count: number };

    if (children.count > 0) {
      return res.status(400).json({
        success: false,
        error: `无法删除：该条目下还有 ${children.count} 个子条目，请先删除子条目`
      });
    }

    db.prepare('DELETE FROM worldview_entries WHERE id = ?').run(id);

    res.json({ success: true, message: '删除成功' });
  } catch (error: any) {
    console.error('Delete entry error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
