import { Router, type Request, type Response } from 'express'
import * as db from '../lib/db.js'

const router = Router()

/**
 * Get all chapters for a novel
 * GET /api/chapters
 */
router.get('/', async (req: Request, res: Response) => {
  const { novel_id } = req.query

  if (!novel_id || typeof novel_id !== 'string') {
    return res.status(400).json({ success: false, error: 'Novel ID is required' })
  }

  try {
    const chapters = await db.getChapters(novel_id)
    res.json({ success: true, data: chapters })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * Get a single chapter
 * GET /api/chapters/:id
 */
router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params

  try {
    const chapter = await db.getChapterById(id)

    if (!chapter) {
      return res.status(404).json({ success: false, error: 'Chapter not found' })
    }

    res.json({ success: true, data: chapter })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * Create a new chapter
 * POST /api/chapters
 */
router.post('/', async (req: Request, res: Response) => {
  const { novel_id, title, content, chapter_number, status, character_notes } = req.body

  if (!novel_id || !title) {
    return res.status(400).json({ success: false, error: 'Novel ID and Title are required' })
  }

  try {
    const normalizedStatus = status === 'published' || status === 'archived' || status === 'draft' ? status : 'draft'

    const chapter = await db.createChapter({
      novel_id,
      title,
      content,
      chapter_number: chapter_number || 1,
      status: normalizedStatus,
      character_notes
    })

    res.json({ success: true, data: chapter })
  } catch (error: any) {
    console.error('Create chapter error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * Update a chapter
 * PUT /api/chapters/:id
 */
router.put('/:id', async (req: Request, res: Response) => {
  const { id } = req.params
  const updates = req.body

  try {
    const chapter = await db.updateChapter(id, updates)

    if (!chapter) {
      return res.status(404).json({ success: false, error: 'Chapter not found' })
    }

    res.json({ success: true, data: chapter })
  } catch (error: any) {
    console.error('Update chapter error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * Delete a chapter
 * DELETE /api/chapters/:id
 */
router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params

  try {
    const success = await db.deleteChapter(id)

    if (!success) {
      return res.status(404).json({ success: false, error: 'Chapter not found' })
    }

    res.json({ success: true, message: 'Chapter deleted successfully' })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router
