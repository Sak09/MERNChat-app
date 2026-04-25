# ChatApp — Full-Stack Real-Time Messaging

A production-ready, scalable real-time chat application with offline support, infinite scroll pagination, and a complete message delivery pipeline.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js 14)                │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────┐  │
│  │ Auth     │  │ Chat     │  │ Redux    │  │ Socket.io │  │
│  │ Pages    │  │ Components│  │ Store    │  │ Client    │  │
│  └──────────┘  └──────────┘  └──────────┘  └───────────┘  │
│                       ↕ HTTP + WebSocket                    │
└─────────────────────────────────────────────────────────────┘
                         ↕
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (Node.js / Express)              │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────┐  │
│  │ Routes   │  │Controllers│  │ Services │  │  Socket   │  │
│  │ /auth    │  │ Auth     │  │ Auth     │  │  Service  │  │
│  │ /conv    │  │ Messages │  │ Messages │  │ (Socket.io│  │
│  │ /users   │  │ Convs    │  │ Convs    │  │ + Redis   │  │
│  └──────────┘  └──────────┘  └──────────┘  │  Pub/Sub) │  │
│                                             └───────────┘  │
│                    ↕ Bull Queue                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │            Message Processing Queue                 │   │
│  │  Send → Save to MongoDB → ACK → Emit via Socket    │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
         ↕                              ↕
┌─────────────┐               ┌─────────────────┐
│  MongoDB    │               │  Redis          │
│  - Users    │               │  - Online users │
│  - Messages │               │  - User cache   │
│  - Convs    │               │  - Bull queues  │
└─────────────┘               └─────────────────┘
```

---

## Message Flow

```
User types message
      ↓
Optimistic UI update (instant display with "pending" status)
      ↓
IndexedDB save (offline safety net)
      ↓
Online? → Send via Socket.io → Bull Queue → MongoDB save
Offline? → Stay in IndexedDB queue
      ↓
Server processes message → Emits to conversation room
      ↓
Sender receives ACK → Status updated: pending → delivered
      ↓
Recipient opens chat → Status updated: delivered → read
```

---

## Offline Queue Flow

```
navigator.onLine === false
      ↓
Message saved to IndexedDB (persists across refreshes)
      ↓
window.addEventListener('online') fires
      ↓
flushOfflineQueue() dispatched from Redux
      ↓
Each pending message sent via HTTP API
      ↓
On success → removed from IndexedDB
```

---

## Infinite Scroll (Pagination)

```
Initial load: GET /conversations/:id/messages (last 20, no cursor)
      ↓
User scrolls to top → scrollTop <= 100px threshold
      ↓
GET /conversations/:id/messages?cursor=<ISO timestamp>
      ↓
MongoDB: { createdAt: { $lt: cursor } }.sort(-createdAt).limit(21)
      ↓
Prepend older messages to Redux state
      ↓
Restore scroll position (no jarring jump)
```

---

## Tech Stack

| Layer       | Technology                              |
|-------------|----------------------------------------|
| Frontend    | Next.js 14, TypeScript, Tailwind CSS   |
| State       | Redux Toolkit + RTK                    |
| Real-time   | Socket.io (WebSocket + polling)        |
| Backend     | Node.js, Express.js (MVC)             |
| Database    | MongoDB + Mongoose                     |
| Cache       | Redis (ioredis)                        |
| Queue       | Bull (Redis-backed job queue)          |
| Auth        | JWT (access + refresh token rotation)  |
| Offline DB  | IndexedDB (via `idb`)                  |
| Containers  | Docker + Docker Compose                |

---

## Project Structure

```
chat-app/
├── backend/
│   ├── config/
│   │   ├── database.js          # MongoDB connection
│   │   └── redis.js             # Redis client factory
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── conversationController.js
│   │   ├── messageController.js
│   │   └── userController.js
│   ├── middleware/
│   │   ├── auth.js              # JWT + socket auth
│   │   ├── errorHandler.js      # Global error handler
│   │   └── rateLimiter.js       # express-rate-limit
│   ├── models/
│   │   ├── User.js
│   │   ├── Message.js
│   │   └── Conversation.js
│   ├── queues/
│   │   └── messageQueue.js      # Bull queue definitions
│   ├── routes/
│   │   ├── auth.js
│   │   ├── conversations.js
│   │   ├── messages.js
│   │   └── users.js
│   ├── services/
│   │   ├── authService.js
│   │   ├── conversationService.js
│   │   ├── messageService.js
│   │   └── socketService.js     # Socket.io setup
│   ├── utils/
│   │   ├── logger.js            # Winston logger
│   │   └── response.js          # Standardized responses
│   └── server.js                # Entry point
│
└── frontend/
    ├── app/
    │   ├── globals.css
    │   ├── layout.tsx
    │   ├── page.tsx             # Home → ChatLayout
    │   ├── login/page.tsx
    │   └── register/page.tsx
    ├── components/
    │   ├── AuthGuard.tsx        # Protected route wrapper
    │   ├── Providers.tsx        # Redux Provider
    │   └── chat/
    │       ├── ChatLayout.tsx   # Root chat layout
    │       ├── ChatWindow.tsx   # Message list + scroll
    │       ├── ChatHeader.tsx   # Conversation header
    │       ├── Sidebar.tsx      # Conversation list
    │       ├── MessageBubble.tsx
    │       ├── MessageInput.tsx
    │       ├── TypingIndicator.tsx
    │       └── EmptyState.tsx
    ├── hooks/
    │   ├── useAppDispatch.ts    # Typed Redux hooks
    │   ├── useSocket.ts         # Socket lifecycle
    │   ├── useInfiniteScroll.ts # Scroll-up pagination
    │   └── useTyping.ts         # Debounced typing events
    ├── lib/
    │   ├── api.ts               # Axios + token refresh
    │   ├── socket.ts            # Socket.io singleton
    │   └── indexedDB.ts         # Offline queue + cache
    ├── store/
    │   ├── index.ts
    │   └── slices/
    │       ├── authSlice.ts
    │       ├── messagesSlice.ts # Optimistic updates
    │       ├── conversationsSlice.ts
    │       └── uiSlice.ts       # Online/typing state
    └── types/index.ts
