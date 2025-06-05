#!/bin/bash

# Development setup script

echo "🚀 Setting up RealChat development environment..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create environment files if they don't exist
if [ ! -f "backend/.env" ]; then
    echo "📝 Creating backend environment file..."
    cp backend/.env.example backend/.env
fi

if [ ! -f "frontend/.env.local" ]; then
    echo "📝 Creating frontend environment file..."
    cat > frontend/.env.local <<EOL
REACT_APP_API_URL=http://localhost:4000/api
REACT_APP_WS_URL=ws://localhost:4000/socket
EOL
fi

# Start infrastructure services
echo "🐳 Starting infrastructure services..."
cd infrastructure/docker
docker-compose up -d postgres scylla redis

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 30

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd ../../backend
mix local.hex --force
mix local.rebar --force
mix deps.get

# Setup database
echo "🗄️ Setting up database..."
mix ecto.create
mix ecto.migrate

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd ../frontend
npm install

echo "✅ Development environment setup complete!"
echo ""
echo "To start the development servers:"
echo "  Backend:  cd backend && mix phx.server"
echo "  Frontend: cd frontend && npm start"
echo ""
echo "To stop infrastructure services:"
echo "  cd infrastructure/docker && docker-compose down"
