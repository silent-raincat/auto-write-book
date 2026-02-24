-- Grant full access to service_role (which backend uses)
GRANT ALL PRIVILEGES ON users TO service_role;
GRANT ALL PRIVILEGES ON novels TO service_role;
GRANT ALL PRIVILEGES ON chapters TO service_role;
GRANT ALL PRIVILEGES ON chapter_versions TO service_role;
GRANT ALL PRIVILEGES ON characters TO service_role;
GRANT ALL PRIVILEGES ON knowledge_files TO service_role;

-- Grant access to anon for development (if using anon key in backend for some reason, though service_role is better)
GRANT ALL PRIVILEGES ON users TO anon;
GRANT ALL PRIVILEGES ON novels TO anon;

-- Temporarily disable RLS for development to rule out policy issues
ALTER TABLE novels DISABLE ROW LEVEL SECURITY;
ALTER TABLE chapters DISABLE ROW LEVEL SECURITY;
ALTER TABLE chapter_versions DISABLE ROW LEVEL SECURITY;
ALTER TABLE characters DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
