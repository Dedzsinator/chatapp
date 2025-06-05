import Config

# Database configuration for development
config :real_chat, RealChat.Repo,
  username: "postgres",
  password: "postgres",
  hostname: "localhost",
  database: "realchat_dev",
  stacktrace: true,
  show_sensitive_data_on_connection_error: true,
  pool_size: 10

# Enable dev routes for dashboard and mailbox
config :real_chat, dev_routes: true

# Do not include metadata nor timestamps in development logs
config :logger, :console, format: "[$level] $message\n"

# Set a higher stacktrace during development
config :phoenix, :stacktrace_depth, 20

# Initialize plugs at runtime for faster development compilation
config :phoenix, :plug_init_mode, :runtime

# Disable SSL in development
config :real_chat, :ssl, false

# Configure Guardian secret for development
config :real_chat, RealChat.Guardian,
  secret_key: "dev-secret-key-change-in-production"
