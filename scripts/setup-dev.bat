@echo off
echo 🚀 Setting up RealChat development environment...

REM Check if Docker is installed
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker is not installed. Please install Docker first.
    exit /b 1
)

REM Check if Docker Compose is installed
docker-compose --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker Compose is not installed. Please install Docker Compose first.
    exit /b 1
)

REM Create environment files if they don't exist
if not exist "backend\.env" (
    echo 📝 Creating backend environment file...
    copy "backend\.env.example" "backend\.env"
)

if not exist "frontend\.env.local" (
    echo 📝 Creating frontend environment file...
    echo REACT_APP_API_URL=http://localhost:4000/api > frontend\.env.local
    echo REACT_APP_WS_URL=ws://localhost:4000/socket >> frontend\.env.local
)

REM Start infrastructure services
echo 🐳 Starting infrastructure services...
cd infrastructure\docker
docker-compose up -d postgres scylla redis

REM Wait for services to be ready
echo ⏳ Waiting for services to be ready...
timeout /t 30 /nobreak

REM Install backend dependencies
echo 📦 Installing backend dependencies...
cd ..\..\backend
mix local.hex --force
mix local.rebar --force
mix deps.get

REM Setup database
echo 🗄️ Setting up database...
mix ecto.create
mix ecto.migrate

REM Install frontend dependencies
echo 📦 Installing frontend dependencies...
cd ..\frontend
npm install

echo ✅ Development environment setup complete!
echo.
echo To start the development servers:
echo   Backend:  cd backend && mix phx.server
echo   Frontend: cd frontend && npm start
echo.
echo To stop infrastructure services:
echo   cd infrastructure\docker && docker-compose down

pause
