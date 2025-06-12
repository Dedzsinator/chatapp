import Config

# Configure Ecto repositories
config :real_chat, ecto_repos: [RealChat.Repo]

# Configure your database
config :real_chat, RealChat.Repo,
  username: System.get_env("DB_USERNAME", "postgres"),
  password: System.get_env("DB_PASSWORD", "postgres"),
  hostname: System.get_env("DB_HOSTNAME", "localhost"),
  database: System.get_env("DB_NAME", "realchat_dev"),
  stacktrace: true,
  show_sensitive_data_on_connection_error: true,
  pool_size: String.to_integer(System.get_env("DB_POOL_SIZE", "10"))

# Configure ScyllaDB
config :real_chat, :scylla_hosts, [
  System.get_env("SCYLLA_HOST", "127.0.0.1:9042")
]

# Configure Redis
config :real_chat, :redis,
  host: System.get_env("REDIS_HOST", "localhost"),
  port: String.to_integer(System.get_env("REDIS_PORT", "6379")),
  database: String.to_integer(System.get_env("REDIS_DB", "0"))

# Configure PubSub
config :real_chat, RealChat.PubSub,
  name: RealChat.PubSub,
  adapter: Phoenix.PubSub.PG2

# Configure endpoint
config :real_chat, :port, String.to_integer(System.get_env("PORT", "4000"))

# Configure CORS
config :real_chat, :cors_origins, [
  "http://localhost:3000",
  "http://localhost:19006",
  "capacitor://localhost",
  "ionic://localhost"
]

# Configure Guardian for JWT
config :real_chat, RealChat.Guardian,
  issuer: "RealChat",
  secret_key: System.get_env("GUARDIAN_SECRET_KEY", "your-secret-key-here"),
  token_ttl: %{
    "access" => {1, :hour},
    "refresh" => {30, :days}
  }

# Configure Argon2
config :argon2_elixir,
  t_cost: 3,
  m_cost: 17,
  parallelism: 4

# Configure logger
config :logger, :console,
  format: "$time $metadata[$level] $message\n",
  metadata: [:request_id, :user_id]

# Configure telemetry metrics
config :real_chat, :telemetry_metrics, [
  # WebSocket metrics
  {:counter, "real_chat.websocket.connections.total"},
  {:counter, "real_chat.websocket.messages.total"},

  # Message queue metrics
  {:last_value, "real_chat.message_queue.size"},
  {:counter, "real_chat.messages.sent.total"},
  {:counter, "real_chat.messages.delivered.total"},

  # Database metrics
  {:summary, "real_chat.database.query.duration", [unit: {:native, :millisecond}]},

  # HTTP metrics
  {:summary, "real_chat.http.request.duration", [unit: {:native, :millisecond}]}
]

# AI Features (optional)
config :real_chat, :ai_features,
  enabled: System.get_env("AI_FEATURES_ENABLED", "false") == "true",
  qdrant_url: System.get_env("QDRANT_URL", "http://localhost:6333"),
  openai_api_key: System.get_env("OPENAI_API_KEY")

# Push notifications
config :real_chat, :push_notifications,
  fcm_server_key: System.get_env("FCM_SERVER_KEY"),
  apns_key_id: System.get_env("APNS_KEY_ID"),
  apns_team_id: System.get_env("APNS_TEAM_ID"),
  apns_private_key: System.get_env("APNS_PRIVATE_KEY")

# Import environment specific config
import_config "#{config_env()}.exs"
