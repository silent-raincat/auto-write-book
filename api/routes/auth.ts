/**
 * User authentication API routes
 * Handles user registration, login, logout, and token management
 */
import { Router, type Request, type Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import * as db from '../lib/db.js'

const router = Router()

// JWT Secret (从环境变量获取，默认值用于开发)
const JWT_SECRET = (process.env.JWT_SECRET || 'your-secret-key-change-in-production') as string
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || '7d') as string

interface RegisterRequest {
  email: string
  password: string
  name: string
}

interface LoginRequest {
  email: string
  password: string
}

/**
 * Generate JWT Token
 */
function generateToken(userId: string): string {
  return (jwt as any).sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
}

/**
 * Verify JWT Token
 */
function verifyToken(token: string): { userId: string } | null {
  try {
    const decoded = (jwt as any).verify(token, JWT_SECRET) as { userId: string }
    return decoded
  } catch {
    return null
  }
}

/**
 * User Registration
 * POST /api/auth/register
 */
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name } = req.body as RegisterRequest

    // 验证输入
    if (!email || !password || !name) {
      res.status(400).json({ success: false, error: '邮箱、密码和名称都是必填项' })
      return
    }

    if (password.length < 6) {
      res.status(400).json({ success: false, error: '密码至少需要6个字符' })
      return
    }

    // 检查邮箱是否已存在
    const existingUsers = await db.getUsersByEmail(email)
    if (existingUsers.length > 0) {
      res.status(409).json({ success: false, error: '该邮箱已被注册' })
      return
    }

    // 加密密码
    const passwordHash = await bcrypt.hash(password, 10)

    // 创建用户
    const newUser = await db.createUser({
      id: db.generateId(),
      email,
      name,
      plan: 'free'
    })

    // 如果是 Supabase，需要额外存储密码哈希
    if (process.env.DB_TYPE === 'supabase') {
      await db.updateUserPasswordHash(newUser.id, passwordHash)
    } else {
      // SQLite 模式，直接更新
      await db.updateUserPasswordHash(newUser.id, passwordHash)
    }

    // 生成 token
    const token = generateToken(newUser.id)

    // 返回用户信息（不包含密码）
    const { password_hash, ...userResponse } = newUser as any

    res.status(201).json({
      success: true,
      data: {
        user: userResponse,
        token
      }
    })
  } catch (error: any) {
    console.error('Register error:', error)
    res.status(500).json({ success: false, error: error.message || '注册失败' })
  }
})

/**
 * User Login
 * POST /api/auth/login
 */
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body as LoginRequest

    // 验证输入
    if (!email || !password) {
      res.status(400).json({ success: false, error: '邮箱和密码都是必填项' })
      return
    }

    // 查找用户
    const users = await db.getUsersByEmail(email)
    if (users.length === 0) {
      res.status(401).json({ success: false, error: '邮箱或密码错误' })
      return
    }

    const user = users[0]

    // 获取密码哈希
    const passwordHash = await db.getUserPasswordHash(user.id)

    // 验证密码
    const isValidPassword = await bcrypt.compare(password, passwordHash || '')
    if (!isValidPassword) {
      res.status(401).json({ success: false, error: '邮箱或密码错误' })
      return
    }

    // 生成 token
    const token = generateToken(user.id)

    // 返回用户信息
    res.json({
      success: true,
      data: {
        user,
        token
      }
    })
  } catch (error: any) {
    console.error('Login error:', error)
    res.status(500).json({ success: false, error: error.message || '登录失败' })
  }
})

/**
 * Get Current User
 * GET /api/auth/me
 */
router.get('/me', async (req: Request, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ success: false, error: '未授权访问' })
      return
    }

    const token = authHeader.substring(7)
    const payload = verifyToken(token)

    if (!payload) {
      res.status(401).json({ success: false, error: 'Token 无效或已过期' })
      return
    }

    // 获取用户信息
    const user = await db.getUserById(payload.userId)

    if (!user) {
      res.status(404).json({ success: false, error: '用户不存在' })
      return
    }

    res.json({
      success: true,
      data: { user }
    })
  } catch (error: any) {
    console.error('Get current user error:', error)
    res.status(500).json({ success: false, error: error.message || '获取用户信息失败' })
  }
})

/**
 * User Logout
 * POST /api/auth/logout
 */
router.post('/logout', async (req: Request, res: Response): Promise<void> => {
  // 在无状态的 JWT 方案中，客户端删除 token 即可
  // 如果需要实现 token 黑名单，可以使用 Redis
  res.json({ success: true, message: '退出成功' })
})

/**
 * Update User Profile
 * PUT /api/auth/profile
 */
router.put('/profile', async (req: Request, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ success: false, error: '未授权访问' })
      return
    }

    const token = authHeader.substring(7)
    const payload = verifyToken(token)

    if (!payload) {
      res.status(401).json({ success: false, error: 'Token 无效或已过期' })
      return
    }

    const { name, email } = req.body as { name?: string; email?: string }

    // 更新用户信息
    const updates: Partial<{ name: string; email: string }> = {}
    if (name) updates.name = name
    if (email) updates.email = email

    const updatedUser = await db.updateUser(payload.userId, updates)

    if (!updatedUser) {
      res.status(404).json({ success: false, error: '用户不存在' })
      return
    }

    res.json({
      success: true,
      data: { user: updatedUser }
    })
  } catch (error: any) {
    console.error('Update profile error:', error)
    res.status(500).json({ success: false, error: error.message || '更新失败' })
  }
})

export default router
