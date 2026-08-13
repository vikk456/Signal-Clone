# Signal Clone — Full-Stack Messaging Platform

A feature-complete clone of the Signal messaging application built with Next.js (TypeScript) and FastAPI (Python). Replicates Signal's core UX: real-time messaging, group chats, message reactions, typing indicators, read receipts, and the privacy-focused Signal aesthetic.

---

## 🚀 Live Demo

> **Demo credentials:** username `alice`, `bob`, `carol`, `david`, `emma` — password `password123`

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 16 (TypeScript, App Router) |
| **Styling** | Vanilla CSS with CSS custom properties (design tokens) |
| **Backend** | Python 3.10 · FastAPI 0.111 |
| **Database** | SQLite via SQLAlchemy ORM |
| **Real-time** | WebSockets (FastAPI native) |
| **Auth** | JWT (python-jose) · bcrypt password hashing |
| **Avatar** | DiceBear API · base64 uploads |

---

## 📁 Project Structure

```
signal-clone/
├── frontend/                    # Next.js 16 TypeScript application
│   └── src/
│       ├── app/
│       │   ├── auth/page.tsx    # Login + Register + OTP flow
│       │   ├── conversations/page.tsx  # Main chat layout (sidebar + pane)
│       │   └── settings/page.tsx       # Settings (profile, privacy, etc.)
│       ├── components/
│       │   ├── Avatar.tsx            # User avatar with online dot
│       │   ├── ChatPane.tsx          # Right-side chat panel
│       │   ├── ConversationItem.tsx  # Sidebar conversation row
│       │   ├── GroupInfoModal.tsx    # Group settings + member management
│       │   ├── MessageBubble.tsx     # Individual message with actions
│       │   ├── MessageInput.tsx      # Rich input with emoji + reply
│       │   ├── NewConversationModal.tsx # Create DM or group
│       │   ├── ProfileModal.tsx      # User profile viewer
│       │   └── TypingIndicator.tsx   # Animated "..." bubble
│       ├── hooks/
│       │   └── useWebSocket.ts      # WS connection with auto-reconnect
│       ├── lib/
│       │   └── api.ts               # Typed API client (fetch wrapper)
│       └── types/
│           └── index.ts             # TypeScript interfaces
│
└── backend/                     # FastAPI Python application
    ├── main.py                  # App entry point, CORS, startup seed
    ├── models.py                # SQLAlchemy ORM models
    ├── schemas.py               # Pydantic request/response schemas
    ├── database.py              # SQLite engine + session factory
    ├── auth.py                  # JWT generation, bcrypt, OAuth2
    ├── websocket_manager.py     # Multi-tab connection manager
    ├── seed.py                  # Demo data population
    └── routers/
        ├── auth.py              # /auth/* — register, OTP, login, me
        ├── users.py             # /users/* — search, profile, avatar
        ├── contacts.py          # /contacts/* — add/list/remove
        ├── conversations.py     # /conversations/* — list, create, members, messages
        └── messages.py          # /messages/* — send, edit, delete, react, read
```

---

## 🗄️ Database Schema

```
users
  id, phone_number (UNIQUE), username (UNIQUE), display_name,
  avatar_url, bio, is_online, last_seen, created_at, password_hash

conversations
  id, is_group, group_name, group_avatar, group_description,
  created_at, created_by (FK → users)

conversation_members
  id, conversation_id (FK), user_id (FK), is_admin,
  joined_at, muted_until, last_read_message_id
  UNIQUE (conversation_id, user_id)

messages
  id, conversation_id (FK), sender_id (FK), content, message_type,
  status (sending/sent/delivered/read), reply_to_id (FK self),
  is_deleted, disappears_at, created_at, edited_at

message_receipts
  id, message_id (FK), user_id (FK), status, updated_at
  UNIQUE (message_id, user_id)

message_reactions
  id, message_id (FK), user_id (FK), emoji, created_at
  UNIQUE (message_id, user_id)   -- one reaction per user per message; toggled on repeat

contacts
  id, owner_id (FK), contact_id (FK), nickname, created_at
  UNIQUE (owner_id, contact_id)
```

---

## 🔌 API Overview

### Auth  `/auth`
| Method | Path | Description |
|---|---|---|
| POST | `/auth/register` | Submit phone + username → returns mocked OTP hint |
| POST | `/auth/verify-otp` | Verify OTP (always `123456`) → create account + JWT |
| POST | `/auth/login` | Login with username/phone + password → JWT |
| POST | `/auth/logout` | Server-side logout (client deletes token) |
| GET | `/auth/me` | Current user profile |

### Users  `/users`
| Method | Path | Description |
|---|---|---|
| GET | `/users/search?q=` | Search users by name/username |
| GET | `/users/{id}` | Get a user's public profile |
| PATCH | `/users/me` | Update display name, bio |
| POST | `/users/me/avatar` | Upload avatar image (multipart) |

### Contacts  `/contacts`
| Method | Path | Description |
|---|---|---|
| GET | `/contacts` | List my contacts |
| POST | `/contacts` | Add a contact `{contact_id, nickname?}` |
| DELETE | `/contacts/{id}` | Remove a contact |

### Conversations  `/conversations`
| Method | Path | Description |
|---|---|---|
| GET | `/conversations` | List all my conversations (sorted by activity) |
| POST | `/conversations` | Create DM or group |
| GET | `/conversations/{id}` | Get conversation + members |
| GET | `/conversations/{id}/messages` | Paginated messages (`?before_id=` for scroll) |
| POST | `/conversations/{id}/members` | Add members to group (admin only) |
| DELETE | `/conversations/{id}/members/{uid}` | Remove member (admin only) |

