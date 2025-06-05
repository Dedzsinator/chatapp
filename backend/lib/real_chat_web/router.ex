defmodule RealChatWeb.Router do
  use RealChatWeb, :router

  pipeline :api do
    plug :accepts, ["json"]
    plug RealChatWeb.Plugs.CORS
  end

  pipeline :authenticated do
    plug RealChat.Guardian.AuthPipeline
  end

  scope "/api", RealChatWeb do
    pipe_through :api

    # Public routes
    post "/auth/register", AuthController, :register
    post "/auth/login", AuthController, :login
    post "/auth/refresh", AuthController, :refresh_token
    get "/health", HealthController, :check
  end

  scope "/api", RealChatWeb do
    pipe_through [:api, :authenticated]

    # User routes
    get "/users/me", UserController, :me
    put "/users/me", UserController, :update
    get "/users/search", UserController, :search

    # Chat routes
    get "/chats", ChatController, :index
    post "/chats", ChatController, :create
    get "/chats/:id", ChatController, :show
    put "/chats/:id", ChatController, :update
    delete "/chats/:id", ChatController, :delete

    # Chat participants
    post "/chats/:chat_id/participants", ChatParticipantController, :add
    delete "/chats/:chat_id/participants/:user_id", ChatParticipantController, :remove

    # Messages
    get "/chats/:chat_id/messages", MessageController, :index
    post "/chats/:chat_id/messages", MessageController, :create
    put "/messages/:id", MessageController, :update
    delete "/messages/:id", MessageController, :delete
    post "/messages/:id/read", MessageController, :mark_as_read

    # File upload
    post "/upload", FileController, :upload

    # Search
    get "/search/messages", SearchController, :messages
    get "/search/chats", SearchController, :chats
  end

  # Catch-all for SPA routing
  scope "/", RealChatWeb do
    get "/*path", PageController, :index
  end
end
