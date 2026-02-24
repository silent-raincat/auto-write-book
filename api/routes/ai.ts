import { Router, type Request, type Response } from 'express'
import OpenAI from 'openai'
import { db } from '../lib/database.js'

const router = Router()

function getAiClient(): OpenAI | null {
  const modelscopeBaseUrl = process.env.MODELSCOPE_BASE_URL || 'https://api-inference.modelscope.cn/v1'
  const modelscopeKey = process.env.MODELSCOPE_API_KEY
  if (modelscopeKey) {
    return new OpenAI({ apiKey: modelscopeKey, baseURL: modelscopeBaseUrl })
  }

  const openaiKey = process.env.OPENAI_API_KEY
  if (openaiKey) {
    return new OpenAI({ apiKey: openaiKey })
  }

  return null
}

function getModelId(): string {
  // Default to ModelScope Qwen2.5-235B model
  return process.env.AI_MODEL_ID || 'Qwen/Qwen2.5-235B'
}

function tryExtractJsonObject(raw: string): string {
  const text = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim()
  if (text.startsWith('{') && text.endsWith('}')) return text
  const first = text.indexOf('{')
  const last = text.lastIndexOf('}')
  if (first >= 0 && last > first) return text.slice(first, last + 1)
  return text
}

/**
 * Generate chapter content
 * POST /api/ai/generate-chapter
 */
