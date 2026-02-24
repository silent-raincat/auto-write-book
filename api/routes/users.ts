import { Router, type Request, type Response } from 'express'
import { db, generateId } from '../lib/database.js'

const router = Router()

function getUserId(req: Request): string {
  const header = req.headers['x-user-id']
  if (typeof header === 'string' && header) return header
  return '00000000-0000-0000-0000-000000000000'
}

router.get('/me', async (req: Request, res: Response) => {
  const userId = getUserId(req)

  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any

    if (user) {
      return res.json({ success: true, data: user })
    }

    // 创建默认用户
    const newUser = {
      id: userId,
      email: `test-${userId}@local.dev`,
      name: 'Test User',
      plan: 'free',
    }

    db.prepare(`
      INSERT INTO users (id, email, name, plan)
      VALUES (?, ?, ?, ?)
    `).run(newUser.id, newUser.email, newUser.name, newUser.plan)

    res.json({ success: true, data: newUser })
  } catch (error: any) {
    console.error('Get user error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

router.put('/me', async (req: Request, res: Response) => {
  const userId = getUserId(req)
  const { name, plan } = req.body ?? {}

  const updates: string[] = ['updated_at = ?']
  const values: any[] = [new Date().toISOString()]

  if (typeof name === 'string' && name.trim()) {
    updates.push('name = ?')
    values.push(name.trim())
  }
  if (plan === 'free' || plan === 'premium') {
    updates.push('plan = ?')
    values.push(plan)
  }

  values.push(userId)

  try {
    db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values)

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId)

    res.json({ success: true, data: user })
  } catch (error: any) {
    console.error('Update user error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router
