# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

EchoVerse is a full-stack music streaming application with a Node.js/Express/Prisma backend and React frontend. The application features audio visualization using Three.js, synchronized lyrics display with multiple modes, and comprehensive music library management.

## Development Commands

### Backend (echoverse-backend/)

```bash
# Install dependencies
npm install

# Database setup
npx prisma migrate dev          # Run pending migrations
npx prisma db seed              # Seed database with test data (2 users, 8 songs, 2 playlists)
npx prisma studio               # Open Prisma Studio to view/edit database

# Development
npm run dev                     # Start with nodemon on port 3000
npm start                       # Production start

# Generate Prisma Client after schema changes
npx prisma generate
```

### Frontend (echoverse-frontend/)

```bash
# Install dependencies
npm install

# Development
npm start                       # Starts on port 3001

# Production
npm run build                   # Build for production

# Testing
npm test                        # Run tests
```

### Full Stack Development

Start both servers concurrently:
1. Terminal 1: `cd echoverse-backend && npm run dev`
2. Terminal 2: `cd echoverse-frontend && npm start`

## Architecture Overview

### Backend Architecture

**Technology Stack**: Node.js + Express v5 + Prisma ORM + PostgreSQL + JWT Authentication

**Entry Point**: `echoverse-backend/app.js` - Sets up Express server with CORS, body parsing, static file serving from `/uploads`, and mounts all API routes.

**API Structure**: RESTful API with JWT bearer token authentication
- `/api/users` - Registration, login, profile, favorites
- `/api/songs` - Song listing, search, lyrics updates
- `/api/albums` - Album creation with multi-file upload, deletion
- `/api/playlists` - CRUD operations for user playlists
- `/api/comments` - Song comments/reviews
- `/api/admin` - Admin dashboard and content moderation (partial implementation)

**Key Middleware**:
- `middleware/auth.js` - JWT verification, attaches `userId` to request
- `middleware/upload.js` - Multer configuration for audio files, cover images, and lyrics (max 200MB)
- `middleware/admin.js` - Admin role verification (incomplete - role field not in schema yet)

**Database Models** (see `prisma/schema.prisma`):
- User → Albums → Songs (cascade delete from album to songs)
- User ↔ Songs (many-to-many favorites via UserFavorite)
- Playlist ↔ Songs (many-to-many via PlaylistSong with unique constraint)
- Song → Comments (one-to-many)

**Important Patterns**:
1. File uploads create records in database AND store files in `uploads/` directory
2. Album deletion uses transactions and cleans up associated files
3. Lyrics stored as JSON string in Song.lyrics field (LRC format parsed on upload)
4. `music-metadata` library extracts duration/metadata from uploaded audio files

### Frontend Architecture

**Technology Stack**: React 19 + Framer Motion + Three.js/React Three Fiber + Web Audio API

**Critical**: The entire frontend is built in a single monolithic file `echoverse-frontend/src/App.js` (84KB). All components, state management, API calls, and logic are in this one file.

**State Management**: Uses React Context API (`AppProvider` + `useApp()` hook)
- Global state: user, currentSong, isPlaying, playlists, viewState
- localStorage for token and user persistence
- No external state management library

**Navigation**: Internal view state system (no react-router)
- Views: 'home', 'login', 'profile', 'playlists', 'playlistDetail', 'creator', 'songDetail'
- View switching via `setViewState({view, playlistId?, songId?})`

**Audio System Architecture**:
1. HTML5 `<audio>` element with CORS support
2. Web Audio API: `AudioContext` + `AnalyserNode` for frequency data
3. Beat detection monitoring bass frequencies every 200ms
4. Real-time frequency data drives Three.js particle visualizations

**Lyrics System**:
- LRC format parser: `[MM:SS.ms]text` → `[{time, text}, ...]`
- 7 display modes: Karaoke, Beat-Bounce, Immersive, Typewriter, Emotion, Interactive, Spatial-Flow
- Synchronized to audio playback with millisecond precision
- In-app lyrics editor for song owners

**API Integration**: Custom `api` object with automatic JWT token injection from localStorage.

### File Upload Flow

1. Frontend: User selects audio files, cover image, optional lyrics in Creator Center
2. FormData created with: album metadata, audio files (multiple), cover (single), lyric files (optional)
3. POST to `/api/albums` with multipart/form-data
4. Backend: Multer saves files, `music-metadata` extracts duration
5. Backend: Prisma transaction creates Album + Songs records
6. Backend: Returns album with song URLs
7. Frontend: Displays in "My Works" section

