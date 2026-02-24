import { Router, type Request, type Response } from 'express'
import { db, generateId } from '../lib/database.js'

const router = Router()

/**
 * Get all relationships for a novel
 * GET /api/character-relationships
 */
router.get('/', async (req: Request, res: Response) => {
  const { novel_id } = req.query

  if (!novel_id) {
    return res.status(400).json({ success: false, error: 'Novel ID is required' })
  }

  try {
    const relationships = db.prepare('SELECT * FROM character_relationships WHERE novel_id = ?').all(novel_id)
    res.json({ success: true, data: relationships })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * Get a single relationship
 * GET /api/character-relationships/:id
 */
router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params

  try {
    const relationship = db.prepare('SELECT * FROM character_relationships WHERE id = ?').get(id)

    if (!relationship) {
      return res.status(404).json({ success: false, error: 'Relationship not found' })
    }

    res.json({ success: true, data: relationship })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * Get relationship graph data for visualization
 * GET /api/character-relationships/graph/:novelId
 */
router.get('/graph/:novelId', async (req: Request, res: Response) => {
  const { novelId } = req.params

  try {
    // Get all characters for this novel
    const characters = db.prepare('SELECT id, name FROM characters WHERE novel_id = ?').all(novelId) as Array<{ id: string, name: string }>

    // Get all relationships for this novel
    const relationships = db.prepare('SELECT * FROM character_relationships WHERE novel_id = ?').all(novelId) as Array<any>

    // Transform to graph format
    const nodes = characters.map(char => ({
      id: char.id,
      name: char.name,
    }))

    const links = relationships.map(rel => ({
      source: rel.character_id,
      target: rel.related_character_id,
      type: rel.relationship_type,
      intensity: rel.intensity,
      status: rel.status,
      description: rel.relationship_description,
    }))

    res.json({
      success: true,
      data: { nodes, links }
    })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * Create a new relationship
 * POST /api/character-relationships
 */
router.post('/', async (req: Request, res: Response) => {
  const {
    novel_id,
    character_id,
    related_character_id,
    relationship_type,
    relationship_description,
    intensity = 5,
    status = 'active'
  } = req.body

  if (!novel_id || !character_id || !related_character_id || !relationship_type) {
    return res.status(400).json({
      success: false,
      error: 'Novel ID, Character ID, Related Character ID, and Relationship Type are required'
    })
  }

  if (character_id === related_character_id) {
    return res.status(400).json({
      success: false,
      error: 'Character cannot have a relationship with themselves'
    })
  }

  try {
    const id = generateId()
    const now = new Date().toISOString()

    db.prepare(`
      INSERT INTO character_relationships (id, novel_id, character_id, related_character_id, relationship_type, relationship_description, intensity, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, novel_id, character_id, related_character_id, relationship_type, relationship_description || null, intensity, status, now, now)

    const relationship = db.prepare('SELECT * FROM character_relationships WHERE id = ?').get(id)

    res.json({ success: true, data: relationship })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * Update a relationship
 * PUT /api/character-relationships/:id
 */
router.put('/:id', async (req: Request, res: Response) => {
  const { id } = req.params
  const updates = req.body

  const allowedFields = ['relationship_type', 'relationship_description', 'intensity', 'status']
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
    db.prepare(`UPDATE character_relationships SET ${updateFields.join(', ')} WHERE id = ?`).run(...values)

    const relationship = db.prepare('SELECT * FROM character_relationships WHERE id = ?').get(id)

    if (!relationship) {
      return res.status(404).json({ success: false, error: 'Relationship not found' })
    }

    res.json({ success: true, data: relationship })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * Delete a relationship
 * DELETE /api/character-relationships/:id
 */
router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params

  try {
    const result = db.prepare('DELETE FROM character_relationships WHERE id = ?').run(id)

    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Relationship not found' })
    }

    res.json({ success: true, message: 'Relationship deleted successfully' })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router
