-- 世界观设定分类表
-- 用户可自定义世界观分类，如：地理、历史、势力、魔法体系、科技等级等

CREATE TABLE worldview_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  novel_id UUID NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  color VARCHAR(20),
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引优化
CREATE INDEX idx_worldview_categories_novel ON worldview_categories(novel_id);

-- 行级安全策略
ALTER TABLE worldview_categories ENABLE ROW LEVEL SECURITY;

-- 用户只能查看自己小说中的世界观分类
CREATE POLICY "用户只能查看自己小说中的世界观分类" ON worldview_categories
  FOR SELECT USING (
    novel_id IN (SELECT id FROM novels WHERE user_id = auth.uid())
  );

-- 用户只能在自己小说中创建世界观分类
CREATE POLICY "用户只能在自己小说中创建世界观分类" ON worldview_categories
  FOR INSERT WITH CHECK (
    novel_id IN (SELECT id FROM novels WHERE user_id = auth.uid())
  );

-- 用户只能更新自己小说中的世界观分类
CREATE POLICY "用户只能更新自己小说中的世界观分类" ON worldview_categories
  FOR UPDATE USING (
    novel_id IN (SELECT id FROM novels WHERE user_id = auth.uid())
  );

-- 用户只能删除自己小说中的世界观分类
CREATE POLICY "用户只能删除自己小说中的世界观分类" ON worldview_categories
  FOR DELETE USING (
    novel_id IN (SELECT id FROM novels WHERE user_id = auth.uid())
  );

-- 注释
COMMENT ON TABLE worldview_categories IS '世界观设定分类表，用户可自定义分类';
COMMENT ON COLUMN worldview_categories.name IS '分类名称，如"地理"、"历史"、"势力"等';
COMMENT ON COLUMN worldview_categories.description IS '分类描述';
COMMENT ON COLUMN worldview_categories.icon IS '图标名称（用于前端显示）';
COMMENT ON COLUMN worldview_categories.color IS '颜色代码（用于前端显示）';
COMMENT ON COLUMN worldview_categories.display_order IS '显示顺序，数值越小越靠前';
