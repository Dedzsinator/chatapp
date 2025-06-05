defmodule RealChatWeb.UserSocket do
  @moduledoc """
  WebSocket handler for real-time communication.

  Handles:
  - User authentication
  - Message sending/receiving
  - Presence updates
  - Typing indicators
  - Delivery receipts
  """

  @behaviour :cowboy_websocket

  require Logger
  alias RealChat.{UserServer, MessageQueue, Auth}
  alias Phoenix.PubSub

  defstruct [
    :user_id,
    :session_id,
    :authenticated,
    :subscribed_chats
  ]

  ## Cowboy WebSocket Callbacks

  def init(req, _state) do
    # Extract auth token from query params or headers
    token = get_auth_token(req)

    state = %__MODULE__{
      user_id: nil,
      session_id: generate_session_id(),
      authenticated: false,
      subscribed_chats: MapSet.new()
    }

    case authenticate_token(token) do
      {:ok, user_id} ->
        state = %{state | user_id: user_id, authenticated: true}
        {:cowboy_websocket, req, state}

      {:error, _reason} ->
        # Allow connection but require authentication
        {:cowboy_websocket, req, state}
    end
  end

  def websocket_init(state) do
    if state.authenticated do
      setup_authenticated_session(state)
    else
      {:ok, state}
    end
  end

  def websocket_handle({:text, json}, state) do
    case Jason.decode(json) do
      {:ok, message} ->
        handle_message(message, state)

      {:error, _} ->
        error_response = Jason.encode!(%{
          type: "error",
          error: "invalid_json"
        })
        {:reply, {:text, error_response}, state}
    end
  end

  def websocket_handle({:binary, _data}, state) do
    # Handle binary data (future: file uploads, voice messages)
    {:ok, state}
  end

  def websocket_info({:new_message, message}, state) do
    # Forward message to client
    response = Jason.encode!(%{
      type: "message",
      data: serialize_message(message)
    })
    {:reply, {:text, response}, state}
  end

  def websocket_info({:typing, user_id, is_typing}, state) do
    # Forward typing indicator
    response = Jason.encode!(%{
      type: "typing",
      user_id: user_id,
      is_typing: is_typing
    })
    {:reply, {:text, response}, state}
  end

  def websocket_info({:presence_update, user_id, presence}, state) do
    # Forward presence update
    response = Jason.encode!(%{
      type: "presence",
      user_id: user_id,
      presence: presence
    })
    {:reply, {:text, response}, state}
  end

  def websocket_info({:delivery_receipt, message_id, user_id, status}, state) do
    # Forward delivery receipt
    response = Jason.encode!(%{
      type: "receipt",
      message_id: message_id,
      user_id: user_id,
      status: status
    })
    {:reply, {:text, response}, state}
  end

  def websocket_terminate(_reason, _req, state) do
    if state.authenticated do
      cleanup_session(state)
    end
    :ok
  end

  ## Message Handlers

  defp handle_message(%{"type" => "auth", "token" => token}, state) do
    case authenticate_token(token) do
      {:ok, user_id} ->
        new_state = %{state | user_id: user_id, authenticated: true}
        setup_authenticated_session(new_state)

        response = Jason.encode!(%{
          type: "auth_success",
          user_id: user_id
        })
        {:reply, {:text, response}, new_state}

      {:error, reason} ->
        response = Jason.encode!(%{
          type: "auth_error",
          error: reason
        })
        {:reply, {:text, response}, state}
    end
  end

  defp handle_message(%{"type" => "send_message"} = msg, state) do
    if state.authenticated do
      message = %RealChat.Message{
        id: generate_message_id(),
        chat_id: msg["chat_id"],
        sender_id: state.user_id,
        content: msg["content"],
        type: Map.get(msg, "message_type", "text"),
        timestamp: System.system_time(:millisecond),
        metadata: Map.get(msg, "metadata", %{})
      }

      case UserServer.send_message(state.user_id, message) do
        {:ok, _message} ->
          response = Jason.encode!(%{
            type: "message_sent",
            message_id: message.id,
            status: "sent"
          })
          {:reply, {:text, response}, state}

        {:error, reason} ->
          response = Jason.encode!(%{
            type: "send_error",
            error: reason
          })
          {:reply, {:text, response}, state}
      end
    else
      auth_required_response(state)
    end
  end

  defp handle_message(%{"type" => "join_chat", "chat_id" => chat_id}, state) do
    if state.authenticated do
      # Subscribe to chat channel
      PubSub.subscribe(RealChat.PubSub, "chat:#{chat_id}")

      subscribed_chats = MapSet.put(state.subscribed_chats, chat_id)
      new_state = %{state | subscribed_chats: subscribed_chats}

      response = Jason.encode!(%{
        type: "joined_chat",
        chat_id: chat_id
      })
      {:reply, {:text, response}, new_state}
    else
      auth_required_response(state)
    end
  end

  defp handle_message(%{"type" => "leave_chat", "chat_id" => chat_id}, state) do
    if state.authenticated do
      # Unsubscribe from chat channel
      PubSub.unsubscribe(RealChat.PubSub, "chat:#{chat_id}")

      subscribed_chats = MapSet.delete(state.subscribed_chats, chat_id)
      new_state = %{state | subscribed_chats: subscribed_chats}

      response = Jason.encode!(%{
        type: "left_chat",
        chat_id: chat_id
      })
      {:reply, {:text, response}, new_state}
    else
      auth_required_response(state)
    end
  end

  defp handle_message(%{"type" => "typing", "chat_id" => chat_id, "is_typing" => is_typing}, state) do
    if state.authenticated do
      UserServer.set_typing(state.user_id, chat_id, is_typing)
      {:ok, state}
    else
      auth_required_response(state)
    end
  end

  defp handle_message(%{"type" => "mark_read", "message_id" => message_id}, state) do
    if state.authenticated do
      UserServer.mark_message_read(state.user_id, message_id)
      MessageQueue.mark_read(message_id, state.user_id)
      {:ok, state}
    else
      auth_required_response(state)
    end
  end

  defp handle_message(%{"type" => "ping"}, state) do
    response = Jason.encode!(%{type: "pong"})
    {:reply, {:text, response}, state}
  end

  defp handle_message(_unknown, state) do
    response = Jason.encode!(%{
      type: "error",
      error: "unknown_message_type"
    })
    {:reply, {:text, response}, state}
  end

  ## Helper Functions

  defp setup_authenticated_session(state) do
    # Start or get existing UserServer
    case UserServer.add_session(state.user_id, state.session_id, %{
      connected_at: System.system_time(:millisecond),
      socket_pid: self()
    }) do
      :ok ->
        # Subscribe to user-specific channels
        PubSub.subscribe(RealChat.PubSub, "user:#{state.user_id}")
        Logger.info("User #{state.user_id} connected via WebSocket")
        {:ok, state}

      {:error, reason} ->
        Logger.error("Failed to setup session for user #{state.user_id}: #{inspect(reason)}")
        {:ok, state}
    end
  end

  defp cleanup_session(state) do
    if state.user_id do
      UserServer.remove_session(state.user_id, state.session_id)
      Logger.info("User #{state.user_id} disconnected from WebSocket")
    end
  end

  defp authenticate_token(nil), do: {:error, :no_token}
  defp authenticate_token(token) do
    case Auth.verify_token(token) do
      {:ok, claims} ->
        {:ok, claims["user_id"]}

      {:error, reason} ->
        {:error, reason}
    end
  end

  defp get_auth_token(req) do
    # Try to get token from query params first, then headers
    case :cowboy_req.parse_qs(req) do
      qs when is_list(qs) ->
        case List.keyfind(qs, "token", 0) do
          {"token", token} -> token
          nil -> get_auth_header(req)
        end

      _ ->
        get_auth_header(req)
    end
  end

  defp get_auth_header(req) do
    case :cowboy_req.header("authorization", req) do
      "Bearer " <> token -> token
      _ -> nil
    end
  end

  defp auth_required_response(state) do
    response = Jason.encode!(%{
      type: "error",
      error: "authentication_required"
    })
    {:reply, {:text, response}, state}
  end

  defp serialize_message(message) do
    %{
      id: message.id,
      chat_id: message.chat_id,
      sender_id: message.sender_id,
      content: message.content,
      type: message.type,
      timestamp: message.timestamp,
      metadata: message.metadata
    }
  end

  defp generate_session_id do
    :crypto.strong_rand_bytes(16) |> Base.url_encode64(padding: false)
  end

  defp generate_message_id do
    Ecto.ULID.generate()
  end
end
