-- 角色关系表
-- 用于存储角色之间的双向关系，支持关系类型、强度、状态等属性

CREATE TABLE character_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  novel_id UUID NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  related_character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  relationship_type VARCHAR(50) NOT NULL, -- 'friend', 'enemy', 'family', 'lover', 'mentor', 'rival', etc.
  relationship_description TEXT,
  intensity INTEGER DEFAULT 5 CHECK (intensity >= 1 AND intensity <= 10),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'estranged', 'deceased', 'complicated')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(character_id, related_character_id)
);

-- 索引优化
CREATE INDEX idx_character_relationships_novel ON character_relationships(novel_id);
CREATE INDEX idx_character_relationships_character ON character_relationships(character_id);
CREATE INDEX idx_character_relationships_related ON character_relationships(related_character_id);
CREATE INDEX idx_character_relationships_type ON character_relationships(relationship_type);

-- 行级安全策略
ALTER TABLE character_relationships ENABLE ROW LEVEL SECURITY;

-- 用户只能查看自己小说中的关系
CREATE POLICY "用户只能查看自己小说中的角色关系" ON character_relationships
  FOR SELECT USING (
    novel_id IN (SELECT id FROM novels WHERE user_id = auth.uid())
  );

-- 用户只能在自己小说中创建关系
CREATE POLICY "用户只能在自己小说中创建角色关系" ON character_relationships
  FOR INSERT WITH CHECK (
    novel_id IN (SELECT id FROM novels WHERE user_id = auth.uid())
  );

-- 用户只能更新自己小说中的关系
CREATE POLICY "用户只能更新自己小说中的角色关系" ON character_relationships
  FOR UPDATE USING (
    novel_id IN (SELECT id FROM novels WHERE user_id = auth.uid())
  );

-- 用户只能删除自己小说中的关系
CREATE POLICY "用户只能删除自己小说中的角色关系" ON character_relationships
  FOR DELETE USING (
    novel_id IN (SELECT id FROM novels WHERE user_id = auth.uid())
  );

-- 注释
COMMENT ON TABLE character_relationships IS '角色关系表，存储角色之间的双向关系';
COMMENT ON COLUMN character_relationships.relationship_type IS '关系类型：friend-朋友, enemy-敌人, family-家人, lover-恋人, mentor-导师, rival-竞争对手等';
COMMENT ON COLUMN character_relationships.intensity IS '关系强度，1-10，数字越大关系越紧密/强烈';
COMMENT ON COLUMN character_relationships.status IS '关系状态：active-活跃, estranged-疏远, deceased-已故, complicated-复杂';
