-- 角色状态历史表
-- 用于记录角色在各章节中的状态变化（角色弧光），包括情绪、动机、处境、目标等

CREATE TABLE character_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  novel_id UUID NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  chapter_id UUID REFERENCES chapters(id) ON DELETE SET NULL,
  state_type VARCHAR(50) NOT NULL CHECK (state_type IN ('emotion', 'motivation', 'condition', 'goal')),
  state_name VARCHAR(100) NOT NULL,
  state_value TEXT,
  importance INTEGER DEFAULT 5 CHECK (importance >= 1 AND importance <= 10),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引优化
CREATE INDEX idx_character_states_novel ON character_states(novel_id);
CREATE INDEX idx_character_states_character ON character_states(character_id);
CREATE INDEX idx_character_states_chapter ON character_states(chapter_id);
CREATE INDEX idx_character_states_type ON character_states(state_type);

-- 行级安全策略
ALTER TABLE character_states ENABLE ROW LEVEL SECURITY;

-- 用户只能查看自己小说中的角色状态
CREATE POLICY "用户只能查看自己小说中的角色状态" ON character_states
  FOR SELECT USING (
    novel_id IN (SELECT id FROM novels WHERE user_id = auth.uid())
  );

-- 用户只能在自己小说中创建角色状态
CREATE POLICY "用户只能在自己小说中创建角色状态" ON character_states
  FOR INSERT WITH CHECK (
    novel_id IN (SELECT id FROM novels WHERE user_id = auth.uid())
  );

-- 用户只能更新自己小说中的角色状态
CREATE POLICY "用户只能更新自己小说中的角色状态" ON character_states
  FOR UPDATE USING (
    novel_id IN (SELECT id FROM novels WHERE user_id = auth.uid())
  );

-- 用户只能删除自己小说中的角色状态
CREATE POLICY "用户只能删除自己小说中的角色状态" ON character_states
  FOR DELETE USING (
    novel_id IN (SELECT id FROM novels WHERE user_id = auth.uid())
  );

-- 注释
COMMENT ON TABLE character_states IS '角色状态历史表，记录角色在各章节中的状态变化（角色弧光）';
COMMENT ON COLUMN character_states.state_type IS '状态类型：emotion-情绪, motivation-动机, condition-处境, goal-目标';
COMMENT ON COLUMN character_states.state_name IS '状态名称，如"愤怒"、"复仇"、"受伤"等';
COMMENT ON COLUMN character_states.state_value IS '状态的详细描述或值';
COMMENT ON COLUMN character_states.importance IS '重要性，1-10，用于在角色弧光中突出显示重要状态变化';
