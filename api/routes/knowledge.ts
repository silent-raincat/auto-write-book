import { Router, type Request, type Response } from 'express'
import { supabase } from '../lib/supabase.js'

const router = Router()

/**
 * Get all knowledge files for a user
 * GET /api/knowledge
 */
router.get('/', async (req: Request, res: Response) => {
  const userId = req.headers['x-user-id'] as string
  
  if (!userId) {
     return res.status(400).json({ success: false, error: 'User ID header required' })
  }

  const { data, error } = await supabase
    .from('knowledge_files')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    return res.status(500).json({ success: false, error: error.message })
  }

  res.json({ success: true, data })
})

/**
 * Upload a knowledge file (Metadata only for now, assume file is uploaded to Storage separately or we implement multer)
 * POST /api/knowledge
 */
router.post('/', async (req: Request, res: Response) => {
  const { user_id, filename, file_type, file_size, storage_path, content_summary } = (req.body ??
    {}) as Record<string, unknown>
  const headerUserId = req.headers['x-user-id']
  const effectiveUserId = typeof user_id === 'string' && user_id.trim() ? user_id : typeof headerUserId === 'string' ? headerUserId : ''
  const normalizedFileType =
    typeof file_type === 'string' && file_type.trim() ? file_type.trim() : 'text/plain'
  const normalizedFileSize =
    typeof file_size === 'number' && Number.isFinite(file_size) && file_size >= 0
      ? Math.floor(file_size)
      : 0
  
  if (!effectiveUserId || typeof filename !== 'string' || !filename.trim() || typeof storage_path !== 'string' || !storage_path.trim()) {
    return res.status(400).json({ success: false, error: 'User ID, Filename and Storage Path are required' })
  }

  const { data, error } = await supabase
    .from('knowledge_files')
    .insert([
      {
        user_id: effectiveUserId,
        filename: filename.trim(),
        file_type: normalizedFileType,
        file_size: normalizedFileSize,
        storage_path: storage_path.trim(),
        content_summary: typeof content_summary === 'string' ? content_summary : null,
      },
    ])
    .select()
    .single()

  if (error) {
    return res.status(500).json({ success: false, error: error.message })
  }

  res.json({ success: true, data })
})

/**
 * Delete a knowledge file
 * DELETE /api/knowledge/:id
 */
router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params

  const { error } = await supabase
    .from('knowledge_files')
    .delete()
    .eq('id', id)

  if (error) {
    return res.status(500).json({ success: false, error: error.message })
  }

  res.json({ success: true, message: 'Knowledge file deleted successfully' })
})

export default router
