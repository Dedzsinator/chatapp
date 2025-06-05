defmodule RealChatWeb.MessageController do
  use RealChatWeb, :controller

  alias RealChat.{Message, MessageReceipt, Chat, ChatParticipant, Repo, ScyllaRepo}
  import Ecto.Query

  def index(conn, %{"chat_id" => chat_id} = params) do
    user = Guardian.Plug.current_resource(conn)

    # Verify user is participant in chat
    case verify_chat_participant(chat_id, user.id) do
      false ->
        conn
        |> put_status(:forbidden)
        |> json(%{success: false, error: "Not authorized to view this chat"})

      true ->
        # Get pagination params
        page = Map.get(params, "page", "1") |> String.to_integer()
        per_page = Map.get(params, "per_page", "50") |> String.to_integer()
        offset = (page - 1) * per_page

        # Get messages from ScyllaDB (for high performance)
        messages = ScyllaRepo.get_messages(chat_id, per_page, offset)

        conn
        |> json(%{
          success: true,
          data: Enum.map(messages, &message_json/1),
          meta: %{
            page: page,
            per_page: per_page,
            has_more: length(messages) == per_page
          }
        })
    end
  end

  def create(conn, %{"chat_id" => chat_id, "content" => content} = params) do
    user = Guardian.Plug.current_resource(conn)

    case verify_chat_participant(chat_id, user.id) do
      false ->
        conn
        |> put_status(:forbidden)
        |> json(%{success: false, error: "Not authorized to send messages to this chat"})

      true ->
        message_params = %{
          id: Ecto.UUID.generate(),
          chat_id: chat_id,
          sender_id: user.id,
          content: content,
          message_type: Map.get(params, "message_type", "text"),
          metadata: Map.get(params, "metadata", %{})
        }

        case Message.create_changeset(%Message{}, message_params) |> Repo.insert() do
          {:ok, message} ->
            # Also store in ScyllaDB for high-performance queries
            ScyllaRepo.insert_message(message)

            # Broadcast to WebSocket
            RealChatWeb.Endpoint.broadcast("chat:#{chat_id}", "new_message", message_json(message))

            conn
            |> put_status(:created)
            |> json(%{
              success: true,
              data: message_json(message)
            })

          {:error, changeset} ->
            conn
            |> put_status(:unprocessable_entity)
            |> json(%{
              success: false,
              errors: format_errors(changeset)
            })
        end
    end
  end

  def update(conn, %{"id" => id} = params) do
    user = Guardian.Plug.current_resource(conn)

    case Repo.get(Message, id) do
      nil ->
        conn
        |> put_status(:not_found)
        |> json(%{success: false, error: "Message not found"})

      %Message{sender_id: sender_id} = message when sender_id != user.id ->
        conn
        |> put_status(:forbidden)
        |> json(%{success: false, error: "Not authorized to edit this message"})

      message ->
        case Message.update_changeset(message, params) |> Repo.update() do
          {:ok, updated_message} ->
            # Update in ScyllaDB
            ScyllaRepo.update_message(updated_message)

            # Broadcast update
            RealChatWeb.Endpoint.broadcast("chat:#{message.chat_id}", "message_updated", message_json(updated_message))

            conn
            |> json(%{
              success: true,
              data: message_json(updated_message)
            })

          {:error, changeset} ->
            conn
            |> put_status(:unprocessable_entity)
            |> json(%{
              success: false,
              errors: format_errors(changeset)
            })
        end
    end
  end

  def delete(conn, %{"id" => id}) do
    user = Guardian.Plug.current_resource(conn)

    case Repo.get(Message, id) do
      nil ->
        conn
        |> put_status(:not_found)
        |> json(%{success: false, error: "Message not found"})

      %Message{sender_id: sender_id} = message when sender_id != user.id ->
        conn
        |> put_status(:forbidden)
        |> json(%{success: false, error: "Not authorized to delete this message"})

      message ->
        case Repo.delete(message) do
          {:ok, _message} ->
            # Delete from ScyllaDB
            ScyllaRepo.delete_message(message.id)

            # Broadcast deletion
            RealChatWeb.Endpoint.broadcast("chat:#{message.chat_id}", "message_deleted", %{id: message.id})

            conn
            |> json(%{success: true, message: "Message deleted successfully"})

          {:error, _changeset} ->
            conn
            |> put_status(:unprocessable_entity)
            |> json(%{success: false, error: "Unable to delete message"})
        end
    end
  end

  def mark_as_read(conn, %{"id" => message_id}) do
    user = Guardian.Plug.current_resource(conn)

    case Repo.get(Message, message_id) do
      nil ->
        conn
        |> put_status(:not_found)
        |> json(%{success: false, error: "Message not found"})

      message ->
        case verify_chat_participant(message.chat_id, user.id) do
          false ->
            conn
            |> put_status(:forbidden)
            |> json(%{success: false, error: "Not authorized"})

          true ->
            receipt_params = %{
              message_id: message_id,
              user_id: user.id,
              read_at: DateTime.utc_now()
            }

            case MessageReceipt.create_changeset(%MessageReceipt{}, receipt_params) |> Repo.insert() do
              {:ok, _receipt} ->
                conn
                |> json(%{success: true, message: "Message marked as read"})

              {:error, _changeset} ->
                conn
                |> json(%{success: true, message: "Message already marked as read"})
            end
        end
    end
  end

  defp verify_chat_participant(chat_id, user_id) do
    ChatParticipant
    |> where([cp], cp.chat_id == ^chat_id and cp.user_id == ^user_id)
    |> Repo.exists?()
  end

  defp message_json(message) do
    %{
      id: message.id,
      chat_id: message.chat_id,
      sender_id: message.sender_id,
      content: message.content,
      message_type: message.message_type,
      metadata: message.metadata,
      is_edited: message.is_edited,
      inserted_at: message.inserted_at,
      updated_at: message.updated_at
    }
  end

  defp format_errors(changeset) do
    Ecto.Changeset.traverse_errors(changeset, fn {msg, opts} ->
      Enum.reduce(opts, msg, fn {key, value}, acc ->
        String.replace(acc, "%{#{key}}", to_string(value))
      end)
    end)
  end
end
