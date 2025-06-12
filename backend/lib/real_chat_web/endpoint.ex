defmodule RealChatWeb.Endpoint do
  @moduledoc """
  Cowboy HTTP/WebSocket endpoint for RealChat.

  Routes:
  - /ws - WebSocket connection for real-time messaging
  - /api/* - REST API endpoints
  - /health - Health check endpoint
  """

  use Plug.Router
  require Logger

  plug(Plug.Logger)

  plug(CORSPlug,
    origin: ["http://localhost:19006", "http://localhost:3000", "http://localhost:8081"]
  )

  plug(Plug.Parsers,
    parsers: [:json],
    pass: ["application/json"],
    json_decoder: Jason
  )

  plug(:match)
  plug(:dispatch)

  # WebSocket upgrade
  get "/ws" do
    case Plug.Conn.get_req_header(conn, "upgrade") do
      ["websocket"] ->
        conn
        |> upgrade_to_websocket()

      _ ->
        conn
        |> put_resp_content_type("application/json")
        |> send_resp(400, Jason.encode!(%{error: "WebSocket upgrade required"}))
    end
  end

  # Health check
  get "/health" do
    health_status = %{
      status: "ok",
      timestamp: System.system_time(:millisecond),
      version: Application.spec(:real_chat, :vsn) |> to_string(),
      services: %{
        postgres: check_postgres(),
        scylla: check_scylla(),
        redis: check_redis()
      }
    }

    status_code = if all_services_healthy?(health_status.services), do: 200, else: 503

    conn
    |> put_resp_content_type("application/json")
    |> send_resp(status_code, Jason.encode!(health_status))
  end

  # API Routes
  forward("/api/auth", to: RealChatWeb.AuthController)
  forward("/api/users", to: RealChatWeb.UserController)
  forward("/api/chats", to: RealChatWeb.ChatController)
  forward("/api/messages", to: RealChatWeb.MessageController)

  # Catch-all
  match _ do
    conn
    |> put_resp_content_type("application/json")
    |> send_resp(404, Jason.encode!(%{error: "Not found"}))
  end

  ## Configuration

  def child_spec(_opts) do
    %{
      id: __MODULE__,
      start: {__MODULE__, :start_link, []},
      type: :supervisor
    }
  end

  def start_link do
    port = Application.get_env(:real_chat, :port, 4000)

    dispatch =
      :cowboy_router.compile([
        {:_,
         [
           {"/ws", RealChatWeb.UserSocket, []},
           {:_, Plug.Cowboy.Handler, {__MODULE__, []}}
         ]}
      ])

    {:ok, _} =
      :cowboy.start_clear(
        :http,
        [{:port, port}],
        %{env: %{dispatch: dispatch}}
      )

    Logger.info("RealChatWeb.Endpoint started on port #{port}")
    {:ok, self()}
  end

  def config_change(_changed, _removed) do
    # Handle configuration changes
    :ok
  end

  ## Private Functions

  defp upgrade_to_websocket(conn) do
    # This will be handled by Cowboy router
    conn
  end

  defp cors_origins do
    Application.get_env(:real_chat, :cors_origins, [
      # React dev server
      "http://localhost:3000",
      # Expo web
      "http://localhost:19006",
      # Capacitor
      "capacitor://localhost",
      # Ionic
      "ionic://localhost"
    ])
  end

  defp check_postgres do
    try do
      case RealChat.Repo.query("SELECT 1", []) do
        {:ok, _} -> %{status: "healthy"}
        {:error, error} -> %{status: "unhealthy", error: inspect(error)}
      end
    catch
      error -> %{status: "unhealthy", error: inspect(error)}
    end
  end

  defp check_scylla do
    try do
      case RealChat.ScyllaRepo.health_check() do
        :ok -> %{status: "healthy"}
        {:error, error} -> %{status: "unhealthy", error: inspect(error)}
      end
    catch
      error -> %{status: "unhealthy", error: inspect(error)}
    end
  end

  defp check_redis do
    try do
      case Redix.command(:redix, ["PING"]) do
        {:ok, "PONG"} -> %{status: "healthy"}
        {:error, error} -> %{status: "unhealthy", error: inspect(error)}
      end
    catch
      error -> %{status: "unhealthy", error: inspect(error)}
    end
  end

  defp all_services_healthy?(services) do
    Enum.all?(services, fn {_name, service} ->
      service.status == "healthy"
    end)
  end
end
