/**
 * This is a API server
 */

import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import authRoutes from './routes/auth.js'
import novelRoutes from './routes/novels.js'
import chapterRoutes from './routes/chapters.js'
import characterRoutes from './routes/characters.js'
import characterRelationshipRoutes from './routes/characterRelationships.js'
import characterStateRoutes from './routes/characterStates.js'
import knowledgeRoutes from './routes/knowledge.js'
import worldviewCategoryRoutes from './routes/worldviewCategories.js'
import worldviewEntryRoutes from './routes/worldviewEntries.js'
import worldviewRoutes from './routes/worldview.js'
import aiRoutes from './routes/ai.js'
import inspirationRoutes from './routes/inspirations.js'
import userRoutes from './routes/users.js'

// load env
dotenv.config()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Request Logging Middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  if (process.env.NODE_ENV !== 'production' && req.method !== 'GET') {
    console.log('Body:', JSON.stringify(req.body, null, 2));
  }
  next();
});

/**
 * API Routes
 */
app.use('/api/auth', authRoutes)
app.use('/api/novels', novelRoutes)
app.use('/api/chapters', chapterRoutes)
app.use('/api/characters', characterRoutes)
app.use('/api/character-relationships', characterRelationshipRoutes)
app.use('/api/character-states', characterStateRoutes)
app.use('/api/knowledge', knowledgeRoutes)
app.use('/api/worldview-categories', worldviewCategoryRoutes)
app.use('/api/worldview-entries', worldviewEntryRoutes)
app.use('/api/worldview', worldviewRoutes)
app.use('/api/ai', aiRoutes)
app.use('/api/inspirations', inspirationRoutes)
app.use('/api/users', userRoutes)

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const clientDistDirCandidates = [
  path.resolve(currentDir, '..', 'dist'),
  path.resolve(currentDir, '..', '..', 'dist'),
]
const clientDistDir = clientDistDirCandidates.find((p) =>
  fs.existsSync(path.join(p, 'index.html')),
)

if (clientDistDir) {
  app.use(express.static(clientDistDir))
}

/**
 * health
 */
app.use(
  '/api/health',
  (req: Request, res: Response): void => {
    res.status(200).json({
      success: true,
      message: 'ok',
    })
  },
)

/**
 * error handler middleware
 */
app.use((error: Error, req: Request, res: Response) => {
  console.error('Global Error Handler:', error);
  res.status(500).json({
    success: false,
    error: 'Server internal error',
    message: error.message // Include error message for debugging
  })
})

/**
 * 404 handler / SPA fallback
 */
app.use((req: Request, res: Response) => {
  if (!req.path.startsWith('/api') && clientDistDir && req.method === 'GET') {
    return res.sendFile(path.join(clientDistDir, 'index.html'))
  }

  res.status(404).json({
    success: false,
    error: req.path.startsWith('/api') ? 'API not found' : 'Not found',
  })
})

export default app
