defmodule RealChat.UserServer do
  @moduledoc """
  GenServer that manages a single user's session, presence, and real-time state.

  Features:
  - Presence tracking (online/offline/away)
  - Typing indicators
  - Message delivery receipts
  - Push notification handling
  - Session management across devices
  """

  use GenServer
  require Logger

  alias RealChat.{User, Message, PresenceTracker, MessageQueue}
  alias Phoenix.PubSub

  @typing_timeout 3000  # 3 seconds
  @presence_timeout 30000  # 30 seconds

  defstruct [
    :user_id,
    :user,
    :sessions,  # Map of session_id -> session_data
    :typing_in, # Set of chat_ids user is typing in
    :last_seen,
    :status     # :online, :away, :offline
  ]

  ## Client API

  def start_link(user_id) do
    GenServer.start_link(__MODULE__, user_id, name: via_tuple(user_id))
  end

  def add_session(user_id, session_id, session_data) do
    GenServer.call(via_tuple(user_id), {:add_session, session_id, session_data})
  end

  def remove_session(user_id, session_id) do
    GenServer.call(via_tuple(user_id), {:remove_session, session_id})
  end

  def set_typing(user_id, chat_id, typing) do
    GenServer.cast(via_tuple(user_id), {:set_typing, chat_id, typing})
  end

  def mark_message_read(user_id, message_id) do
    GenServer.cast(via_tuple(user_id), {:mark_read, message_id})
  end

  def send_message(user_id, message) do
    GenServer.call(via_tuple(user_id), {:send_message, message})
  end

  def get_state(user_id) do
    GenServer.call(via_tuple(user_id), :get_state)
  end

  ## Server Callbacks

  @impl true
  def init(user_id) do
    # Load user data
    user = RealChat.Accounts.get_user!(user_id)

    # Track presence
    PresenceTracker.track_user(user_id, %{
      status: :online,
      joined_at: System.system_time(:millisecond)
    })

    state = %__MODULE__{
      user_id: user_id,
      user: user,
      sessions: %{},
      typing_in: MapSet.new(),
      last_seen: System.system_time(:millisecond),
      status: :online
    }

    # Schedule presence heartbeat
    schedule_presence_check()

    Logger.info("UserServer started for user #{user_id}")
    {:ok, state}
  end

  @impl true
  def handle_call({:add_session, session_id, session_data}, _from, state) do
    sessions = Map.put(state.sessions, session_id, session_data)
    new_state = %{state | sessions: sessions, status: :online, last_seen: current_time()}

    # Update presence
    PresenceTracker.update_user(state.user_id, %{status: :online})

    {:reply, :ok, new_state}
  end

  @impl true
  def handle_call({:remove_session, session_id}, _from, state) do
    sessions = Map.delete(state.sessions, session_id)

    new_state = %{state | sessions: sessions}

    # If no more sessions, set status to offline
    new_state = if Enum.empty?(sessions) do
      PresenceTracker.update_user(state.user_id, %{status: :offline})
      %{new_state | status: :offline}
    else
      new_state
    end

    {:reply, :ok, new_state}
  end

  @impl true
  def handle_call({:send_message, message}, _from, state) do
    # Add message to queue for delivery
    case MessageQueue.enqueue(message) do
      :ok ->
        # Broadcast to chat participants
        PubSub.broadcast(RealChat.PubSub, "chat:#{message.chat_id}", {:new_message, message})
        {:reply, {:ok, message}, state}

      {:error, reason} ->
        {:reply, {:error, reason}, state}
    end
  end

  @impl true
  def handle_call(:get_state, _from, state) do
    public_state = %{
      user_id: state.user_id,
      status: state.status,
      last_seen: state.last_seen,
      typing_in: MapSet.to_list(state.typing_in),
      session_count: map_size(state.sessions)
    }
    {:reply, public_state, state}
  end

  @impl true
  def handle_cast({:set_typing, chat_id, true}, state) do
    typing_in = MapSet.put(state.typing_in, chat_id)

    # Broadcast typing indicator
    PubSub.broadcast(RealChat.PubSub, "chat:#{chat_id}",
      {:typing, state.user_id, true})

    # Schedule typing timeout
    Process.send_after(self(), {:typing_timeout, chat_id}, @typing_timeout)

    {:noreply, %{state | typing_in: typing_in}}
  end

  @impl true
  def handle_cast({:set_typing, chat_id, false}, state) do
    typing_in = MapSet.delete(state.typing_in, chat_id)

    # Broadcast typing stopped
    PubSub.broadcast(RealChat.PubSub, "chat:#{chat_id}",
      {:typing, state.user_id, false})

    {:noreply, %{state | typing_in: typing_in}}
  end

  @impl true
  def handle_cast({:mark_read, message_id}, state) do
    # Update message receipt
    MessageQueue.mark_read(message_id, state.user_id)

    {:noreply, state}
  end

  @impl true
  def handle_info({:typing_timeout, chat_id}, state) do
    if MapSet.member?(state.typing_in, chat_id) do
      typing_in = MapSet.delete(state.typing_in, chat_id)

      # Broadcast typing stopped
      PubSub.broadcast(RealChat.PubSub, "chat:#{chat_id}",
        {:typing, state.user_id, false})

      {:noreply, %{state | typing_in: typing_in}}
    else
      {:noreply, state}
    end
  end

  @impl true
  def handle_info(:presence_check, state) do
    # Check if user is still active
    time_since_last_seen = current_time() - state.last_seen

    new_status = cond do
      time_since_last_seen > @presence_timeout and state.status == :online ->
        PresenceTracker.update_user(state.user_id, %{status: :away})
        :away

      Enum.empty?(state.sessions) and state.status != :offline ->
        PresenceTracker.update_user(state.user_id, %{status: :offline})
        :offline

      true ->
        state.status
    end

    schedule_presence_check()
    {:noreply, %{state | status: new_status}}
  end

  ## Private Functions

  defp via_tuple(user_id) do
    {:via, Registry, {RealChat.UserRegistry, user_id}}
  end

  defp current_time do
    System.system_time(:millisecond)
  end

  defp schedule_presence_check do
    Process.send_after(self(), :presence_check, @presence_timeout)
  end
end
