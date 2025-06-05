# RealChat Backend

High-performance Elixir backend for real-time messaging.

## Prerequisites

1. Install Elixir and Erlang:
   - Windows: Download from https://elixir-lang.org/install.html#windows
   - Or use Chocolatey: `choco install elixir`

2. Install required databases:
   - ScyllaDB: https://www.scylladb.com/download/
   - Redis: https://redis.io/download
   - PostgreSQL: https://www.postgresql.org/download/

## Setup

```bash
# Install dependencies
mix deps.get

# Create databases
mix ecto.create

# Run migrations
mix ecto.migrate

# Start the server
mix run --no-halt
```

## Architecture

### Supervision Tree
```
RealChat.Application
├── RealChat.Repo (PostgreSQL)
├── RealChat.ScyllaRepo (ScyllaDB)
├── RealChat.RedisPool (Redis)
├── RealChat.UserSupervisor
│   └── RealChat.UserServer (per user)
├── RealChat.ChatSupervisor
│   └── RealChat.ChatServer (per chat room)
├── RealChat.PresenceTracker
├── RealChat.MessageQueue
└── RealChatWeb.Endpoint (Cowboy HTTP/WebSocket)
```

### GenServer Architecture

- **UserServer**: Manages user sessions, presence, typing indicators
- **ChatServer**: Handles message routing, delivery receipts, group management
- **PresenceTracker**: Tracks online users across cluster nodes
- **MessageQueue**: Handles message persistence and delivery guarantees

### Database Schema

#### PostgreSQL (User Data)
- users: authentication, profiles
- user_sessions: active sessions
- user_devices: push notification tokens

#### ScyllaDB (Messages)
- messages: optimized for time-series queries
- message_receipts: delivery status tracking
- chat_participants: room membership

#### Redis (Ephemeral Data)
- typing indicators
- online presence
- message cache

## Performance Features

- **Sub-100ms messaging**: Direct GenServer routing
- **Horizontal scaling**: Elixir clustering with Phoenix.PubSub
- **Fault tolerance**: OTP supervision trees
- **Backpressure**: Message queuing with priority
- **Deduplication**: Idempotent message IDs