router.post('/generate-chapter', async (req: Request, res: Response) => {
  const { novelId, prompt, keywords, currentContent, previousChapterContent, model_id } = (req.body ?? {}) as {
    novelId?: unknown
    prompt?: unknown
    keywords?: unknown
    currentContent?: unknown
    previousChapterContent?: unknown
    model_id?: unknown
    enable_thinking?: unknown
    stream?: unknown
  }

  if (typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({ success: false, error: 'Prompt is required' })
  }

  const enableThinking = (req.body as { enable_thinking?: unknown } | undefined)?.enable_thinking === false ? false : true
  const streamRequested = (req.body as { stream?: unknown } | undefined)?.stream === true
  const modelId = typeof model_id === 'string' && model_id.trim() ? model_id.trim() : getModelId()

  // 明确告知AI当前章节的内容状态
  let contextBlock: string
  if (typeof currentContent === 'string' && currentContent.trim() && currentContent.trim() !== '<p><br></p>') {
    contextBlock = currentContent
  } else {
    contextBlock = '【当前章节为空，需要从本章开头完整生成】'
  }
  const previousBlock =
    typeof previousChapterContent === 'string' && previousChapterContent.trim()
      ? previousChapterContent
      : ''
  const novelLine = typeof novelId === 'string' && novelId.trim() ? `小说ID：${novelId}\n` : ''
  const keywordList = Array.isArray(keywords)
    ? Array.from(
        new Set(
          keywords
            .filter((x): x is string => typeof x === 'string')
            .map((x) => x.trim())
            .filter((x) => x.length > 0),
        ),
      ).slice(0, 200)
    : []
  const keywordBlock = keywordList.length ? `\n\n灵感关键词（必须融入本次生成）：\n- ${keywordList.join('\n- ')}` : ''

  // Fetch characters for the novel
  let charactersBlock = ''
  if (typeof novelId === 'string' && novelId.trim()) {
    try {
      const characters = db.prepare('SELECT * FROM characters WHERE novel_id = ?').all(novelId) as Array<any>
      if (characters.length > 0) {
        charactersBlock = '\n\n【登场角色设定】（请在创作中参考这些角色）：\n'
        characters.forEach((char, idx) => {
          charactersBlock += `\n角色${idx + 1}：${char.name}\n`
          if (char.age) charactersBlock += `- 年龄：${char.age}\n`
          if (char.gender) charactersBlock += `- 性别：${char.gender}\n`
          if (char.personality) charactersBlock += `- 性格：${char.personality}\n`
          if (char.appearance) charactersBlock += `- 外貌：${char.appearance}\n`
          if (char.background) charactersBlock += `- 背景：${char.background}\n`
        })
      }
    } catch (error) {
      // Ignore character fetch error
      console.error('Failed to fetch characters:', error)
    }
  }

  try {
    const headerKey = req.headers['x-modelscope-api-key']
    const openai =
      typeof headerKey === 'string' && headerKey.trim()
        ? new OpenAI({
            apiKey: headerKey.trim(),
            baseURL: process.env.MODELSCOPE_BASE_URL || 'https://api-inference.modelscope.cn/v1',
          })
        : getAiClient()
    if (!openai) {
      // Return mock data if no API key
      await new Promise(resolve => setTimeout(resolve, 2000))
      const mockContent = `[Mock AI Generation]\n\n${novelLine}提示：${prompt}\n\n上下文参考：\n${contextBlock}\n${
        previousBlock ? `\n上一章参考：\n${previousBlock}\n` : ''
      }${keywordBlock}\n\n(请配置 MODELSCOPE_API_KEY 或 OPENAI_API_KEY 以启用真实生成)\n\n阳光透过树叶的缝隙洒在地面上，形成斑驳的光影。主角深吸了一口气，感受着森林中清新的空气。远处的鸟鸣声此起彼伏，似乎在诉说着古老的传说。`
      if (streamRequested) {
        res.status(200)
        res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
        res.setHeader('Cache-Control', 'no-cache, no-transform')
        res.setHeader('Connection', 'keep-alive')
        res.write(`event: content\ndata: ${JSON.stringify({ delta: mockContent })}\n\n`)
        res.write(`event: done\ndata: ${JSON.stringify({ ok: true })}\n\n`)
        res.end()
        return
      }
      return res.json({
        success: true,
        data: {
          content: mockContent,
          reasoning: '',
        }
      })
    }

    const messages: Array<{ role: 'system' | 'user'; content: string }> = [
      {
        role: 'system',
        content: `你是一个专业的小说创作助手。请根据用户提供的大纲、设定和提示生成小说章节内容。

创作规则：
1. 只生成【当前指定章节】的内容，绝对不要生成后续章节的内容
2. 如果当前章节内容为空或很少，从该章节的开头完整生成
3. 严格遵循提供的大纲设定（故事线、当前卷大纲、本章大纲）
4. 参考人物设定和世界观设定来塑造角色
5. 上一章大纲仅用于理解情节延续，不要因为"上一章可能已写完"就跳到下一章`,
      },
      {
        role: 'user',
        content: `${prompt}${novelLine ? `\n\n${novelLine}` : ''}${contextBlock ? `\n\n当前章节内容：\n${contextBlock}` : ''}${
          previousBlock ? `\n\n${previousBlock}` : ''
        }${charactersBlock}${keywordBlock}

请严格按照以上信息生成【当前章节】的完整内容，不要生成其他章节的内容。`,
      },
    ]

    if (streamRequested) {
      res.status(200)
      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
      res.setHeader('Cache-Control', 'no-cache, no-transform')
      res.setHeader('Connection', 'keep-alive')

      const params = {
        model: modelId,
        messages,
        stream: true,
        extra_body: { enable_thinking: enableThinking },
      } as unknown as Parameters<typeof openai.chat.completions.create>[0]

      const streamResult = await openai.chat.completions.create(params)

      let closed = false
      req.on('close', () => {
        closed = true
      })

      for await (const chunk of streamResult as unknown as AsyncIterable<unknown>) {
        if (closed) break
        const c = chunk as {
          choices?: Array<{
            delta?: { content?: string; reasoning_content?: string }
          }>
        }
        const choice = c.choices?.[0]
        const thinkingChunk = choice?.delta?.reasoning_content ?? ''
        const answerChunk = choice?.delta?.content ?? ''
        if (thinkingChunk) {
          res.write(`event: reasoning\ndata: ${JSON.stringify({ delta: thinkingChunk })}\n\n`)
        }
        if (answerChunk) {
          res.write(`event: content\ndata: ${JSON.stringify({ delta: answerChunk })}\n\n`)
        }
      }

      res.write(`event: done\ndata: ${JSON.stringify({ ok: true })}\n\n`)
      res.end()
      return
    }

    const params = {
      model: modelId,
      messages,
      stream: false,
      extra_body: { enable_thinking: enableThinking },
    } as unknown as Parameters<typeof openai.chat.completions.create>[0]

    const completion = await openai.chat.completions.create(params)

    const firstChoice = (completion as unknown as { choices?: Array<{ message?: Record<string, unknown> }> })
      .choices?.[0]
    const messageObj = firstChoice?.message
    const generatedContent = typeof messageObj?.content === 'string' ? messageObj.content : ''
    const reasoning = typeof messageObj?.reasoning_content === 'string' ? messageObj.reasoning_content : ''

    res.json({
      success: true,
      data: {
        content: generatedContent,
        reasoning,
      }
    })

  } catch (error: unknown) {
    console.error('AI Generation Error:', error)
    const msg = error instanceof Error ? error.message : 'AI generation failed'
    res.status(500).json({ success: false, error: msg })
  }
})

