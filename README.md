# TrackBack - Simple Recording Manager

A minimal, no-dependency server to track techno tracks discovered on YouTube DJ sets.

## Quick Start

```bash
# Install dependencies (only needs Node.js runtime)
npm install --save-optional typescript @types/node

# Run the server
npm start
```

Then visit:
- http://localhost:3000 - View all recordings
- http://localhost:3000/add - Add a new recording

## Features

- 📝 Add YouTube DJ set recordings with timestamps
- 🗑️ Delete old recordings
- 📊 Simple grid view of all recordings
- ✨ No database needed (uses in-memory storage)

## How to Add Tracks

1. Go to http://localhost:3000/add
2. Paste the YouTube URL
3. Enter the timestamp when you heard it (e.g., "2:30" or "5:45")
4. Optionally add notes
5. Click "Save Recording"

After saving, find the track on Discogs, Bandcamp, or other platforms and link back to TrackBack!

## Architecture

- Single HTML page per function (no frameworks)
- Node.js native HTTP server
- In-memory storage (recording disappears on restart)

## Files

```
public/
  ├── index.html          - All recordings view
  ├── add-recording.html  - Add form (same as index.html)
server.js                 - Node.js HTTP server
package.json              - Dependencies & scripts
README.md                 - This file
```
