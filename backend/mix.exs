defmodule RealChat.MixProject do
  use Mix.Project

  def project do
    [
      app: :real_chat,
      version: "0.1.0",
      elixir: "~> 1.14",
      elixirc_paths: elixirc_paths(Mix.env()),
      start_permanent: Mix.env() == :prod,
      deps: deps(),
      releases: [
        real_chat: [
          applications: [real_chat: :permanent]
        ]
      ]
    ]
  end

  def application do
    [
      extra_applications: [:logger, :runtime_tools],
      mod: {RealChat.Application, []}
    ]
  end

  defp elixirc_paths(:test), do: ["lib", "test/support"]
  defp elixirc_paths(_), do: ["lib"]

  defp deps do
    [
      # Web server
      {:plug_cowboy, "~> 2.6"},
      {:plug, "~> 1.14"},
      {:cors_plug, "~> 3.0"},

      # JSON handling
      {:jason, "~> 1.4"},

      # Database
      {:ecto_sql, "~> 3.10"},
      {:postgrex, "~> 0.17"},

      # ScyllaDB driver
      {:xandra, "~> 0.16"},

      # ClickHouse for ultra-high-performance analytics
      {:httpoison, "~> 2.0"},
      {:clickhousex, "~> 0.5"},

      # Redis
      {:redix, "~> 1.2"},

      # PubSub for clustering
      {:phoenix_pubsub, "~> 2.1"},

      # Authentication
      {:guardian, "~> 2.3"},
      {:comeonin, "~> 5.3"},
      {:argon2_elixir, "~> 3.1"},

      # UUID generation
      {:ecto_ulid, "~> 0.3"},

      # Validation
      {:ecto_commons, "~> 0.3"},

      # Push notifications
      {:web_push_encryption, "~> 0.3"},

      # Vector database (for AI features)
      {:req, "~> 0.4"},

      # Performance monitoring
      {:telemetry, "~> 1.2"},
      {:telemetry_metrics, "~> 0.6"},

      # Development and testing
      {:dialyxir, "~> 1.3", only: [:dev], runtime: false},
      {:credo, "~> 1.7", only: [:dev, :test], runtime: false},
      {:ex_doc, "~> 0.30", only: :dev, runtime: false}
    ]
  end
end
