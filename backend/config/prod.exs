import Config

# Production configuration
config :real_chat, RealChat.Repo,
  url: System.get_env("DATABASE_URL"),
  pool_size: String.to_integer(System.get_env("POOL_SIZE") || "10"),
  socket_options: [:inet6]

# Configure endpoint for production
config :real_chat, :port, String.to_integer(System.get_env("PORT") || "4000")

# Configure SSL
config :real_chat, :ssl,
  port: String.to_integer(System.get_env("SSL_PORT") || "4001"),
  cipher_suite: :strong,
  keyfile: System.get_env("SSL_KEY_PATH"),
  certfile: System.get_env("SSL_CERT_PATH"),
  transport_options: [socket_opts: [:inet6]]

# Configure Guardian secret
config :real_chat, RealChat.Guardian,
  secret_key: System.fetch_env!("GUARDIAN_SECRET_KEY")

# Configure logger level
config :logger, level: :info

# Runtime production config
if System.get_env("PHX_SERVER") do
  config :real_chat, :start_server, true
end
