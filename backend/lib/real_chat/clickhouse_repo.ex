defmodule RealChat.ClickHouseRepo do
  @moduledoc """
  ClickHouse adapter for ultra-high-performance message storage and analytics.
  
  Performance benefits:
  - 100x faster analytical queries than PostgreSQL
  - Columnar storage for efficient compression
  - Vectorized query execution
  - Horizontal scaling to petabytes
  """

  use GenServer
  require Logger

  @database "realchat"
  @batch_size 1000
  @batch_timeout 5000

  ## Client API

  def start_link(opts) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  def insert_message(message) do
    GenServer.cast(__MODULE__, {:insert_message, message})
  end

  def batch_insert_messages(messages) do
    GenServer.cast(__MODULE__, {:batch_insert_messages, messages})
  end

  def get_messages(chat_id, limit \\ 50, before_timestamp \\ nil) do
    GenServer.call(__MODULE__, {:get_messages, chat_id, limit, before_timestamp})
  end

  def search_messages(query, chat_ids \\ [], limit \\ 20) do
    GenServer.call(__MODULE__, {:search_messages, query, chat_ids, limit})
  end

  def get_message_analytics(chat_id, time_range) do
    GenServer.call(__MODULE__, {:get_analytics, chat_id, time_range})
  end

  def health_check do
    GenServer.call(__MODULE__, :health_check)
  end

  ## Server Callbacks

  def init(opts) do
    host = Keyword.get(opts, :host, "localhost")
    port = Keyword.get(opts, :port, 8123)
    username = Keyword.get(opts, :username, "default")
    password = Keyword.get(opts, :password, "")

    state = %{
      host: host,
      port: port,
      username: username,
      password: password,
      batch_buffer: [],
      batch_timer: nil
    }

    # Initialize database and tables
    case setup_database(state) do
      :ok ->
        Logger.info("ClickHouse connection established")
        {:ok, state}
      
      {:error, reason} ->
        Logger.error("Failed to connect to ClickHouse: #{inspect(reason)}")
        {:stop, reason}
    end
  end

  def handle_cast({:insert_message, message}, state) do
    new_buffer = [message | state.batch_buffer]
    
    if length(new_buffer) >= @batch_size do
      # Flush immediately if buffer is full
      flush_batch(new_buffer, state)
      {:noreply, %{state | batch_buffer: [], batch_timer: nil}}
    else
      # Add to buffer and set timer if not already set
      timer = state.batch_timer || Process.send_after(self(), :flush_batch, @batch_timeout)
      {:noreply, %{state | batch_buffer: new_buffer, batch_timer: timer}}
    end
  end

  def handle_cast({:batch_insert_messages, messages}, state) do
    flush_batch(messages, state)
    {:noreply, state}
  end

  def handle_call({:get_messages, chat_id, limit, before_timestamp}, _from, state) do
    query = build_get_messages_query(chat_id, limit, before_timestamp)
    result = execute_query(query, state)
    {:reply, result, state}
  end

  def handle_call({:search_messages, query, chat_ids, limit}, _from, state) do
    sql = build_search_query(query, chat_ids, limit)
    result = execute_query(sql, state)
    {:reply, result, state}
  end

  def handle_call({:get_analytics, chat_id, time_range}, _from, state) do
    sql = build_analytics_query(chat_id, time_range)
    result = execute_query(sql, state)
    {:reply, result, state}
  end

  def handle_call(:health_check, _from, state) do
    result = execute_query("SELECT 1", state)
    {:reply, result, state}
  end

  def handle_info(:flush_batch, state) do
    if length(state.batch_buffer) > 0 do
      flush_batch(state.batch_buffer, state)
    end
    {:noreply, %{state | batch_buffer: [], batch_timer: nil}}
  end

  ## Private Functions

  defp setup_database(state) do
    with :ok <- create_database(state),
         :ok <- create_tables(state) do
      :ok
    end
  end

  defp create_database(state) do
    query = "CREATE DATABASE IF NOT EXISTS #{@database}"
    case execute_query(query, state) do
      {:ok, _} -> :ok
      error -> error
    end
  end

  defp create_tables(state) do
    # Messages table optimized for time-series queries
    messages_table = """
    CREATE TABLE IF NOT EXISTS #{@database}.messages (
        id String,
        chat_id String,
        sender_id String,
        content String,
        message_type LowCardinality(String) DEFAULT 'text',
        metadata String,
        is_edited UInt8 DEFAULT 0,
        parent_message_id Nullable(String),
        created_at DateTime64(3),
        updated_at DateTime64(3)
    ) ENGINE = MergeTree()
    PARTITION BY toYYYYMM(created_at)
    ORDER BY (chat_id, created_at, id)
    TTL created_at + INTERVAL 2 YEAR
    SETTINGS index_granularity = 8192
    """

    # Message search table with full-text search
    search_table = """
    CREATE TABLE IF NOT EXISTS #{@database}.message_search (
        message_id String,
        chat_id String,
        content_tokens Array(String),
        content String,
        created_at DateTime64(3)
    ) ENGINE = MergeTree()
    ORDER BY (chat_id, created_at)
    SETTINGS index_granularity = 8192
    """

    # Analytics materialized view for real-time metrics
    analytics_view = """
    CREATE MATERIALIZED VIEW IF NOT EXISTS #{@database}.message_analytics
    ENGINE = AggregatingMergeTree()
    PARTITION BY toYYYYMM(created_at)
    ORDER BY (chat_id, toDate(created_at))
    AS SELECT
        chat_id,
        toDate(created_at) as date,
        countState() as message_count,
        uniqState(sender_id) as unique_senders,
        avgState(length(content)) as avg_message_length
    FROM #{@database}.messages
    GROUP BY chat_id, toDate(created_at)
    """

    with {:ok, _} <- execute_query(messages_table, state),
         {:ok, _} <- execute_query(search_table, state),
         {:ok, _} <- execute_query(analytics_view, state) do
      :ok
    end
  end

  defp flush_batch(messages, state) do
    if length(messages) > 0 do
      insert_sql = build_batch_insert_query(messages)
      case execute_query(insert_sql, state) do
        {:ok, _} ->
          Logger.debug("Inserted #{length(messages)} messages to ClickHouse")
        
        {:error, reason} ->
          Logger.error("Failed to insert batch: #{inspect(reason)}")
      end
    end
  end

  defp build_batch_insert_query(messages) do
    values = Enum.map(messages, fn msg ->
      """
      ('#{msg.id}', '#{msg.chat_id}', '#{msg.sender_id}', 
       '#{escape_string(msg.content)}', '#{msg.message_type}',
       '#{Jason.encode!(msg.metadata || %{})}', #{if msg.is_edited, do: 1, else: 0},
       #{if msg.parent_message_id, do: "'#{msg.parent_message_id}'", else: "NULL"},
       '#{DateTime.to_iso8601(msg.inserted_at)}',
       '#{DateTime.to_iso8601(msg.updated_at)}')
      """
    end) |> Enum.join(", ")

    """
    INSERT INTO #{@database}.messages
    (id, chat_id, sender_id, content, message_type, metadata, is_edited, parent_message_id, created_at, updated_at)
    VALUES #{values}
    """
  end

  defp build_get_messages_query(chat_id, limit, before_timestamp) do
    where_clause = if before_timestamp do
      "WHERE chat_id = '#{chat_id}' AND created_at < '#{DateTime.to_iso8601(before_timestamp)}'"
    else
      "WHERE chat_id = '#{chat_id}'"
    end

    """
    SELECT id, chat_id, sender_id, content, message_type, metadata, 
           is_edited, parent_message_id, created_at, updated_at
    FROM #{@database}.messages
    #{where_clause}
    ORDER BY created_at DESC
    LIMIT #{limit}
    """
  end

  defp build_search_query(query, chat_ids, limit) do
    chat_filter = if length(chat_ids) > 0 do
      chat_list = Enum.map(chat_ids, &"'#{&1}'") |> Enum.join(", ")
      "AND chat_id IN (#{chat_list})"
    else
      ""
    end

    """
    SELECT m.id, m.chat_id, m.sender_id, m.content, m.created_at
    FROM #{@database}.messages m
    WHERE hasTokenBF(lower(content), lower('#{escape_string(query)}'))
    #{chat_filter}
    ORDER BY created_at DESC
    LIMIT #{limit}
    """
  end

  defp build_analytics_query(chat_id, {start_time, end_time}) do
    """
    SELECT 
        date,
        countMerge(message_count) as total_messages,
        uniqMerge(unique_senders) as active_users,
        avgMerge(avg_message_length) as avg_length
    FROM #{@database}.message_analytics
    WHERE chat_id = '#{chat_id}' 
      AND date >= '#{Date.to_iso8601(start_time)}'
      AND date <= '#{Date.to_iso8601(end_time)}'
    GROUP BY date
    ORDER BY date
    """
  end

  defp execute_query(query, state) do
    url = "http://#{state.host}:#{state.port}/"
    
    headers = [
      {"X-ClickHouse-User", state.username},
      {"X-ClickHouse-Key", state.password},
      {"Content-Type", "text/plain"}
    ]

    case HTTPoison.post(url, query, headers, recv_timeout: 30_000) do
      {:ok, %HTTPoison.Response{status_code: 200, body: body}} ->
        {:ok, parse_response(body)}
      
      {:ok, %HTTPoison.Response{status_code: code, body: body}} ->
        {:error, "HTTP #{code}: #{body}"}
      
      {:error, reason} ->
        {:error, reason}
    end
  end

  defp parse_response(""), do: :ok
  defp parse_response(body) do
    body
    |> String.split("\n")
    |> Enum.reject(&(&1 == ""))
    |> Enum.map(&String.split(&1, "\t"))
  end

  defp escape_string(str) do
    str
    |> String.replace("'", "\\'")
    |> String.replace("\\", "\\\\")
  end
end
