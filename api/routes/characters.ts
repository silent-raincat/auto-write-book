import { Router, type Request, type Response } from 'express'
import * as db from '../lib/db.js'

const router = Router()

/**
 * Get all characters for a novel
 * GET /api/characters?novel_id=xxx
 */
router.get('/', async (req: Request, res: Response) => {
  const { novel_id } = req.query

  if (!novel_id || typeof novel_id !== 'string') {
    return res.status(400).json({ success: false, error: 'Novel ID is required' })
  }

  try {
    const characters = await db.getCharacters(novel_id)
    res.json({ success: true, data: characters })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * Get a single character
 * GET /api/characters/:id
 */
router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params

  try {
    const character = await db.getCharacterById(id)

    if (!character) {
      return res.status(404).json({ success: false, error: 'Character not found' })
    }

    res.json({ success: true, data: character })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * Create a new character
 * POST /api/characters
 */
router.post('/', async (req: Request, res: Response) => {
  const { novel_id, name, age, gender, personality, background, appearance, relationships } = req.body

  if (!novel_id || !name) {
    return res.status(400).json({ success: false, error: 'Novel ID and Name are required' })
  }

  try {
    const character = await db.createCharacter({
      novel_id,
      name,
      age,
      gender,
      personality,
      background,
      appearance,
      relationships
    })

    res.json({ success: true, data: character })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * Update a character
 * PUT /api/characters/:id
 */
router.put('/:id', async (req: Request, res: Response) => {
  const { id } = req.params
  const updates = req.body

  try {
    const character = await db.updateCharacter(id, updates)

    if (!character) {
      return res.status(404).json({ success: false, error: 'Character not found' })
    }

    res.json({ success: true, data: character })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * Delete a character
 * DELETE /api/characters/:id
 */
router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params

  try {
    const success = await db.deleteCharacter(id)

    if (!success) {
      return res.status(404).json({ success: false, error: 'Character not found' })
    }

    res.json({ success: true, message: 'Character deleted successfully' })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router
