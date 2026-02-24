-- 在章节表中添加角色备注字段
-- 用于在章节中标记各角色的状态和备注

ALTER TABLE chapters ADD COLUMN character_notes JSONB DEFAULT '{}';

-- 注释
COMMENT ON COLUMN chapters.character_notes IS '章节中各角色的状态和备注，格式: { "character_id": { "emotion": "...", "notes": "..." } }';

-- 示例数据格式：
-- {
--   "character-uuid-1": {
--     "emotion": "愤怒",
--     "notes": "主角在发现背叛后的情绪状态"
--   },
--   "character-uuid-2": {
--     "emotion": "内疚",
--     "motivation": "想要弥补自己的过错"
--   }
-- }
