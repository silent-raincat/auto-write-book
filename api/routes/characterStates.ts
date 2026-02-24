import { Router, type Request, type Response } from 'express'
import { db, generateId } from '../lib/database.js'

const router = Router()

/**
 * Get all states for a character
 * GET /api/character-states
 */
router.get('/', async (req: Request, res: Response) => {
  const { character_id, novel_id } = req.query

  if (!character_id && !novel_id) {
    return res.status(400).json({ success: false, error: 'Character ID or Novel ID is required' })
  }

  try {
    let query = 'SELECT * FROM character_states WHERE 1=1'
    const params: any[] = []

    if (character_id) {
      query += ' AND character_id = ?'
      params.push(character_id)
    }
    if (novel_id) {
      query += ' AND novel_id = ?'
      params.push(novel_id)
    }

    query += ' ORDER BY created_at ASC'

    const states = db.prepare(query).all(...params)
    res.json({ success: true, data: states })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * Get states for a specific chapter
 * GET /api/character-states/chapter/:chapterId
 */
router.get('/chapter/:chapterId', async (req: Request, res: Response) => {
  const { chapterId } = req.params

  try {
    const states = db.prepare('SELECT * FROM character_states WHERE chapter_id = ?').all(chapterId)
    res.json({ success: true, data: states })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * Get character arc (timeline) for a character
 * GET /api/character-states/arc/:characterId
 */
router.get('/arc/:characterId', async (req: Request, res: Response) => {
  const { characterId } = req.params

  try {
    const character = db.prepare('SELECT id, name, novel_id FROM characters WHERE id = ?').get(characterId) as { id: string, name: string, novel_id: string } | undefined

    if (!character) {
      return res.status(404).json({ success: false, error: 'Character not found' })
    }

    const states = db.prepare('SELECT * FROM character_states WHERE character_id = ? ORDER BY created_at ASC').all(characterId) as Array<any>

    const chapters = db.prepare('SELECT id, chapter_number, title FROM chapters WHERE novel_id = ? ORDER BY chapter_number ASC').all(character.novel_id) as Array<any>

    const arc = chapters.map(chapter => {
      const chapterStates = states.filter(s => s.chapter_id === chapter.id)
      return {
        chapter_number: chapter.chapter_number,
        chapter_title: chapter.title,
        states: chapterStates.map(s => ({
          id: s.id,
          type: s.state_type,
          name: s.state_name,
          value: s.state_value,
          importance: s.importance,
        }))
      }
    }).filter(item => item.states.length > 0)

    res.json({
      success: true,
      data: {
        character_id: character.id,
        character_name: character.name,
        arc
      }
    })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * Create a new character state
 * POST /api/character-states
 */
router.post('/', async (req: Request, res: Response) => {
  const {
    novel_id,
    character_id,
    chapter_id,
    state_type,
    state_name,
    state_value,
    importance = 5
  } = req.body

  if (!novel_id || !character_id || !state_type || !state_name) {
    return res.status(400).json({
      success: false,
      error: 'Novel ID, Character ID, State Type, and State Name are required'
    })
  }

  try {
    const id = generateId()
    const now = new Date().toISOString()

    db.prepare(`
      INSERT INTO character_states (id, novel_id, character_id, chapter_id, state_type, state_name, state_value, importance, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, novel_id, character_id, chapter_id || null, state_type, state_name, state_value || null, importance, now)

    const state = db.prepare('SELECT * FROM character_states WHERE id = ?').get(id)

    res.json({ success: true, data: state })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * Update a character state
 * PUT /api/character-states/:id
 */
router.put('/:id', async (req: Request, res: Response) => {
  const { id } = req.params
  const updates = req.body

  const allowedFields = ['state_type', 'state_name', 'state_value', 'importance']
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

  values.push(id)

  try {
    db.prepare(`UPDATE character_states SET ${updateFields.join(', ')} WHERE id = ?`).run(...values)

    const state = db.prepare('SELECT * FROM character_states WHERE id = ?').get(id)

    if (!state) {
      return res.status(404).json({ success: false, error: 'Character state not found' })
    }

    res.json({ success: true, data: state })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * Delete a character state
 * DELETE /api/character-states/:id
 */
router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params

  try {
    const result = db.prepare('DELETE FROM character_states WHERE id = ?').run(id)

    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Character state not found' })
    }

    res.json({ success: true, message: 'Character state deleted successfully' })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router
