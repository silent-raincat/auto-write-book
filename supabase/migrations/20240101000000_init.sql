-- Enable pgcrypto extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  plan VARCHAR(20) DEFAULT 'free' CHECK (plan IN ('free', 'premium')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_plan ON users(plan);

-- Create novels table
CREATE TABLE IF NOT EXISTS novels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  genre VARCHAR(50),
  style VARCHAR(50),
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_novels_user_id ON novels(user_id);
CREATE INDEX IF NOT EXISTS idx_novels_genre ON novels(genre);

-- Create chapters table
CREATE TABLE IF NOT EXISTS chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  novel_id UUID NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  chapter_number INTEGER NOT NULL,
  content TEXT,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chapters_novel_id ON chapters(novel_id);
CREATE INDEX IF NOT EXISTS idx_chapters_status ON chapters(status);

-- Create characters table
CREATE TABLE IF NOT EXISTS characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  novel_id UUID NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  age INTEGER,
  gender VARCHAR(10),
  personality TEXT,
  background TEXT,
  appearance TEXT,
  relationships JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_characters_novel_id ON characters(novel_id);
CREATE INDEX IF NOT EXISTS idx_characters_name ON characters(name);

-- Create knowledge_files table
CREATE TABLE IF NOT EXISTS knowledge_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  file_type VARCHAR(50) NOT NULL,
  file_size INTEGER NOT NULL,
  storage_path VARCHAR(500) NOT NULL,
  content_summary TEXT,
  extracted_data JSONB,
  is_processed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_files_user_id ON knowledge_files(user_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_files_is_processed ON knowledge_files(is_processed);

-- Permissions and RLS
-- Note: These policies assume auth.uid() matches users.id. 
-- Since we are using a custom users table, these RLS policies might not work directly with Supabase Auth 
-- unless we sync them or use custom logic. 
-- For now, we apply them as requested.

ALTER TABLE novels ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_files ENABLE ROW LEVEL SECURITY;

-- Policies
-- We need to drop existing policies if they exist to avoid errors on re-run, 
-- but generic SQL doesn't support "CREATE POLICY IF NOT EXISTS" easily in all versions.
-- We'll assume fresh run or handle errors.

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'novels' AND policyname = '用户只能看到自己的小说') THEN
        CREATE POLICY "用户只能看到自己的小说" ON novels
          FOR ALL USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chapters' AND policyname = '用户只能看到自己的章节') THEN
        CREATE POLICY "用户只能看到自己的章节" ON chapters
          FOR ALL USING (auth.uid() IN (SELECT user_id FROM novels WHERE id = novel_id));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'characters' AND policyname = '用户只能看到自己的人物') THEN
        CREATE POLICY "用户只能看到自己的人物" ON characters
          FOR ALL USING (auth.uid() IN (SELECT user_id FROM novels WHERE id = novel_id));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'knowledge_files' AND policyname = '用户只能看到自己的知识库文件') THEN
        CREATE POLICY "用户只能看到自己的知识库文件" ON knowledge_files
          FOR ALL USING (auth.uid() = user_id);
    END IF;
END
$$;

-- Grants
GRANT SELECT ON novels TO anon;
GRANT SELECT ON chapters TO anon;
GRANT SELECT ON characters TO anon;

GRANT ALL PRIVILEGES ON novels TO authenticated;
GRANT ALL PRIVILEGES ON chapters TO authenticated;
GRANT ALL PRIVILEGES ON characters TO authenticated;
GRANT ALL PRIVILEGES ON knowledge_files TO authenticated;