```

---

## Getting Started

### Prerequisites
- Node.js 20+
- Docker & Docker Compose (for MongoDB + Redis)
- npm or yarn

### 1. Start Infrastructure

```bash
# Start MongoDB and Redis only
docker-compose up mongodb redis -d
```

### 2. Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env with your values
npm install
npm run dev
```

### 3. Frontend Setup

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```

App is now running:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- Health check: http://localhost:5000/health

### 4. Full Docker Deploy

```bash
# From root
docker-compose up --build
```

---

## Key Features

### Authentication
- Register / Login with email + password
- JWT access tokens (7d) + refresh tokens (30d) with HTTP-only cookies
- Automatic token refresh on 401 via Axios interceptor
- Token rotation on refresh
- Redis-cached user sessions

### Real-time Messaging
- Socket.io with WebSocket + polling fallback
- Message delivery pipeline: pending → sent → delivered → read
- Visual status icons per message
- Online/offline presence indicators
- Typing indicators with 2s debounce

### Offline Queue
- Messages saved to IndexedDB when offline
- `window.online` event auto-flushes the queue
- Toast notifications for offline/online state changes
- Optimistic UI — messages appear instantly, update on ACK

### Infinite Scroll Pagination
- Loads last 20 messages on conversation open
- Scroll-to-top triggers fetch of next 20 older messages
- Cursor-based pagination (ISO timestamp, no page numbers)
- Scroll position restored after loading older messages

### Scalability
- Bull job queue decouples message receipt from processing
- Redis caches user sessions (1hr TTL)
- MongoDB compound indexes on `(conversationId, createdAt)`
- Rate limiting: 10 auth attempts / 15min, 60 messages / min
- Graceful shutdown with queue draining

---

## API Reference

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | Login |
| POST | /api/auth/logout | Logout |
| POST | /api/auth/refresh | Refresh access token |
| GET  | /api/auth/me | Get current user |

### Conversations
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/conversations | List user conversations |
| GET | /api/conversations/direct/:userId | Get or create DM |
| POST | /api/conversations/group | Create group |
| GET | /api/conversations/:id | Get conversation |

### Messages
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/conversations/:id/messages | Get paginated messages |
| POST | /api/conversations/:id/messages | Send message (queued) |
| DELETE | /api/conversations/:id/messages/:msgId | Soft delete message |
| PATCH | /api/conversations/:id/messages/read | Mark as read |

### Users
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/users/search?q= | Search users |
| GET | /api/users/:id | Get user profile |
| PATCH | /api/users/profile | Update profile |

### WebSocket Events
| Event | Direction | Description |
|-------|-----------|-------------|
| conversation:join | Client → Server | Join a room |
| message:send | Client → Server | Send message via socket |
| message:new | Server → Client | New message broadcast |
| message:ack | Server → Client | Delivery confirmation |
| message:read | Bidirectional | Read receipt |
| typing:start / typing:stop | Bidirectional | Typing indicators |
| user:online / user:offline | Server → Client | Presence updates |

---

## Environment Variables

### Backend (.env)
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/chatapp
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=<strong random string>
JWT_REFRESH_SECRET=<different strong random string>
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:3000
BCRYPT_ROUNDS=12
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:5000
```