### Messages  `/messages`
| Method | Path | Description |
|---|---|---|
| POST | `/conversations/{id}/messages` | Send a message |
| PATCH | `/messages/{id}` | Edit own message |
| DELETE | `/messages/{id}` | Soft-delete own message |
| POST | `/messages/{id}/reactions` | Toggle emoji reaction |
| POST | `/messages/{id}/read` | Mark as read (updates receipt + notifies sender) |

### WebSocket  `/ws/{user_id}?token=JWT`

**Client → Server:**
```json
{ "type": "typing", "conversation_id": 1, "is_typing": true }
{ "type": "ping" }
```

**Server → Client (broadcast):**
```json
{ "type": "new_message", "message": { ...MessageOut } }
{ "type": "typing", "conversation_id": 1, "user_id": 2, "is_typing": true }
{ "type": "message_status", "message_id": 42, "status": "read", "user_id": 2, "conversation_id": 1 }
{ "type": "message_edited", "message_id": 42, "content": "...", "conversation_id": 1, "edited_at": "..." }
{ "type": "message_deleted", "message_id": 42, "conversation_id": 1 }
{ "type": "message_reaction", "message_id": 42, "conversation_id": 1, "user_id": 2, "emoji": "❤️" }
{ "type": "user_presence", "user_id": 2, "is_online": true }
{ "type": "pong" }
```

---

## ⚙️ Setup Instructions

### Prerequisites
- **Python** 3.10+
- **Node.js** 18+
- **npm** or equivalent

### 1. Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

The backend auto-seeds the database on first startup with 7 users, DM conversations, group chats, and realistic message history.

**Backend runs at:** `http://localhost:8000`  
**API docs:** `http://localhost:8000/docs`

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

**Frontend runs at:** `http://localhost:3000`

---

## ✅ Features Implemented

### Core (All Complete)
- [x] **Authentication** — Register with phone+username, mocked OTP (`123456`), JWT sessions (7-day), login/logout
- [x] **Conversation List** — Sidebar with DMs + groups, sorted by activity, unread badges, last message preview
- [x] **Search** — Filter conversations by name/username
- [x] **Direct Messaging** — Real-time 1:1 messages via WebSocket
- [x] **Group Messaging** — Create groups, add/remove members, admin controls
- [x] **Message Status** — Sending (○) → Sent (✓) → Read (✓✓ blue)
- [x] **Typing Indicators** — Animated dots broadcast via WebSocket
- [x] **Read Receipts** — Per-user receipt tracking with DB persistence
- [x] **Online/Offline Presence** — Real-time presence broadcast to contacts
- [x] **Settings Page** — Profile edit, privacy toggles, appearance, placeholder sections
- [x] **Dark / Light Mode** — Full theme switching with CSS variables
- [x] **Message Persistence** — All messages stored in SQLite

### Bonus Features
- [x] **Message Reactions** — 6 quick emoji reactions, toggle on/off, grouped count display
- [x] **Reply-to** — Quote messages with preview strip in bubble
- [x] **Edit Messages** — In-place edit with "edited" label
- [x] **Delete Messages** — Soft delete ("This message was deleted")
- [x] **Infinite Scroll** — Load older messages on scroll-up
- [x] **Optimistic UI** — Messages appear instantly, replaced with confirmed data
- [x] **Avatar Upload** — Upload custom profile pictures (base64/multipart)
- [x] **Group Info Modal** — View members, admin controls (add/remove)
- [x] **Profile Modal** — Click any user avatar to view profile + start chat
- [x] **WS Auto-reconnect** — Reconnects automatically on disconnect

### Mocked / Placeholder
- [ ] Voice / Video calls (UI buttons present, "Coming Soon")
- [ ] Stories section (placeholder tab in settings)
- [ ] Linked devices (placeholder)
- [ ] Real E2E encryption (mocked — OTP is always `123456`)

---

## 🎭 Demo Accounts

All seeded with password `password123`:

| Username | Display Name | Bio |
|---|---|---|
| `alice` | Alice Johnson | Privacy advocate, Signal evangelist |
| `bob` | Bob Martinez | Software engineer, coffee addict |
| `carol` | Carol Chen | Designer & creative thinker |
| `david` | David Kim | DevOps \| Cloud \| Linux |
| `emma` | Emma Wilson | Product Manager at TechCorp |
| `frank` | Frank Brown | Security researcher & hacker |
| `grace` | Grace Lee | Data scientist & ML enthusiast |

Pre-seeded conversations include DM threads between all users and two group chats: **"Engineering Team"** and **"Lunch Crew"**.

---

## 🏗️ Architecture Decisions

1. **SQLite** — Chosen for zero-configuration local dev. Schema uses proper foreign keys, unique constraints, and indexed columns. Can be swapped to PostgreSQL by changing the `DATABASE_URL`.

2. **WebSocket per-user model** — Each authenticated user maintains a persistent WS connection. The `ConnectionManager` supports multiple simultaneous tabs per user (`Dict[user_id → Set[WebSocket]]`).

3. **Optimistic UI** — Messages appear instantly with a temp ID and are replaced with the real DB record on API confirmation. Prevents double-rendering via a `pendingTempIds` ref that intercepts the user's own WS echo.

4. **Soft deletes** — Messages set `is_deleted=True` and content replaced with "This message was deleted" to preserve thread continuity and reply references.

5. **Mocked OTP** — Always accepts `123456`. Displayed as a hint on the registration screen to remove friction during evaluation.

6. **JWT tokens** — 7-day expiry, stored in `localStorage`. The WS connection authenticates via a `?token=` query parameter validated server-side.

---

## 📝 Assumptions

- Phone verification is mocked (fixed OTP `123456`)
- End-to-end encryption is simulated (no actual crypto)
- File/image attachments use base64 encoding stored directly in the database
- SQLite is sufficient for the evaluation context; production would use PostgreSQL
