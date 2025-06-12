# RealChat - High-Performance Messaging Application

## 🏗️ System Architecture

This is a WhatsApp/Discord-like messaging application built for maximum performance, real-time communication, and fault tolerance.

### Tech Stack
- **Backend**: Elixir with OTP, Plug/Cowboy (no Phoenix)
- **Frontend**: React Native + Expo (Web, Mobile, Desktop)
- **Databases**: 
  - ScyllaDB for messages (high throughput)
  - Redis for ephemeral events
  - PostgreSQL for user accounts
  - Qdrant for vector search (optional AI features)

### 📁 Project Structure
```
chatapp/
├── backend/                    # Elixir backend
│   ├── apps/
│   │   ├── real_chat/         # Core application logic
│   │   ├── real_chat_web/     # Web interface (Plug/Cowboy)
│   │   └── real_chat_db/      # Database adapters
│   ├── config/
│   ├── rel/                   # Release configuration
│   └── mix.exs
├── frontend/                   # React Native + Web + Desktop
│   ├── src/
│   │   ├── components/
│   │   ├── screens/
│   │   ├── services/
│   │   ├── hooks/
│   │   └── utils/
│   ├── web/                   # Web-specific files
│   ├── electron/              # Desktop-specific files
│   └── package.json
├── infrastructure/            # Docker, K8s, CI/CD
│   ├── docker/
│   ├── k8s/
│   └── terraform/
└── docs/                     # Documentation
```

### 🔧 Core Features
- ✅ Real-time messaging with WebSockets
- ✅ Message delivery receipts (sent/delivered/read)
- ✅ Presence detection (online/typing)
- ✅ Group chats and 1:1 messaging
- ✅ User authentication (email + phone)
- ✅ End-to-end encryption hooks
- ✅ Message search (basic + semantic)
- ✅ Push notifications
- ✅ AI-powered smart replies

### 🚀 Performance Features
- Sub-100ms message delivery
- Horizontal scaling with Elixir clustering
- Fault-tolerant supervision trees
- Optimistic UI updates
- Message deduplication
- Backpressure handling

## Quick Start

### Backend
```bash
cd backend
mix deps.get
mix ecto.create
mix phx.server
```

### Frontend
```bash
cd frontend
npm install
npm run web      # Web version
npm run ios      # iOS
npm run android  # Android
npm run electron # Desktop
```

### start postgres
```bash
sudo systemctl start postgresql
```

## Dependencies
- **Backend**: 
  - Elixir 1.14+
  - ScyllaDB
  - Redis
  - PostgreSQL
  - Qdrant (optional)

## Development

See individual README files in backend/ and frontend/ directories for detailed setup instructions.
