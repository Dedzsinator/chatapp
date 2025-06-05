defmodule RealChat.ScyllaRepo do
  @moduledoc """
  ScyllaDB adapter for high-throughput message storage.

  Optimized for:
  - Time-series message queries
  - High write throughput
  - Horizontal scaling
  - Low latency reads
  """

  use GenServer
  require Logger

  @keyspace "realchat"
  @replication_factor 3

  ## Client API

  def start_link(_opts) do
    GenServer.start_link(__MODULE__, [], name: __MODULE__)
  end

  def insert_message(message) do
    GenServer.call(__MODULE__, {:insert_message, message})
  end

  def get_messages(chat_id, limit \\ 50, before_timestamp \\ nil) do
    GenServer.call(__MODULE__, {:get_messages, chat_id, limit, before_timestamp})
  end

  def insert_receipt(receipt) do
    GenServer.call(__MODULE__, {:insert_receipt, receipt})
  end

  def update_receipt(message_id, user_id, status, timestamp) do
    GenServer.call(__MODULE__, {:update_receipt, message_id, user_id, status, timestamp})
  end

  def get_receipts(message_id) do
    GenServer.call(__MODULE__, {:get_receipts, message_id})
  end

  def search_messages(chat_id, query, limit \\ 20) do
    GenServer.call(__MODULE__, {:search_messages, chat_id, query, limit})
  end

  def health_check do
    GenServer.call(__MODULE__, :health_check)
  end

  ## Server Callbacks

  @impl true
  def init(_opts) do
    hosts = Application.get_env(:real_chat, :scylla_hosts, ["127.0.0.1:9042"])

    case Xandra.start_link(nodes: hosts, name: :xandra) do
      {:ok, _pid} ->
        setup_keyspace_and_tables()
        Logger.info("ScyllaDB connection established")
        {:ok, %{}}

      {:error, error} ->
        Logger.error("Failed to connect to ScyllaDB: #{inspect(error)}")
        {:stop, error}
    end
  end

  @impl true
  def handle_call({:insert_message, message}, _from, state) do
    query = """
    INSERT INTO messages (
      id, chat_id, sender_id, content, message_type,
      timestamp, metadata, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """

    values = [
      message.id,
      message.chat_id,
      message.sender_id,
      message.content,
      to_string(message.type),
      message.timestamp,
      Jason.encode!(message.metadata),
      DateTime.utc_now()
    ]

    case Xandra.execute(:xandra, query, values) do
      {:ok, _} ->
        {:reply, :ok, state}

      {:error, error} ->
        Logger.error("Failed to insert message: #{inspect(error)}")
        {:reply, {:error, error}, state}
    end
  end

  @impl true
  def handle_call({:get_messages, chat_id, limit, before_timestamp}, _from, state) do
    {query, values} = if before_timestamp do
      {
        "SELECT * FROM messages WHERE chat_id = ? AND timestamp < ? ORDER BY timestamp DESC LIMIT ?",
        [chat_id, before_timestamp, limit]
      }
    else
      {
        "SELECT * FROM messages WHERE chat_id = ? ORDER BY timestamp DESC LIMIT ?",
        [chat_id, limit]
      }
    end

    case Xandra.execute(:xandra, query, values) do
      {:ok, result} ->
        messages = Enum.map(result, &row_to_message/1)
        {:reply, {:ok, messages}, state}

      {:error, error} ->
        Logger.error("Failed to get messages: #{inspect(error)}")
        {:reply, {:error, error}, state}
    end
  end

  @impl true
  def handle_call({:insert_receipt, receipt}, _from, state) do
    query = """
    INSERT INTO message_receipts (
      message_id, user_id, status, timestamp, created_at
    ) VALUES (?, ?, ?, ?, ?)
    """

    values = [
      receipt.message_id,
      receipt.user_id,
      to_string(receipt.status),
      receipt.timestamp,
      DateTime.utc_now()
    ]

    case Xandra.execute(:xandra, query, values) do
      {:ok, _} ->
        {:reply, :ok, state}

      {:error, error} ->
        Logger.error("Failed to insert receipt: #{inspect(error)}")
        {:reply, {:error, error}, state}
    end
  end

  @impl true
  def handle_call({:update_receipt, message_id, user_id, status, timestamp}, _from, state) do
    query = """
    UPDATE message_receipts
    SET status = ?, timestamp = ?
    WHERE message_id = ? AND user_id = ?
    """

    values = [to_string(status), timestamp, message_id, user_id]

    case Xandra.execute(:xandra, query, values) do
      {:ok, _} ->
        {:reply, :ok, state}

      {:error, error} ->
        Logger.error("Failed to update receipt: #{inspect(error)}")
        {:reply, {:error, error}, state}
    end
  end

  @impl true
  def handle_call({:get_receipts, message_id}, _from, state) do
    query = "SELECT * FROM message_receipts WHERE message_id = ?"

    case Xandra.execute(:xandra, query, [message_id]) do
      {:ok, result} ->
        receipts = Enum.map(result, &row_to_receipt/1)
        {:reply, {:ok, receipts}, state}

      {:error, error} ->
        Logger.error("Failed to get receipts: #{inspect(error)}")
        {:reply, {:error, error}, state}
    end
  end

  @impl true
  def handle_call({:search_messages, chat_id, query_text, limit}, _from, state) do
    # Basic text search - in production, use search index
    query = """
    SELECT * FROM messages
    WHERE chat_id = ? AND content LIKE ?
    ORDER BY timestamp DESC
    LIMIT ?
    """

    search_pattern = "%#{query_text}%"
    values = [chat_id, search_pattern, limit]

    case Xandra.execute(:xandra, query, values) do
      {:ok, result} ->
        messages = Enum.map(result, &row_to_message/1)
        {:reply, {:ok, messages}, state}

      {:error, error} ->
        Logger.error("Failed to search messages: #{inspect(error)}")
        {:reply, {:error, error}, state}
    end
  end

  @impl true
  def handle_call(:health_check, _from, state) do
    case Xandra.execute(:xandra, "SELECT now() FROM system.local") do
      {:ok, _} ->
        {:reply, :ok, state}

      {:error, error} ->
        {:reply, {:error, error}, state}
    end
  end

  ## Private Functions

  defp setup_keyspace_and_tables do
    # Create keyspace
    keyspace_query = """
    CREATE KEYSPACE IF NOT EXISTS #{@keyspace}
    WITH REPLICATION = {
      'class': 'SimpleStrategy',
      'replication_factor': #{@replication_factor}
    }
    """

    Xandra.execute(:xandra, keyspace_query)

    # Use keyspace
    Xandra.execute(:xandra, "USE #{@keyspace}")

    # Create messages table
    messages_table = """
    CREATE TABLE IF NOT EXISTS messages (
      id text,
      chat_id text,
      sender_id text,
      content text,
      message_type text,
      timestamp bigint,
      metadata text,
      created_at timestamp,
      PRIMARY KEY (chat_id, timestamp, id)
    ) WITH CLUSTERING ORDER BY (timestamp DESC)
    """

    Xandra.execute(:xandra, messages_table)

    # Create message receipts table
    receipts_table = """
    CREATE TABLE IF NOT EXISTS message_receipts (
      message_id text,
      user_id text,
      status text,
      timestamp bigint,
      created_at timestamp,
      PRIMARY KEY (message_id, user_id)
    )
    """

    Xandra.execute(:xandra, receipts_table)

    # Create search index (if using search)
    search_index = """
    CREATE CUSTOM INDEX IF NOT EXISTS messages_content_idx
    ON messages (content)
    USING 'org.apache.cassandra.index.sasi.SASIIndex'
    """

    # Ignore errors for search index as it might not be available
    Xandra.execute(:xandra, search_index)

    Logger.info("ScyllaDB keyspace and tables initialized")
  end

  defp row_to_message(row) do
    %RealChat.Message{
      id: row["id"],
      chat_id: row["chat_id"],
      sender_id: row["sender_id"],
      content: row["content"],
      type: String.to_existing_atom(row["message_type"]),
      timestamp: row["timestamp"],
      metadata: Jason.decode!(row["metadata"] || "{}")
    }
  end

  defp row_to_receipt(row) do
    %RealChat.MessageReceipt{
      message_id: row["message_id"],
      user_id: row["user_id"],
      status: String.to_existing_atom(row["status"]),
      timestamp: row["timestamp"]
    }
  end
end
