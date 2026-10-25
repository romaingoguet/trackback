# TrackID - Quick Start Guide

## 🚀 First Time Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Edit `.env` with your Supabase credentials:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
SUPABASE_ANON_KEY=your-anon-key-here
PORT=3000
```

### 3. Set Up Database Table

**Option A - Using Supabase Dashboard:**
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Run the migration file: `src/migrations/create-track-candidates-table.sql`

**Option B - Via RPC (Automatic):**
The app will attempt to create the table automatically on first run if you have the RPC function set up in Supabase.

### 4. Start the Application
```bash
npm run start:dev
# or for production
npm run build && npm run start:prod
```

## 🌐 Access the Frontend

Once running, open your browser to:

- **All Recordings**: http://localhost:3000/
- **Add New Recording**: http://localhost:3000/add

## 📱 Features Overview

### Main Page (`/`)
- View all discovered tracks from YouTube DJ sets
- See timestamps and notes for each recording
- Delete recordings by hovering and clicking the delete button
- Responsive design works on mobile devices

### Add Page (`/add`)
- Simple form to add new track discoveries
- YouTube link input (required)
- Timestamp input with auto-formatting (HH:MM or HH:MM:SS)
- Optional notes field

## 🔧 Architecture Highlights

### Singleton Supabase Service
The `SupabaseService` in `src/core/supabase.service.ts` is initialized once at app startup using the singleton pattern, ensuring the client is created efficiently and reused throughout the application.

### Frontend Integration
Static HTML pages are served from the `public/` directory via Express middleware in `main.ts`.

### API Endpoints
- `GET /recordings` - Fetch all recordings
- `POST /recordings` - Add new recording
- `GET /recordings/:id` - Get single recording
- `PATCH /recordings/:id` - Update recording (not implemented yet)
- `DELETE /recordings/:id` - Delete recording

## 🎨 Design Notes

The frontend features:
- Dark theme optimized for techno enthusiasts
- Minimalist design focused on content
- Smooth animations and hover effects
- Mobile-responsive layout
