defmodule RealChatWeb.Telemetry do
  @moduledoc """
  Telemetry supervisor for RealChat application.

  Handles metrics collection and reporting for monitoring application performance.
  """

  use Supervisor
  import Telemetry.Metrics

  def start_link(opts) do
    Supervisor.start_link(__MODULE__, opts, name: __MODULE__)
  end

  @impl true
  def init(_opts) do
    children = [
      # Telemetry poller will execute the given period measurements
      # every 10_000ms. Learn more here: https://hexdocs.pm/telemetry_metrics
      {:telemetry_poller, measurements: periodic_measurements(), period: 10_000}
      # Add reporters as children of your supervision tree.
      # {Telemetry.Metrics.ConsoleReporter, metrics: metrics()}
    ]

    Supervisor.init(children, strategy: :one_for_one)
  end

  def metrics do
    [
      # WebSocket metrics
      counter("real_chat.websocket.connections.total"),
      counter("real_chat.websocket.messages.total"),

      # Message queue metrics
      last_value("real_chat.message_queue.size"),
      counter("real_chat.messages.sent.total"),
      counter("real_chat.messages.delivered.total"),

      # Database metrics
      summary("real_chat.database.query.duration", unit: {:native, :millisecond}),

      # HTTP metrics
      summary("real_chat.http.request.duration", unit: {:native, :millisecond}),

      # VM metrics
      summary("vm.memory.total", unit: {:byte, :kilobyte}),
      summary("vm.total_run_queue_lengths.total"),
      summary("vm.total_run_queue_lengths.cpu"),
      summary("vm.total_run_queue_lengths.io")
    ]
  end

  defp periodic_measurements do
    [
      # A module, function and arguments to be invoked periodically.
      # This function must call :telemetry.execute/3 and a metric must be added above.
      # {RealChatWeb, :count_users, []}
    ]
  end
end