router.post('/generate-outline', async (req: Request, res: Response) => {
  const {
    novelTitle,
    genre,
    style,
    premise,
    volumes,
    chaptersPerVolume,
    model_id,
  } = (req.body ?? {}) as Record<string, unknown>

  const normalizedVolumes =
    typeof volumes === 'number' && Number.isFinite(volumes) && volumes > 0 ? Math.floor(volumes) : 3
  const normalizedChaptersPerVolume =
    typeof chaptersPerVolume === 'number' &&
    Number.isFinite(chaptersPerVolume) &&
    chaptersPerVolume > 0
      ? Math.floor(chaptersPerVolume)
      : 10

  const modelId = typeof model_id === 'string' && model_id.trim() ? model_id.trim() : getModelId()

  const headerKey = req.headers['x-modelscope-api-key']
  const openai =
    typeof headerKey === 'string' && headerKey.trim()
      ? new OpenAI({
          apiKey: headerKey.trim(),
          baseURL: process.env.MODELSCOPE_BASE_URL || 'https://api-inference.modelscope.cn/v1',
        })
      : getAiClient()

  const titleText = typeof novelTitle === 'string' && novelTitle.trim() ? novelTitle.trim() : '未命名小说'
  const genreText = typeof genre === 'string' && genre.trim() ? genre.trim() : '未指定'
  const styleText = typeof style === 'string' && style.trim() ? style.trim() : '未指定'
  const premiseText = typeof premise === 'string' && premise.trim() ? premise.trim() : ''

  if (!openai) {
    const totalChapters = normalizedVolumes * normalizedChaptersPerVolume
    const rhythm = Array.from({ length: totalChapters }, (_, i) => {
      const t = Math.round(2 + 8 * Math.sin((Math.PI * (i + 1)) / (totalChapters + 1)))
      return Math.max(1, Math.min(10, t))
    })
    const mock = {
      storyline: `《${titleText}》是一部${genreText}题材、偏${styleText}风格的故事。${premiseText ? `核心设定：${premiseText}` : ''}`,
      volumes: Array.from({ length: normalizedVolumes }, (_, v) => ({
        title: `第${v + 1}卷`,
        summary: `本卷推进主线并制造关键转折（卷${v + 1}）。`,
        chapters: Array.from({ length: normalizedChaptersPerVolume }, (_, c) => ({
          title: `第${v * normalizedChaptersPerVolume + c + 1}章`,
          summary: '推进剧情、强化冲突、埋下伏笔。',
          tension: rhythm[v * normalizedChaptersPerVolume + c],
        })),
      })),
      rhythm_curve: rhythm,
    }
    return res.json({ success: true, data: mock })
  }

  const schemaHint = `输出必须是严格 JSON（不要代码块、不要额外解释），结构如下：
{
  "storyline": "一句话到数段的主线概述",
  "volumes": [
    {
      "title": "卷标题",
      "summary": "卷摘要",
      "chapters": [
        { "title": "章标题", "summary": "章摘要", "tension": 1 }
      ]
    }
  ],
  "rhythm_curve": [1,2,3]
}`

  const userPrompt = `请为小说生成可编辑的大纲。\n小说标题：${titleText}\n题材：${genreText}\n风格：${styleText}\n${
    premiseText ? `前提/核心设定：${premiseText}\n` : ''
  }目标结构：${normalizedVolumes} 卷，每卷 ${normalizedChaptersPerVolume} 章。\n要求：每章给出简短摘要；tension 取 1-10；rhythm_curve 长度=总章数，按章节顺序。`

  try {
    const completion = await openai.chat.completions.create({
      model: modelId,
      stream: false,
      extra_body: { enable_thinking: true },
      messages: [
        { role: 'system', content: '你是一个专业的小说策划与大纲设计师。' },
        { role: 'user', content: `${schemaHint}\n\n${userPrompt}` },
      ],
    } as unknown as Parameters<typeof openai.chat.completions.create>[0])

    const firstChoice = (completion as unknown as { choices?: Array<{ message?: Record<string, unknown> }> })
      .choices?.[0]
    const messageObj = firstChoice?.message
    const content = typeof messageObj?.content === 'string' ? messageObj.content : ''
    const jsonText = tryExtractJsonObject(content)
    const parsed = JSON.parse(jsonText) as unknown

    res.json({ success: true, data: parsed })
  } catch (error: unknown) {
    console.error('AI Outline Error:', error)
    const msg = error instanceof Error ? error.message : 'AI outline generation failed'
    res.status(500).json({ success: false, error: msg })
  }
})

/**
 * Generate chapter from inspirations
 * POST /api/ai/generate-from-inspirations
 */
