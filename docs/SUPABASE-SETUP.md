# Supabase Setup Guide for TrackID

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/sign in
2. Create a new project (free tier is sufficient for development)
3. Note your **Project URL** and **API Keys** from Settings → API

## 2. Configure Environment Variables

In your root directory, create/update `.env`:

```bash
cp .env.example .env
```

Then edit `.env` with your actual credentials:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
```

## 3. Run Database Setup Script

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** (left sidebar)
3. Click "New Query"
4. Copy and paste the contents of `src/recordings/service/db-setup.sql`
5. Click "Run" to execute the script

This will create the `track_candidates` table with proper schema and permissions.

## 4. Restart Your Application

```bash
npm run build
npm start
```

Your app is now connected to Supabase!

## 5. Testing

Visit your application frontend at `/` and try saving a track candidate:

- The form will save data directly to Supabase
- You can view all saved candidates via `GET /recordings` API endpoint

## 6. Security Note (Production)

For production, you may want to:

1. Add Row Level Security (RLS) policies for multi-user scenarios
2. Use environment variable protection (`.env` not in git)
3. Consider adding authentication (Clerk, NextAuth, etc.)

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/recordings` | Save a new track candidate |
| GET | `/recordings` | Get all candidates |
| GET | `/recordings/:id` | Get specific candidate |
| PATCH | `/recordings/:id` | Update candidate |
| DELETE | `/recordings/:id` | Delete candidate |
