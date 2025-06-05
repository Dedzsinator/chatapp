defmodule RealChat.MessageQueue do
  @moduledoc """
  High-performance message queue with delivery guarantees.

  Features:
  - Message deduplication
  - Delivery receipts (sent/delivered/read)
  - Retry logic for failed deliveries
  - Priority queuing
  - Backpressure handling
  """

  use GenServer
  require Logger

  alias RealChat.{Message, MessageReceipt, ScyllaRepo}
  alias Phoenix.PubSub

  @max_queue_size 10_000
  @retry_attempts 3
  @retry_delay 1000  # 1 second

  defstruct [
    :queue,           # Priority queue for pending messages
    :in_flight,       # Messages being processed
    :retry_queue,     # Messages pending retry
    :message_ids      # Set of processed message IDs for deduplication
  ]

  ## Client API

  def start_link(_opts) do
    GenServer.start_link(__MODULE__, [], name: __MODULE__)
  end

  def enqueue(message) do
    GenServer.call(__MODULE__, {:enqueue, message})
  end

  def mark_delivered(message_id, user_id) do
    GenServer.cast(__MODULE__, {:mark_delivered, message_id, user_id})
  end

  def mark_read(message_id, user_id) do
    GenServer.cast(__MODULE__, {:mark_read, message_id, user_id})
  end

  def get_stats do
    GenServer.call(__MODULE__, :get_stats)
  end

  ## Server Callbacks

  @impl true
  def init(_opts) do
    state = %__MODULE__{
      queue: :priority_queue.new(),
      in_flight: %{},
      retry_queue: :queue.new(),
      message_ids: MapSet.new()
    }

    # Schedule periodic processing
    schedule_process_queue()
    schedule_process_retries()

    Logger.info("MessageQueue started")
    {:ok, state}
  end

  @impl true
  def handle_call({:enqueue, message}, _from, state) do
    # Check for duplicate messages
    if MapSet.member?(state.message_ids, message.id) do
      {:reply, {:error, :duplicate_message}, state}
    else
      # Check queue size for backpressure
      queue_size = :priority_queue.size(state.queue)
      if queue_size >= @max_queue_size do
        {:reply, {:error, :queue_full}, state}
      else
        # Add to queue with priority (lower number = higher priority)
        priority = calculate_priority(message)
        queue = :priority_queue.in({priority, message}, state.queue)
        message_ids = MapSet.put(state.message_ids, message.id)

        new_state = %{state | queue: queue, message_ids: message_ids}

        # Persist message immediately
        spawn(fn -> persist_message(message) end)

        {:reply, :ok, new_state}
      end
    end
  end

  @impl true
  def handle_call(:get_stats, _from, state) do
    stats = %{
      queue_size: :priority_queue.size(state.queue),
      in_flight_count: map_size(state.in_flight),
      retry_queue_size: :queue.len(state.retry_queue),
      processed_messages: MapSet.size(state.message_ids)
    }
    {:reply, stats, state}
  end

  @impl true
  def handle_cast({:mark_delivered, message_id, user_id}, state) do
    # Update delivery receipt
    spawn(fn ->
      update_receipt(message_id, user_id, :delivered)
    end)

    {:noreply, state}
  end

  @impl true
  def handle_cast({:mark_read, message_id, user_id}, state) do
    # Update read receipt
    spawn(fn ->
      update_receipt(message_id, user_id, :read)
    end)

    {:noreply, state}
  end

  @impl true
  def handle_info(:process_queue, state) do
    new_state = process_messages(state)
    schedule_process_queue()
    {:noreply, new_state}
  end

  @impl true
  def handle_info(:process_retries, state) do
    new_state = process_retry_queue(state)
    schedule_process_retries()
    {:noreply, new_state}
  end

  @impl true
  def handle_info({:delivery_complete, message_id, result}, state) do
    in_flight = Map.delete(state.in_flight, message_id)

    case result do
      :ok ->
        # Message delivered successfully
        Logger.debug("Message #{message_id} delivered successfully")

      {:error, reason} ->
        # Delivery failed, add to retry queue if attempts remain
        if message = state.in_flight[message_id] do
          attempts = Map.get(message, :attempts, 0)
          if attempts < @retry_attempts do
            retry_message = Map.put(message, :attempts, attempts + 1)
            retry_queue = :queue.in(retry_message, state.retry_queue)
            Logger.warn("Message #{message_id} delivery failed: #{inspect(reason)}, retrying (attempt #{attempts + 1})")
            %{state | in_flight: in_flight, retry_queue: retry_queue}
          else
            Logger.error("Message #{message_id} delivery failed permanently: #{inspect(reason)}")
            %{state | in_flight: in_flight}
          end
        else
          %{state | in_flight: in_flight}
        end
    end
    |> then(&{:noreply, &1})
  end

  ## Private Functions

  defp process_messages(state) do
    case :priority_queue.out(state.queue) do
      {{_priority, message}, new_queue} ->
        # Move to in-flight and start delivery
        in_flight = Map.put(state.in_flight, message.id, message)

        # Async delivery
        deliver_message_async(message)

        %{state | queue: new_queue, in_flight: in_flight}

      :empty ->
        state
    end
  end

  defp process_retry_queue(state) do
    case :queue.out(state.retry_queue) do
      {{:value, message}, new_retry_queue} ->
        # Add back to main queue
        priority = calculate_priority(message)
        queue = :priority_queue.in({priority, message}, state.queue)

        %{state | retry_queue: new_retry_queue, queue: queue}

      {:empty, _} ->
        state
    end
  end

  defp deliver_message_async(message) do
    parent = self()

    spawn(fn ->
      result = deliver_message(message)
      send(parent, {:delivery_complete, message.id, result})
    end)
  end

  defp deliver_message(message) do
    try do
      # Get chat participants
      participants = get_chat_participants(message.chat_id)

      # Broadcast to all participants
      PubSub.broadcast(RealChat.PubSub, "chat:#{message.chat_id}",
        {:new_message, message})

      # Create delivery receipts
      Enum.each(participants, fn participant_id ->
        if participant_id != message.sender_id do
          create_receipt(message.id, participant_id, :sent)
        end
      end)

      :ok
    catch
      error ->
        Logger.error("Failed to deliver message #{message.id}: #{inspect(error)}")
        {:error, error}
    end
  end

  defp persist_message(message) do
    try do
      # Insert into ScyllaDB
      ScyllaRepo.insert_message(message)

      # Cache in Redis for quick access
      RealChat.Redis.cache_message(message)

      Logger.debug("Message #{message.id} persisted successfully")
    catch
      error ->
        Logger.error("Failed to persist message #{message.id}: #{inspect(error)}")
    end
  end

  defp calculate_priority(message) do
    # Lower number = higher priority
    case message.type do
      :system -> 1
      :urgent -> 2
      :normal -> 3
      :low -> 4
      _ -> 3
    end
  end

  defp get_chat_participants(chat_id) do
    # TODO: Implement chat participant lookup
    # For now, return empty list
    []
  end

  defp create_receipt(message_id, user_id, status) do
    receipt = %MessageReceipt{
      message_id: message_id,
      user_id: user_id,
      status: status,
      timestamp: System.system_time(:millisecond)
    }

    ScyllaRepo.insert_receipt(receipt)
  end

  defp update_receipt(message_id, user_id, status) do
    ScyllaRepo.update_receipt(message_id, user_id, status, System.system_time(:millisecond))
  end

  defp schedule_process_queue do
    Process.send_after(self(), :process_queue, 10)  # Process every 10ms
  end

  defp schedule_process_retries do
    Process.send_after(self(), :process_retries, @retry_delay)
  end
end
