import { Router, type Request, type Response } from 'express'
import { db, generateId } from '../lib/database.js'

const router = Router()

/**
 * Get all entries for a novel (with optional category filter)
 * GET /api/worldview-entries
 */
router.get('/', async (req: Request, res: Response) => {
  const { novel_id, category_id, tag } = req.query

  if (!novel_id) {
    return res.status(400).json({ success: false, error: 'Novel ID is required' })
  }

  try {
    let query = 'SELECT * FROM worldview_entries WHERE novel_id = ?'
    const params: any[] = [novel_id]

    if (category_id) {
      query += ' AND category_id = ?'
      params.push(category_id)
    }

    query += ' ORDER BY created_at DESC'

    let entries = db.prepare(query).all(...params) as Array<any>

    // Parse JSON fields and convert is_locked to boolean for each entry
    entries = entries.map(e => ({
      ...e,
      tags: JSON.parse(e.tags || '[]'),
      related_entries: JSON.parse(e.related_entries || '[]'),
      related_characters: JSON.parse(e.related_characters || '[]'),
      metadata: JSON.parse(e.metadata || '{}'),
      is_locked: Boolean(e.is_locked),
    }))

    // Filter by tag if provided (SQLite doesn't have native array contains, so we do it in JS)
    if (tag) {
      entries = entries.filter(e => {
        return e.tags.includes(tag)
      })
    }

    res.json({ success: true, data: entries })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * Search entries
 * GET /api/worldview-entries/search/:novelId
 */
router.get('/search/:novelId', async (req: Request, res: Response) => {
  const { novelId } = req.params
  const { q } = req.query

  if (!q) {
    return res.status(400).json({ success: false, error: 'Search query is required' })
  }

  const searchTerm = String(q).toLowerCase()

  try {
    const entries = db.prepare('SELECT * FROM worldview_entries WHERE novel_id = ?').all(novelId) as Array<any>

    const filtered = entries.filter(e => {
      const titleMatch = e.title?.toLowerCase().includes(searchTerm)
      const contentMatch = e.content?.toLowerCase().includes(searchTerm)
      return titleMatch || contentMatch
    }).map(e => ({
      ...e,
      tags: JSON.parse(e.tags || '[]'),
      related_entries: JSON.parse(e.related_entries || '[]'),
      related_characters: JSON.parse(e.related_characters || '[]'),
      metadata: JSON.parse(e.metadata || '{}'),
      is_locked: Boolean(e.is_locked),
    }))

    res.json({ success: true, data: filtered })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * Get a single entry
 * GET /api/worldview-entries/:id
 */
router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params

  try {
    const entry = db.prepare('SELECT * FROM worldview_entries WHERE id = ?').get(id) as any

    if (!entry) {
      return res.status(404).json({ success: false, error: 'Entry not found' })
    }

    // Parse JSON fields and convert is_locked to boolean
    const parsedEntry = {
      ...entry,
      tags: JSON.parse(entry.tags || '[]'),
      related_entries: JSON.parse(entry.related_entries || '[]'),
      related_characters: JSON.parse(entry.related_characters || '[]'),
      metadata: JSON.parse(entry.metadata || '{}'),
      is_locked: Boolean(entry.is_locked),
    }

    res.json({ success: true, data: parsedEntry })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * Create a new entry
 * POST /api/worldview-entries
 */
router.post('/', async (req: Request, res: Response) => {
  const {
    novel_id,
    category_id,
    title,
    content,
    tags = [],
    related_entries = [],
    related_characters = [],
    metadata = {},
    is_locked = false
  } = req.body

  if (!novel_id || !category_id || !title) {
    return res.status(400).json({
      success: false,
      error: 'Novel ID, Category ID, and Title are required'
    })
  }

  try {
    const id = generateId()
    const now = new Date().toISOString()

    db.prepare(`
      INSERT INTO worldview_entries (id, novel_id, category_id, title, content, tags, related_entries, related_characters, metadata, is_locked, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      novel_id,
      category_id,
      title,
      content || null,
      JSON.stringify(tags),
      JSON.stringify(related_entries),
      JSON.stringify(related_characters),
      JSON.stringify(metadata),
      is_locked ? 1 : 0,
      now,
      now
    )

    const entry = db.prepare('SELECT * FROM worldview_entries WHERE id = ?').get(id) as any

    // Parse JSON fields and convert is_locked to boolean for response
    const parsedEntry = {
      ...entry,
      tags: JSON.parse(entry.tags || '[]'),
      related_entries: JSON.parse(entry.related_entries || '[]'),
      related_characters: JSON.parse(entry.related_characters || '[]'),
      metadata: JSON.parse(entry.metadata || '{}'),
      is_locked: Boolean(entry.is_locked),
    }

    res.json({ success: true, data: parsedEntry })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * Update an entry
 * PUT /api/worldview-entries/:id
 */
router.put('/:id', async (req: Request, res: Response) => {
  const { id } = req.params
  const updates = req.body

  const allowedFields = ['title', 'content', 'tags', 'related_entries', 'related_characters', 'metadata', 'is_locked']
  const updateFields: string[] = []
  const values: any[] = []

  for (const field of allowedFields) {
    if (field in updates) {
      if (['tags', 'related_entries', 'related_characters', 'metadata'].includes(field)) {
        updateFields.push(`${field} = ?`)
        values.push(JSON.stringify(updates[field]))
      } else if (field === 'is_locked') {
        updateFields.push(`${field} = ?`)
        values.push(updates[field] ? 1 : 0)
      } else {
        updateFields.push(`${field} = ?`)
        values.push(updates[field])
      }
    }
  }

  if (updateFields.length === 0) {
    return res.status(400).json({ success: false, error: 'No valid fields to update' })
  }

  updateFields.push('updated_at = ?')
  values.push(new Date().toISOString())
  values.push(id)

  try {
    db.prepare(`UPDATE worldview_entries SET ${updateFields.join(', ')} WHERE id = ?`).run(...values)

    const entry = db.prepare('SELECT * FROM worldview_entries WHERE id = ?').get(id) as any

    if (!entry) {
      return res.status(404).json({ success: false, error: 'Entry not found' })
    }

    // Parse JSON fields and convert is_locked to boolean for response
    const parsedEntry = {
      ...entry,
      tags: JSON.parse(entry.tags || '[]'),
      related_entries: JSON.parse(entry.related_entries || '[]'),
      related_characters: JSON.parse(entry.related_characters || '[]'),
      metadata: JSON.parse(entry.metadata || '{}'),
      is_locked: Boolean(entry.is_locked),
    }

    res.json({ success: true, data: parsedEntry })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * Delete an entry
 * DELETE /api/worldview-entries/:id
 */
router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params

  try {
    const result = db.prepare('DELETE FROM worldview_entries WHERE id = ?').run(id)

    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Entry not found' })
    }

    res.json({ success: true, message: 'Entry deleted successfully' })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router
