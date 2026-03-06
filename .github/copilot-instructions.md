# iAnime AI Agent Instructions

## Project Overview
**iAnime** is a full-stack web application for anime enthusiasts, combining anime discovery, real-time community chat, and merchandising recommendations. Built with React (frontend), Express.js + Socket.io (backend), and MongoDB (database).

## Architecture

### Technology Stack
- **Frontend**: React 18, React Router, Bootstrap
- **Backend**: Node.js, Express.js, Socket.io
- **Database**: MongoDB + Mongoose ODM
- **Real-time**: Socket.io for chat and notifications
- **External APIs**: Jikan/AniList/Kitsu (anime), JustWatch (streaming platforms), ipinfo.io (geolocation)

### Key Directories
- `client/src/` - React components (AnimeSearch, Community, AnimeDetail, etc.)
- `server/` - Express backend with Socket.io
- `server/models/` - Mongoose schemas (to be created)

## Domain Model & Database Schemas

### Core Entities (as MongoDB collections):

**User**
- Basic: email, password (hashed), username, createdAt, updatedAt
- Profile: bio, profileImage, displayNameColor (premium), profileFrameStyle (premium)
- Settings: theme, displayMode (light/dark), language, notifications config
- Premium: isPremium, premiumExpiresAt, billingMethod
- 2FA: twoFAEnabled, twoFAMethod (phone/email/app)
- Privacy: whoCanInvite (all/friends/none), acceptStrangerMessages (bool)
- Relations: friendsList[], blockedUsers[], communities[]

**Anime**
- Basic: title, description, coverImage, rating, category, status
- Links: jikanId, anilistId, kitsuId (for external API sync)
- Platforms: [] of { name, url, country, type }
- Community: hashtags[], followedByCount

**Community**
- Basic: name, description, adminId, createdAt
- Structure: roles[], categories[], channelGroups[], members[]
- Content: pinnedMessages[]
- Relations: admin → User, members → [User]

**Role** (within Community)
- name, permissions[], color, Members[]
- Permissions: kick, deleteMsg, mute, manageRoles, manageChannels, etc.

**ChannelGroup** (organizational folder within Community)
- name, channels[]

**Channel** (within ChannelGroup)
- name, type (text/voice), hashtags[], maxMembers (max 10)
- permissions (role-based access), messages[]

**Message** (in Channels or DMs)
- content, authorId, channelId/dmSessionId, timestamp, isPinned, reactions[]

**DirectMessage / ChatSession**
- participants: [userId, userId], messages[], createdAt

**Friendship**
- requester, recipient, status (pending/accepted/blocked), createdAt

## Key Patterns & Workflows

### Authentication Flow
- POST `/api/auth/register` - email, password, username
- POST `/api/auth/login` - credentials → JWT token
- POST `/api/auth/2fa-send` - send 2FA code
- POST `/api/auth/password-reset` - email-based recovery

### Real-time Communication (Socket.io)
- `connection` - user joins
- `send-message` - emit from client, broadcast to channel/DM
- `user-typing` - presence indicator
- `channel-join/leave` - update member lists
- Best practice: namespace by community (`/community/:id`)

### API Patterns
- Geolocation caching: Map-based TTL (1 hour) in memory or Redis
- JustWatch caching: Store platform results by title+country
- External anime API: Call once, cache results, sync with local DB

### Search Functionality
- `GET /api/anime/search?query=naruto` - hit external API or local DB
- Filter by: category, rating, platform availability, language

### Community Permissions Model
- Each role has a permissions array: `['kick', 'deleteMsg', 'mute', 'manageRoles']`
- Channels have role-based access control
- Admin can override all permissions

## Development Workflow

### Running Locally
1. **Backend**: `cd server && npm install && npm start` (runs on port 5000)
2. **Frontend**: `cd client && npm install && npm start` (runs on port 3000)
3. **Database**: MongoDB should be running locally (mongodb://localhost:27017/ianime)

### Environment Setup
- Create `.env` in server root with: DATABASE_URL, JWT_SECRET, IPINFO_TOKEN, JUSTWATCH_API_KEY
- Frontend proxies to `http://localhost:5000` (configure in package.json proxy or setupProxy.js)

### Key Files to Know
- `server/index.js` - Express app setup, Socket.io handler, JustWatch endpoint
- `client/src/App.js` - Router with main routes and component layout
- Database initialization (to be created): `server/db/seed.js` or `server/models/index.js`

## Conventions & Notes

- Language: Italian UI labels, English code comments
- Currency: USD ($) for premium subscriptions
- Timestamps: Always ISO 8601 format with UTC
- Usernames: Alphanumeric only, max 20 chars, case-insensitive uniqueness
- Community names: Case-sensitive uniqueness within user's scope
- Channels: Max 10 members per voice channel
- Messages: Support emoji, @mentions, markdown formatting
- Soft deletes: Use `deletedAt` flag instead of hard deletion for audit trail
