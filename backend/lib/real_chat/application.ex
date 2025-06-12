defmodule RealChat.Application do
  @moduledoc """
  The RealChat Application.

  Supervises all core processes for the real-time messaging system.
  """

  use Application

  @impl true
  def start(_type, _args) do
    children = [
      # Database repositories
      RealChat.Repo,
      RealChat.ScyllaRepo,

      # Redis connection pool
      {Redix, redis_config()},

      # PubSub for clustering
      {Phoenix.PubSub, name: RealChat.PubSub},

      # Presence tracking
      RealChat.PresenceTracker,

      # Dynamic supervisors for user and chat processes
      {DynamicSupervisor, name: RealChat.UserSupervisor, strategy: :one_for_one},
      {DynamicSupervisor, name: RealChat.ChatSupervisor, strategy: :one_for_one},

      # Message queue for delivery guarantees
      RealChat.MessageQueue,

      # Web endpoint (Cowboy)
      RealChatWeb.Endpoint,

      # Telemetry supervisor
      RealChatWeb.Telemetry
    ]

    opts = [strategy: :one_for_one, name: RealChat.Supervisor]
    Supervisor.start_link(children, opts)
  end

  # Tell Phoenix to update the endpoint configuration
  # whenever the application is updated.
  @impl true
  def config_change(changed, _new, removed) do
    RealChatWeb.Endpoint.config_change(changed, removed)
    :ok
  end

  defp redis_config do
    Application.get_env(:real_chat, :redis, [])
  end
end
