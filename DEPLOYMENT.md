# AI Novel Writing System - Deployment Guide

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
│   Vercel (Frontend)                                      │
│   - React App                                            │
│   - Static Files (HTML/JS/CSS)                           │
│   - CDN Global Distribution                              │
│   Free: 100GB bandwidth/month                            │
└─────────────────────┬───────────────────────────────────┘
                      │ API Requests (rewritten)
                      ▼
┌─────────────────────────────────────────────────────────┐
│   Railway (Backend API)                                  │
│   - Node.js + Express                                    │
│   - Serverless Functions                                 │
│   Free: $5/month credit                                 │
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

## Step 1: Set Up Supabase Database

1. **Create a Supabase Project**
   - Go to https://supabase.com
   - Sign up/Login
   - Click "New Project"
   - Set password (save it securely)
   - Choose a region closest to your users

2. **Get Your Credentials**
   - Go to Project Settings → API
   - Copy:
     - `Project URL` → `VITE_SUPABASE_URL`
     - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

3. **Create Database Tables**
   - Go to SQL Editor in Supabase
   - Run the SQL script below:

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
```

---

## Step 2: Deploy Backend to Railway

1. **Prepare Your Code**
   ```bash
   # Make sure your code is committed to Git
   git add .
   git commit -m "Ready for deployment"
   ```

2. **Connect Railway to GitHub**
   - Go to https://railway.app
   - Sign up with GitHub
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your repository

3. **Configure Environment Variables**
   In Railway project settings, add these variables:
   ```
   DB_TYPE=supabase
   VITE_SUPABASE_URL=your-supabase-url
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   PORT=3002
   NODE_ENV=production
   MODELSCOPE_API_KEY=your-modelscope-key
   ```

4. **Deploy**
   - Railway will automatically detect and deploy
   - Wait for deployment to complete
   - Copy your Railway URL (e.g., `https://your-app.railway.app`)

---

## Step 3: Deploy Frontend to Vercel

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Deploy**
   ```bash
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

3. **Configure Environment Variables in Vercel**
   - Go to your project on Vercel dashboard
   - Settings → Environment Variables
   - Add:
     ```
     VITE_SUPABASE_URL=your-supabase-url
     DB_TYPE=supabase
     ```

4. **Set API Rewrite Rules**
   - The `vercel.json` file in your project handles this
   - It rewrites `/api/*` requests to your Railway backend
   - Update the `routes` in `vercel.json` if needed:

   ```json
   {
     "routes": [
       {
         "src": "/api/(.*)",
         "dest": "https://your-app.railway.app/api/$1"
       }
     ]
   }
   ```

5. **Redeploy**
   ```bash
   vercel --prod
   ```

---

## Step 4: Update Frontend API Configuration

Update `src/lib/api.ts` to use the deployed backend URL in production:

```typescript
const API_URL = import.meta.env.MODE === 'production'
  ? 'https://your-app.railway.app'  // Your Railway URL
  : '/api'  // Local development
```

---

## Step 5: Test Your Deployment

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
If you see CORS errors:
- In Railway, add Vercel domain to CORS allowed origins
- Update `api/app.ts`:
  ```typescript
  app.use(cors({
    origin: ['https://your-app.vercel.app', 'http://localhost:5173']
  }));
  ```

### Database Connection Issues
- Verify `DB_TYPE=supabase` is set
- Check Supabase credentials are correct
- Ensure Supabase project is active (not paused)

### Build Failures
- Check Railway build logs
- Ensure all dependencies are in `package.json`
- Verify `npm run build:prod` works locally

---

## Cost Summary

| Service | Free Tier | Monthly Cost |
|---------|-----------|--------------|
| Vercel | 100GB bandwidth, builds | $0 |
| Railway | $5 credit (512MB RAM) | $0 |
| Supabase | 500MB DB, 1GB bandwidth | $0 |
| **Total** | | **$0/month** |

---

## Next Steps

1. **Set Up Custom Domain** (optional)
   - Vercel: Domains → Add Domain
   - Railway: Settings → Domains

2. **Enable Automatic Backups** (Supabase)
   - Database → Backups → Enable daily backups

3. **Monitor Usage**
   - Vercel Analytics
   - Railway Metrics
   - Supabase Dashboard

4. **Scale When Needed**
   - Paid plans start at $20/month (Railway)
   - Supabase Pro: $25/month