router.post('/generate-from-inspirations', async (req: Request, res: Response) => {
  const {
    novelId,
    inspirationIds,
    targetWordCount,
    model_id,
    stream,
    enable_thinking
  } = (req.body ?? {}) as {
    novelId?: unknown
    inspirationIds?: unknown
    targetWordCount?: unknown
    model_id?: unknown
    stream?: unknown
    enable_thinking?: unknown
  }

  if (typeof novelId !== 'string' || !novelId.trim()) {
    return res.status(400).json({ success: false, error: 'novelId is required' })
  }

  if (!Array.isArray(inspirationIds) || inspirationIds.length === 0) {
    return res.status(400).json({ success: false, error: 'inspirationIds is required' })
  }

  const wordCount = typeof targetWordCount === 'number' && targetWordCount > 0 ? targetWordCount : 3000
  const enableThinking = enable_thinking !== false
  const streamRequested = stream === true
  const modelId = typeof model_id === 'string' && model_id.trim() ? model_id.trim() : getModelId()

  // Fetch novel details
  const novel = db.prepare('SELECT * FROM novels WHERE id = ?').get(novelId) as Record<string, any> | undefined
  if (!novel) {
    return res.status(404).json({ success: false, error: 'Novel not found' })
  }

  // Fetch inspiration materials
  const inspirations = db.prepare(
    `SELECT * FROM inspiration_materials WHERE id IN (${inspirationIds.map(() => '?').join(',')})`
  ).all(...inspirationIds) as Array<any>

  if (inspirations.length === 0) {
    return res.status(404).json({ success: false, error: 'No inspirations found' })
  }

  // Build inspiration block
  let inspirationBlock = '\n\n【灵感素材】（请将以下素材有机融合到故事中）：\n'
  inspirations.forEach((insp, idx) => {
    const categoryLabel = {
      scene: '场景',
      dialogue: '对话',
      plot: '情节',
      atmosphere: '氛围',
      action: '动作',
      character: '角色',
      general: '通用'
    }[insp.category] || '通用'

    inspirationBlock += `\n灵感${idx + 1} [${categoryLabel}]:\n${insp.content}\n`
  })

  // Fetch characters for context
  let charactersBlock = ''
  try {
    const characters = db.prepare('SELECT * FROM characters WHERE novel_id = ?').all(novelId) as Array<any>
    if (characters.length > 0) {
      charactersBlock = '\n\n【登场角色设定】（请在创作中参考这些角色）：\n'
      characters.forEach((char, idx) => {
        charactersBlock += `\n角色${idx + 1}：${char.name}\n`
        if (char.age) charactersBlock += `- 年龄：${char.age}\n`
        if (char.gender) charactersBlock += `- 性别：${char.gender}\n`
        if (char.personality) charactersBlock += `- 性格：${char.personality}\n`
        if (char.appearance) charactersBlock += `- 外貌：${char.appearance}\n`
        if (char.background) charactersBlock += `- 背景：${char.background}\n`
      })
    }
  } catch (error) {
    console.error('Failed to fetch characters:', error)
  }

  // Build novel context
  let novelContext = ''
  if (novel.title) novelContext += `小说标题：${novel.title}\n`
  if (novel.genre) novelContext += `题材：${novel.genre}\n`
  if (novel.style) novelContext += `风格：${novel.style}\n`
  if (novel.description) novelContext += `简介：${novel.description}\n`
  if (novel.outline_text) novelContext += `\n故事大纲：\n${novel.outline_text}\n`

  try {
    const headerKey = req.headers['x-modelscope-api-key']
    const openai =
      typeof headerKey === 'string' && headerKey.trim()
        ? new OpenAI({
            apiKey: headerKey.trim(),
            baseURL: process.env.MODELSCOPE_BASE_URL || 'https://api-inference.modelscope.cn/v1',
          })
        : getAiClient()

    if (!openai) {
      await new Promise(resolve => setTimeout(resolve, 2000))
      const mockContent = `[Mock AI - 灵感生成模式]\n\n基于以下灵感的章节内容：\n${inspirationBlock}\n\n小说背景：\n${novelContext}\n\n(请配置 API Key 以启用真实生成)\n\n这是一个根据您的灵感素材生成的示例章节...`
      if (streamRequested) {
        res.status(200)
        res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
        res.setHeader('Cache-Control', 'no-cache, no-transform')
        res.setHeader('Connection', 'keep-alive')
        res.write(`event: content\ndata: ${JSON.stringify({ delta: mockContent })}\n\n`)
        res.write(`event: title\ndata: ${JSON.stringify({ title: '第X章 示例标题' })}\n\n`)
        res.write(`event: done\ndata: ${JSON.stringify({ ok: true })}\n\n`)
        res.end()
        return
      }
      return res.json({
        success: true,
        data: {
          content: mockContent,
          title: '第X章 示例标题',
          reasoning: '',
        }
      })
    }

    const messages: Array<{ role: 'system' | 'user'; content: string }> = [
      {
        role: 'system',
        content: `你是一位专业的小说作家。请根据作者提供的灵感素材，创作一章完整的小说内容。

创作要求：
1. 先生成一个吸引人的章节标题（格式：第X章 标题）
2. 字数要求：约 ${wordCount} 字（±10%可接受）
3. 将提供的灵感素材有机融合到故事中，不要生硬拼接
4. 保持与小说整体风格、设定一致
5. 注意人物性格和上下文连贯性
6. 灵感素材可以适当扩展和发挥，但要保持核心思想
7. 输出格式：先输出一行标题，然后空一行，最后输出正文内容`,
      },
      {
        role: 'user',
        content: `【小说背景】
${novelContext}${charactersBlock}${inspirationBlock}

请开始创作，记住先输出章节标题。`,
      },
    ]

    if (streamRequested) {
      res.status(200)
      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
      res.setHeader('Cache-Control', 'no-cache, no-transform')
      res.setHeader('Connection', 'keep-alive')

      const params = {
        model: modelId,
        messages,
        stream: true,
        extra_body: { enable_thinking: enableThinking },
      } as unknown as Parameters<typeof openai.chat.completions.create>[0]

      const streamResult = await openai.chat.completions.create(params)

      let closed = false
      let fullContent = ''
      req.on('close', () => {
        closed = true
      })

      for await (const chunk of streamResult as unknown as AsyncIterable<unknown>) {
        if (closed) break
        const c = chunk as {
          choices?: Array<{
            delta?: { content?: string; reasoning_content?: string }
          }>
        }
        const choice = c.choices?.[0]
        const thinkingChunk = choice?.delta?.reasoning_content ?? ''
        const answerChunk = choice?.delta?.content ?? ''

        if (thinkingChunk) {
          res.write(`event: reasoning\ndata: ${JSON.stringify({ delta: thinkingChunk })}\n\n`)
        }
        if (answerChunk) {
          fullContent += answerChunk
          res.write(`event: content\ndata: ${JSON.stringify({ delta: answerChunk })}\n\n`)
        }
      }

      // Extract title from content
      let title = '未命名章节'
      const titleMatch = fullContent.match(/^第[0-9零一二三四五六七八九十百千]+章\s+.+$/m)
      if (titleMatch) {
        title = titleMatch[0].trim()
      }

      res.write(`event: title\ndata: ${JSON.stringify({ title })}\n\n`)
      res.write(`event: done\ndata: ${JSON.stringify({ ok: true })}\n\n`)
      res.end()
      return
    }

    const params = {
      model: modelId,
      messages,
      stream: false,
      extra_body: { enable_thinking: enableThinking },
    } as unknown as Parameters<typeof openai.chat.completions.create>[0]

    const completion = await openai.chat.completions.create(params)

    const firstChoice = (completion as unknown as { choices?: Array<{ message?: Record<string, unknown> }> })
      .choices?.[0]
    const messageObj = firstChoice?.message
    const generatedContent = typeof messageObj?.content === 'string' ? messageObj.content : ''
    const reasoning = typeof messageObj?.reasoning_content === 'string' ? messageObj.reasoning_content : ''

    // Extract title from content
    let title = '未命名章节'
    let contentWithoutTitle = generatedContent
    const titleMatch = generatedContent.match(/^(第[0-9零一二三四五六七八九十百千]+章\s+.+)$/m)
    if (titleMatch) {
      title = titleMatch[1].trim()
      contentWithoutTitle = generatedContent.substring(titleMatch[0].length).trim()
    }

    res.json({
      success: true,
      data: {
        content: contentWithoutTitle,
        title,
        reasoning,
      }
    })

  } catch (error: unknown) {
    console.error('AI Inspiration Generation Error:', error)
    const msg = error instanceof Error ? error.message : 'AI generation failed'
    res.status(500).json({ success: false, error: msg })
  }
})

/**
 * Generate paragraph (optimized or specific scene)
 * POST /api/ai/generate-paragraph
 */
router.post('/generate-paragraph', async (req: Request, res: Response) => {
  // Similar implementation
  // ...
  res.json({ success: true, message: 'Not implemented yet' })
})

export default router
