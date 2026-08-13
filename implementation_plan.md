# Signal Clone — Full-Stack Implementation Plan

## Overview
Build a functional Signal Messenger clone with:
- **Frontend**: Next.js 14 (TypeScript, App Router)
- **Backend**: Python FastAPI with SQLite
- **Real-time**: WebSockets (FastAPI native)
- **Auth**: JWT-based session persistence with mocked phone OTP

---

## Architecture Overview

```
signal-clone/
├── frontend/          # Next.js 14 TypeScript app
│   ├── app/           # App router pages
│   ├── components/    # UI components
│   ├── hooks/         # Custom React hooks
│   ├── lib/           # API client, WebSocket client, utils
│   └── types/         # TypeScript interfaces
└── backend/           # FastAPI Python app
    ├── main.py
    ├── routers/       # Auth, users, conversations, messages, groups
    ├── models.py      # SQLAlchemy ORM models
    ├── schemas.py     # Pydantic schemas
    ├── database.py    # DB setup + seed
    ├── auth.py        # JWT logic
    ├── websocket_manager.py
    └── seed.py        # Seed data
```

---

## Database Schema

### users
| Field | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| phone_number | TEXT UNIQUE | |
| username | TEXT UNIQUE | |
| display_name | TEXT | |
| avatar_url | TEXT | |
| bio | TEXT | |
| is_online | BOOLEAN | |
| last_seen | DATETIME | |
| created_at | DATETIME | |
| password_hash | TEXT | |

### conversations
| Field | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| is_group | BOOLEAN | |
| group_name | TEXT | nullable |
| group_avatar | TEXT | nullable |
| created_at | DATETIME | |
| created_by | INTEGER FK users | |

### conversation_members
| Field | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| conversation_id | INTEGER FK | |
| user_id | INTEGER FK | |
| is_admin | BOOLEAN | |
| joined_at | DATETIME | |

### messages
| Field | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| conversation_id | INTEGER FK | |
| sender_id | INTEGER FK | |
| content | TEXT | |
| message_type | TEXT | text/image/file |
| status | TEXT | sending/sent/delivered/read |
| reply_to_id | INTEGER FK | self-ref, nullable |
| is_deleted | BOOLEAN | |
| disappears_at | DATETIME | nullable |
| created_at | DATETIME | |
| edited_at | DATETIME | nullable |

### message_receipts
| Field | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| message_id | INTEGER FK | |
| user_id | INTEGER FK | |
| status | TEXT | delivered/read |
| updated_at | DATETIME | |

### message_reactions
| Field | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| message_id | INTEGER FK | |
| user_id | INTEGER FK | |
| emoji | TEXT | |
| created_at | DATETIME | |

### contacts
| Field | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| owner_id | INTEGER FK users | |
| contact_id | INTEGER FK users | |
| nickname | TEXT | nullable |
| created_at | DATETIME | |

---

## API Endpoints

### Auth
- `POST /auth/register` — Register with phone+username, returns mocked OTP
- `POST /auth/verify-otp` — Verify OTP, get JWT token
- `POST /auth/login` — Login existing user
- `POST /auth/logout`
- `GET /auth/me` — Current user profile

### Users
- `GET /users/search?q=` — Search users
- `GET /users/{id}` — Get user profile
- `PATCH /users/me` — Update profile
- `POST /users/me/avatar` — Upload avatar

### Contacts
- `GET /contacts` — List my contacts
- `POST /contacts` — Add contact
- `DELETE /contacts/{id}` — Remove contact

### Conversations
- `GET /conversations` — List all my conversations
- `POST /conversations` — Create DM or group
- `GET /conversations/{id}` — Get conversation details
- `GET /conversations/{id}/messages` — Paginated messages
- `POST /conversations/{id}/members` — Add members (group)
- `DELETE /conversations/{id}/members/{user_id}` — Remove member

### Messages
- `POST /conversations/{id}/messages` — Send message
- `PATCH /messages/{id}` — Edit message
- `DELETE /messages/{id}` — Delete message
- `POST /messages/{id}/reactions` — Add reaction
- `POST /messages/{id}/read` — Mark as read

### WebSocket
- `WS /ws/{user_id}` — Real-time channel per user

---

## Frontend Pages & Components

### Pages (App Router)
- `/` → redirects to `/auth` or `/conversations`
- `/auth` → Onboarding/register/login
- `/conversations` → Main layout (conversation list + chat pane)
- `/conversations/[id]` → Active conversation
- `/settings` → Settings placeholder pages

### Key Components
- `Sidebar` — Left panel: search bar, conversation list
- `ConversationItem` — Preview card with avatar, name, last message, unread badge
- `ChatPane` — Right panel: message thread + input
- `MessageBubble` — Individual message with status indicators, reactions
- `TypingIndicator` — Animated dots
- `MessageInput` — Rich text input with emoji, attachments, reply-to
- `NewConversationModal` — Start DM or create group
- `GroupInfoModal` — Members, admin controls
- `ProfileModal` — User profile view
- `SettingsPanel` — Placeholder settings tabs

---

## Real-Time WebSocket Events

```json
// Client → Server
{ "type": "message", "conversation_id": 1, "content": "Hello" }
{ "type": "typing", "conversation_id": 1, "is_typing": true }
{ "type": "read", "conversation_id": 1, "message_id": 42 }

// Server → Client (broadcast)
{ "type": "new_message", "message": { ... } }
{ "type": "typing", "conversation_id": 1, "user_id": 2, "is_typing": true }
{ "type": "message_status", "message_id": 42, "status": "read", "user_id": 2 }
{ "type": "user_presence", "user_id": 2, "is_online": true }
```

---

## Proposed Changes

### Backend

#### [NEW] backend/requirements.txt
#### [NEW] backend/main.py — FastAPI app with CORS, routers, WebSocket
#### [NEW] backend/database.py — SQLAlchemy setup, SQLite
#### [NEW] backend/models.py — ORM models
#### [NEW] backend/schemas.py — Pydantic request/response schemas
#### [NEW] backend/auth.py — JWT generation, password hashing
#### [NEW] backend/websocket_manager.py — Connection manager
#### [NEW] backend/seed.py — 5+ users, conversations, messages
#### [NEW] backend/routers/auth.py
#### [NEW] backend/routers/users.py
#### [NEW] backend/routers/contacts.py
#### [NEW] backend/routers/conversations.py
#### [NEW] backend/routers/messages.py

### Frontend

#### [NEW] frontend/ — Next.js 14 TypeScript app
- Complete Signal-identical UI with dark/light mode
- WebSocket hook for real-time updates
- Full auth flow with phone number + OTP
- Conversation list, chat pane, settings

---

## Verification Plan

### Automated
- Backend: `uvicorn main:app` starts without errors
- Frontend: `npm run dev` compiles without TypeScript errors
- Seed: database is pre-populated with test data

### Manual
1. Register new user with phone number → get mocked OTP → verify → land on main view
2. See seeded conversations and messages on first load
3. Open a conversation → messages load with correct styling
4. Send a message → appears instantly via WebSocket
5. Open second browser tab with different user → observe real-time delivery
6. Create a group → add members → send group message
7. Typing indicator visible to other user
8. Read receipts update correctly
9. Settings page loads with all placeholder tabs
10. Dark mode toggle works
