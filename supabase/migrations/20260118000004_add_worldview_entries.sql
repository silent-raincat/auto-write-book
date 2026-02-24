-- 世界观设定条目表
-- 存储具体的世界观内容，支持标签、关联条目、关联角色和自定义字段

CREATE TABLE worldview_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  novel_id UUID NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES worldview_categories(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  content TEXT,
  tags TEXT[] DEFAULT '{}',
  related_entries UUID[] DEFAULT '{}',
  related_characters UUID[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  is_locked BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引优化
CREATE INDEX idx_worldview_entries_novel ON worldview_entries(novel_id);
CREATE INDEX idx_worldview_entries_category ON worldview_entries(category_id);
CREATE INDEX idx_worldview_entries_tags ON worldview_entries USING GIN(tags);

-- 行级安全策略
ALTER TABLE worldview_entries ENABLE ROW LEVEL SECURITY;

-- 用户只能查看自己小说中的世界观条目
CREATE POLICY "用户只能查看自己小说中的世界观条目" ON worldview_entries
  FOR SELECT USING (
    novel_id IN (SELECT id FROM novels WHERE user_id = auth.uid())
  );

-- 用户只能在自己小说中创建世界观条目
CREATE POLICY "用户只能在自己小说中创建世界观条目" ON worldview_entries
  FOR INSERT WITH CHECK (
    novel_id IN (SELECT id FROM novels WHERE user_id = auth.uid())
  );

-- 用户只能更新自己小说中的世界观条目
CREATE POLICY "用户只能更新自己小说中的世界观条目" ON worldview_entries
  FOR UPDATE USING (
    novel_id IN (SELECT id FROM novels WHERE user_id = auth.uid())
  );

-- 用户只能删除自己小说中的世界观条目
CREATE POLICY "用户只能删除自己小说中的世界观条目" ON worldview_entries
  FOR DELETE USING (
    novel_id IN (SELECT id FROM novels WHERE user_id = auth.uid())
  );

-- 注释
COMMENT ON TABLE worldview_entries IS '世界观设定条目表，存储具体的世界观内容';
COMMENT ON COLUMN worldview_entries.title IS '条目标题';
COMMENT ON COLUMN worldview_entries.content IS '条目详细内容';
COMMENT ON COLUMN worldview_entries.tags IS '标签数组，用于分类和搜索';
COMMENT ON COLUMN worldview_entries.related_entries IS '关联的其他世界观条目ID数组';
COMMENT ON COLUMN worldview_entries.related_characters IS '关联的角色ID数组';
COMMENT ON COLUMN worldview_entries.metadata IS '自定义字段的扩展数据，JSON格式';
COMMENT ON COLUMN worldview_entries.is_locked IS '是否锁定，锁定后不允许编辑';