### Authentication Flow

1. User registers/logs in → Backend returns JWT (7-day expiry)
2. Frontend stores token in localStorage + context state
3. All authenticated requests include `Authorization: Bearer <token>` header
4. Backend `auth.js` middleware verifies and attaches `userId` to request
5. Auto-login on page reload if valid token exists

## Database Configuration

**Connection**: PostgreSQL database named `echoverse` on localhost:5432
- Configured via `DATABASE_URL` in `echoverse-backend/.env`
- Default credentials: `heziqiang/mima1dao9` (should be changed for production)

**Test Data** (via `npm run prisma db seed`):
- 2 users: test@example.com, demo@example.com (password: 123456)
- 8 songs by 周杰伦 with placeholder covers
- 2 playlists with sample associations
- Sample comments and favorites

**Important**: Songs CANNOT exist without an Album (required foreign key with cascade delete). Always create albums when adding songs.

## Code Editing Guidelines

### Backend Changes

When modifying backend code:
1. If changing `prisma/schema.prisma`:
   - Run `npx prisma migrate dev --name <description>` to create migration
   - Run `npx prisma generate` to update Prisma Client types
2. Controllers use async/await with try-catch error handling
3. Always use Prisma transactions for operations creating multiple related records
4. File cleanup: When deleting albums/songs, also delete associated files from `uploads/`

### Frontend Changes

**Critical Considerations**:
1. All code is in `src/App.js` - find the specific component function within this file
2. Use `useApp()` hook to access global state (user, playlists, currentSong, etc.)
3. API calls use the `api` helper object (api.get, api.post, api.postForm, etc.)
4. View navigation: Call `setViewState({view: '...', ...params})`
5. Styling: Tailwind utility classes + inline Framer Motion animations

**When refactoring frontend** (recommended for maintainability):
- Extract components to separate files in `src/components/`
- Keep Context Provider in App.js or move to `src/contexts/AppContext.js`
- Maintain the `api` helper or replace with Axios/React Query
- Consider replacing view state with react-router-dom

### Adding New Features

**New API Endpoint**:
1. Create controller function in appropriate `controllers/*.js` file
2. Add route in `routes/*.js` with appropriate middleware (auth, upload, admin)
3. Register route in `app.js` under correct prefix
4. Update frontend `api` calls in `App.js`

**New Database Model**:
1. Add model to `prisma/schema.prisma`
2. Define relationships with existing models
3. Run `npx prisma migrate dev --name add_<model_name>`
4. Update seed script if needed for test data

**New Frontend Feature**:
1. Add component function in `App.js` (or extract to separate file)
2. If needs global state, add to `AppContext` state object
3. Add view option to `viewState` system if full-page feature
4. Update navigation in Sidebar or Header components

## Unique Features

1. **Dynamic Lyrics with 7 Modes**: Emotion-based theming, beat-reactive, interactive seeking
2. **Audio-Reactive 3D Background**: Three.js particles respond to frequency analysis
3. **Batch Album Upload**: Upload multiple songs + metadata in single request
4. **Custom Animated Cursor**: Context-aware cursor states (hover, click, etc.)
5. **Real-time Beat Detection**: Visual effects synchronized to bass frequencies

## Known Limitations

1. Admin role system incomplete - `User` model lacks `role` field referenced by `admin.js` middleware
2. Frontend monolithic structure makes large-scale refactoring difficult
3. No password reset mechanism
4. No audio streaming - full files loaded (consider chunked transfer for large files)
5. No caching layer - all data fetched fresh on each request
6. No test coverage (test commands exist but not implemented)

## Environment Variables

**Backend** (`echoverse-backend/.env`):
```env
DATABASE_URL="postgresql://username:password@localhost:5432/echoverse"
JWT_SECRET="your-secret-key"
PORT=3000
NODE_ENV=development
```

**Frontend**: No environment variables required. API URL defaults to `http://localhost:3000` (configurable via `REACT_APP_API_URL`).

## Troubleshooting

**"Audio won't play"**: Check browser autoplay policies. Web Audio API requires user interaction before `AudioContext.resume()`.

**"Upload fails with 413"**: File exceeds 200MB limit. Adjust in `middleware/upload.js`.

**"Prisma Client errors"**: Run `npx prisma generate` after schema changes.

**"CORS errors"**: Verify backend CORS configuration in `app.js` includes frontend URL.

**"Lyrics not syncing"**: Verify LRC format `[MM:SS.ms]text`. Parser expects exact format.
