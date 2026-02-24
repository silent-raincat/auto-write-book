import { Router, type Request, type Response } from 'express'
import { db, generateId } from '../lib/database.js'

const router = Router()

/**
 * Get all categories for a novel
 * GET /api/worldview-categories
 */
router.get('/', async (req: Request, res: Response) => {
  const { novel_id } = req.query

  if (!novel_id) {
    return res.status(400).json({ success: false, error: 'Novel ID is required' })
  }

  try {
    const categories = db.prepare('SELECT * FROM worldview_categories WHERE novel_id = ? ORDER BY display_order ASC').all(novel_id)
    res.json({ success: true, data: categories })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * Get a single category
 * GET /api/worldview-categories/:id
 */
router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params

  try {
    const category = db.prepare('SELECT * FROM worldview_categories WHERE id = ?').get(id)

    if (!category) {
      return res.status(404).json({ success: false, error: 'Category not found' })
    }

    res.json({ success: true, data: category })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * Create a new category
 * POST /api/worldview-categories
 */
router.post('/', async (req: Request, res: Response) => {
  const { novel_id, name, description, icon, color, display_order = 0 } = req.body

  if (!novel_id || !name) {
    return res.status(400).json({
      success: false,
      error: 'Novel ID and Name are required'
    })
  }

  try {
    const id = generateId()

    const now = new Date().toISOString()
    db.prepare(`
      INSERT INTO worldview_categories (id, novel_id, name, description, icon, color, display_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, novel_id, name, description || null, icon || null, color || null, display_order, now, now)

    const category = db.prepare('SELECT * FROM worldview_categories WHERE id = ?').get(id)

    res.json({ success: true, data: category })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * Update a category
 * PUT /api/worldview-categories/:id
 */
router.put('/:id', async (req: Request, res: Response) => {
  const { id } = req.params
  const updates = req.body

  const allowedFields = ['name', 'description', 'icon', 'color', 'display_order']
  const updateFields: string[] = []
  const values: any[] = []

  for (const field of allowedFields) {
    if (field in updates) {
      updateFields.push(`${field} = ?`)
      values.push(updates[field])
    }
  }

  if (updateFields.length === 0) {
    return res.status(400).json({ success: false, error: 'No valid fields to update' })
  }

  updateFields.push('updated_at = ?')
  values.push(new Date().toISOString())
  values.push(id)

  try {
    db.prepare(`UPDATE worldview_categories SET ${updateFields.join(', ')} WHERE id = ?`).run(...values)

    const category = db.prepare('SELECT * FROM worldview_categories WHERE id = ?').get(id)

    if (!category) {
      return res.status(404).json({ success: false, error: 'Category not found' })
    }

    res.json({ success: true, data: category })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * Delete a category
 * DELETE /api/worldview-categories/:id
 */
router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params

  try {
    const result = db.prepare('DELETE FROM worldview_categories WHERE id = ?').run(id)

    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Category not found' })
    }

    res.json({ success: true, message: 'Category deleted successfully' })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * Reorder categories
 * PUT /api/worldview-categories/reorder
 */
router.put('/reorder', async (req: Request, res: Response) => {
  const { categories } = req.body

  if (!Array.isArray(categories)) {
    return res.status(400).json({
      success: false,
      error: 'Categories must be an array'
    })
  }

  try {
    for (let i = 0; i < categories.length; i++) {
      const cat = categories[i]
      if (cat.id) {
        db.prepare('UPDATE worldview_categories SET display_order = ? WHERE id = ?').run(i, cat.id)
      }
    }

    res.json({ success: true, message: 'Categories reordered successfully' })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router
