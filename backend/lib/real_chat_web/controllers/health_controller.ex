defmodule RealChatWeb.HealthController do
  use RealChatWeb, :controller

  def check(conn, _params) do
    # Check database connections
    postgres_status = check_postgres()
    scylla_status = check_scylla()
    redis_status = check_redis()

    overall_status = if postgres_status && scylla_status && redis_status do
      "healthy"
    else
      "unhealthy"
    end

    status_code = if overall_status == "healthy", do: 200, else: 503

    conn
    |> put_status(status_code)
    |> json(%{
      status: overall_status,
      timestamp: DateTime.utc_now(),
      services: %{
        postgres: if postgres_status, do: "healthy", else: "unhealthy",
        scylla: if scylla_status, do: "healthy", else: "unhealthy",
        redis: if redis_status, do: "healthy", else: "unhealthy"
      }
    })
  end

  defp check_postgres do
    try do
      RealChat.Repo.query!("SELECT 1")
      true
    rescue
      _ -> false
    end
  end

  defp check_scylla do
    try do
      RealChat.ScyllaRepo.health_check()
      true
    rescue
      _ -> false
    end
  end

  defp check_redis do
    try do
      # Add Redis health check if using Redis
      true
    rescue
      _ -> false
    end
  end
end
