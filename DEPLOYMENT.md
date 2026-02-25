# AI Novel Writing System - Cloud Deployment Guide

This guide explains how to deploy the AI Novel Writing System to the cloud for free.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Users                                │
└─────────────────────┬───────────────────────────────────┘
                      │ HTTPS
                      ▼
┌─────────────────────────────────────────────────────────┐
│   Vercel (Frontend + Backend)                           │
│   - React App (Static Files)                            │
│   - API Routes (Serverless Functions)                   │
│   - CDN Global Distribution                              │
│   Free: 100GB bandwidth/month, 100GB-hrs serverless     │
└─────────────────────┬───────────────────────────────────┘
                      │ Data Access
                      ▼
┌─────────────────────────────────────────────────────────┐
│   Supabase (Database)                                    │
│   - PostgreSQL Database                                  │
│   - Free: 500MB storage                                  │
│   - Row Level Security                                   │
└─────────────────────────────────────────────────────────┘
```

---

## Quick Start (Vercel + Supabase)

### Option 1: Deploy to Vercel (Recommended - Full Stack)

Vercel can host both the frontend and backend as serverless functions.

**Step 1: Set Up Supabase Database**

1. Go to https://supabase.com
2. Sign up/Login
3. Click "New Project"
4. Set password (save it securely)
5. Choose a region closest to your users

**Step 2: Get Your Supabase Credentials**

1. Go to Project Settings → API
2. Copy:
   - `Project URL` → `VITE_SUPABASE_URL`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

**Step 3: Create Database Tables**

Go to SQL Editor in Supabase and run:

```sql
-- Users Table
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  name TEXT NOT NULL,
  plan TEXT DEFAULT 'free' CHECK(plan IN ('free', 'premium')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Novels Table
CREATE TABLE novels (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  genre TEXT,
  style TEXT,
  outline_text TEXT,
  outline_structure TEXT,
  rhythm_curve TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chapters Table
CREATE TABLE chapters (
  id TEXT PRIMARY KEY,
  novel_id TEXT NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  chapter_number INTEGER NOT NULL,
  status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'published', 'archived')),
  character_notes TEXT DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Characters Table
CREATE TABLE characters (
  id TEXT PRIMARY KEY,
  novel_id TEXT NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  age INTEGER,
  gender TEXT,
  personality TEXT,
  background TEXT,
  appearance TEXT,
  relationships TEXT DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Character Relationships Table
CREATE TABLE character_relationships (
  id TEXT PRIMARY KEY,
  novel_id TEXT NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
  character_id TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  related_character_id TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL,
  relationship_description TEXT,
  intensity INTEGER DEFAULT 5 CHECK(intensity >= 1 AND intensity <= 10),
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'estranged', 'deceased', 'complicated')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(character_id, related_character_id)
);

-- Character States Table
CREATE TABLE character_states (
  id TEXT PRIMARY KEY,
  novel_id TEXT NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
  character_id TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  chapter_id TEXT REFERENCES chapters(id) ON DELETE SET NULL,
  state_type TEXT NOT NULL CHECK(state_type IN ('emotion', 'motivation', 'condition', 'goal')),
  state_name TEXT NOT NULL,
  state_value TEXT,
  importance INTEGER DEFAULT 5 CHECK(importance >= 1 AND importance <= 10),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- World View Categories Table
CREATE TABLE worldview_categories (
  id TEXT PRIMARY KEY,
  novel_id TEXT NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- World View Entries Table
CREATE TABLE worldview_entries (
  id TEXT PRIMARY KEY,
  novel_id TEXT NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
  parent_id TEXT REFERENCES worldview_entries(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT,
  entry_type TEXT DEFAULT 'concept' CHECK(entry_type IN ('civilization', 'faction', 'item', 'skill', 'concept', 'character', 'location', 'event', 'rule')),
  tags TEXT DEFAULT '[]',
  related_entries TEXT DEFAULT '[]',
  related_characters TEXT DEFAULT '[]',
  metadata TEXT DEFAULT '{}',
  is_locked BOOLEAN DEFAULT false,
  source_type TEXT DEFAULT 'manual' CHECK(source_type IN ('manual', 'ai_analyzed', 'ai_generated')),
  confidence REAL DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inspiration Materials Table
CREATE TABLE inspiration_materials (
  id TEXT PRIMARY KEY,
  novel_id TEXT NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  category TEXT DEFAULT 'general' CHECK(category IN ('scene', 'dialogue', 'plot', 'atmosphere', 'action', 'character', 'general')),
  tags TEXT DEFAULT '[]',
  is_used BOOLEAN DEFAULT false,
  used_chapters TEXT DEFAULT '[]',
  color TEXT DEFAULT '#1890ff',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Indexes
CREATE INDEX idx_novels_user_id ON novels(user_id);
CREATE INDEX idx_chapters_novel_id ON chapters(novel_id);
CREATE INDEX idx_characters_novel_id ON characters(novel_id);
CREATE INDEX idx_character_relationships_novel ON character_relationships(novel_id);
CREATE INDEX idx_character_relationships_character ON character_relationships(character_id);
CREATE INDEX idx_character_relationships_related ON character_relationships(related_character_id);
CREATE INDEX idx_character_states_novel ON character_states(novel_id);
CREATE INDEX idx_character_states_character ON character_states(character_id);
CREATE INDEX idx_worldview_categories_novel ON worldview_categories(novel_id);
CREATE INDEX idx_worldview_entries_novel ON worldview_entries(novel_id);
CREATE INDEX idx_worldview_entries_parent ON worldview_entries(parent_id);
CREATE INDEX idx_inspiration_materials_novel_id ON inspiration_materials(novel_id);

-- Create Default User
INSERT INTO users (id, email, name, plan)
VALUES ('00000000-0000-0000-0000-000000000000', 'demo@cloud.app', 'Demo User', 'free');
```

**Step 4: Deploy to Vercel**

```bash
# Install Vercel CLI
npm i -g vercel

# In your project root
vercel

# Follow the prompts:
# - Set up and deploy? Y
# - Which scope? Your account
# - Link to existing project? N
# - Project name: ai-novel-writing
# - Directory: ./
# - Override settings? N
```

**Step 5: Configure Environment Variables in Vercel**

1. Go to your project on Vercel dashboard
2. Settings → Environment Variables
3. Add these variables:

```
DB_TYPE=supabase
VITE_SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
MODELSCOPE_API_KEY=ms-54964895-9e08-409e-80ab-fe3709c1b1e0
```

**Step 6: Redeploy**

```bash
vercel --prod
```

---

### Option 2: Deploy to Railway (Backend API Only)

If you prefer to use Railway for the backend:

**Step 1: Prepare Your Code**

```bash
git add .
git commit -m "Ready for deployment"
```

**Step 2: Connect Railway to GitHub**

1. Go to https://railway.app
2. Sign up with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your repository

**Step 3: Configure Environment Variables**

In Railway project settings, add:

```
DB_TYPE=supabase
VITE_SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
PORT=3002
NODE_ENV=production
MODELSCOPE_API_KEY=ms-54964895-9e08-409e-80ab-fe3709c1b1e0
```

**Step 4: Deploy**

- Railway will automatically detect and deploy
- Wait for deployment to complete
- Copy your Railway URL (e.g., `https://your-app.railway.app`)

**Step 5: Deploy Frontend to Vercel**

Update `vercel.json` to proxy API requests to Railway:

```json
{
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "https://your-app.railway.app/api/$1"
    },
    {
      "src": "/(.*)",
      "dest": "dist/$1"
    }
  ]
}
```

---

## Testing Your Deployment

1. **Visit Your Vercel URL**
   - Should see the application loading

2. **Test API Connection**
   - Check browser console for API errors
   - Try creating a novel

3. **Test Database**
   - Create a test novel
   - Check Supabase dashboard → Table Editor
   - Verify data appears

---

## Troubleshooting

### CORS Errors
If you see CORS errors, update `api/app.ts`:
```typescript
app.use(cors({
  origin: ['https://your-app.vercel.app', 'http://localhost:5173'],
  credentials: true
}));
```

### Database Connection Issues
- Verify `DB_TYPE=supabase` is set
- Check Supabase credentials are correct
- Ensure Supabase project is active (not paused)

### Build Failures
- Check Vercel build logs
- Ensure all dependencies are in `package.json`
- Verify `npm run build:prod` works locally

### Lambda Size Issues
If you hit the 50MB Lambda limit:
- Reduce dependencies
- Use `@vercel/node` with `maxLambdaSize` config

---

## Cost Summary

| Service | Free Tier | Monthly Cost |
|---------|-----------|--------------|
| Vercel | 100GB bandwidth, 100GB-hrs | $0 |
| Railway | $5 credit (512MB RAM) | $0 |
| Supabase | 500MB DB, 1GB bandwidth | $0 |
| **Total (Vercel)** | | **$0/month** |
| **Total (Railway)** | | **$0/month** |

---

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `DB_TYPE` | Database type | `supabase` or `sqlite` |
| `VITE_SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service key | `eyJ...` |
| `MODELSCOPE_API_KEY` | ModelScope API key | `ms-xxx...` |
| `PORT` | Server port | `3002` (default for Railway) |
| `NODE_ENV` | Environment | `production` |

---

## Next Steps

1. **Set Up Custom Domain** (optional)
   - Vercel: Domains → Add Domain

2. **Enable Automatic Backups** (Supabase)
   - Database → Backups → Enable daily backups

3. **Monitor Usage**
   - Vercel Analytics
   - Supabase Dashboard

4. **Scale When Needed**
   - Vercel Pro: $20/month
   - Supabase Pro: $25/month
