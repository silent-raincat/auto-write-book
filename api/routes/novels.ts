import { Router, type Request, type Response } from 'express'
import * as db from '../lib/db.js'

const router = Router()

function getUserId(req: Request): string {
  const header = req.headers['x-user-id']
  if (typeof header === 'string' && header) return header
  return '00000000-0000-0000-0000-000000000000'
}

/**
 * Get all novels for the current user
 * GET /api/novels
 */
router.get('/', async (req: Request, res: Response) => {
  const userId = getUserId(req)

  try {
    const novels = await db.getNovels(userId)
    res.json({ success: true, data: novels })
  } catch (error: any) {
    console.error('Fetch novels error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * Get a single novel
 * GET /api/novels/:id
 */
router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params

  try {
    const novel = await db.getNovelById(id)

    if (!novel) {
      return res.status(404).json({ success: false, error: 'Novel not found' })
    }

    res.json({ success: true, data: novel })
  } catch (error: any) {
    console.error('Fetch novel error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * Create a new novel
 * POST /api/novels
 */
router.post('/', async (req: Request, res: Response) => {
  const { title, description, genre, style, user_id } = req.body
  const userIdHeader = req.headers['x-user-id']
  const effectiveUserId = user_id || userIdHeader || getUserId(req)

  console.log('Creating novel:', { title, user_id: effectiveUserId })

  // Validate input
  if (!title) {
    return res.status(400).json({ success: false, error: 'Title is required' })
  }

  try {
    const novel = await db.createNovel({
      user_id: effectiveUserId,
      title,
      description,
      genre,
      style
    })

    console.log('Novel created successfully:', novel)
    res.json({ success: true, data: novel })
  } catch (error: any) {
    console.error('Create novel error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * Update a novel
 * PUT /api/novels/:id
 */
router.put('/:id', async (req: Request, res: Response) => {
  const { id } = req.params
  const updates = req.body

  try {
    const novel = await db.updateNovel(id, updates)

    if (!novel) {
      return res.status(404).json({ success: false, error: 'Novel not found' })
    }

    res.json({ success: true, data: novel })
  } catch (error: any) {
    console.error('Update novel error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * Delete a novel
 * DELETE /api/novels/:id
 */
router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params

  try {
    const success = await db.deleteNovel(id)

    if (!success) {
      return res.status(404).json({ success: false, error: 'Novel not found' })
    }

    res.json({ success: true, message: 'Novel deleted successfully' })
  } catch (error: any) {
    console.error('Delete novel error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router
