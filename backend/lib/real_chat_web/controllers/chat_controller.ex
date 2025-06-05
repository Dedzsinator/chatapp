defmodule RealChatWeb.ChatController do
  use RealChatWeb, :controller

  alias RealChat.{Chat, ChatParticipant, Repo}
  import Ecto.Query

  def index(conn, _params) do
    user = Guardian.Plug.current_resource(conn)

    chats =
      Chat
      |> join(:inner, [c], cp in ChatParticipant, on: c.id == cp.chat_id)
      |> where([c, cp], cp.user_id == ^user.id)
      |> preload([c, cp], :participants)
      |> Repo.all()

    conn
    |> json(%{
      success: true,
      data: Enum.map(chats, &chat_json/1)
    })
  end

  def create(conn, %{"name" => name, "type" => type, "participant_ids" => participant_ids}) do
    user = Guardian.Plug.current_resource(conn)

    chat_params = %{
      name: name,
      type: type,
      created_by: user.id
    }

    case Chat.create_changeset(%Chat{}, chat_params) |> Repo.insert() do
      {:ok, chat} ->
        # Add creator as participant
        ChatParticipant.create_changeset(%ChatParticipant{}, %{
          chat_id: chat.id,
          user_id: user.id,
          role: "admin"
        }) |> Repo.insert()

        # Add other participants
        Enum.each(participant_ids, fn participant_id ->
          ChatParticipant.create_changeset(%ChatParticipant{}, %{
            chat_id: chat.id,
            user_id: participant_id,
            role: "member"
          }) |> Repo.insert()
        end)

        # Reload chat with participants
        chat = Chat |> preload(:participants) |> Repo.get(chat.id)

        conn
        |> put_status(:created)
        |> json(%{
          success: true,
          data: chat_json(chat)
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

  def show(conn, %{"id" => id}) do
    user = Guardian.Plug.current_resource(conn)

    case get_user_chat(id, user.id) do
      nil ->
        conn
        |> put_status(:not_found)
        |> json(%{success: false, error: "Chat not found"})

      chat ->
        conn
        |> json(%{
          success: true,
          data: chat_json(chat)
        })
    end
  end

  def update(conn, %{"id" => id} = params) do
    user = Guardian.Plug.current_resource(conn)

    case get_user_chat(id, user.id) do
      nil ->
        conn
        |> put_status(:not_found)
        |> json(%{success: false, error: "Chat not found"})

      chat ->
        case Chat.update_changeset(chat, params) |> Repo.update() do
          {:ok, updated_chat} ->
            conn
            |> json(%{
              success: true,
              data: chat_json(updated_chat)
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

    case get_user_chat(id, user.id) do
      nil ->
        conn
        |> put_status(:not_found)
        |> json(%{success: false, error: "Chat not found"})

      chat ->
        case Repo.delete(chat) do
          {:ok, _chat} ->
            conn
            |> json(%{success: true, message: "Chat deleted successfully"})

          {:error, _changeset} ->
            conn
            |> put_status(:unprocessable_entity)
            |> json(%{success: false, error: "Unable to delete chat"})
        end
    end
  end

  defp get_user_chat(chat_id, user_id) do
    Chat
    |> join(:inner, [c], cp in ChatParticipant, on: c.id == cp.chat_id)
    |> where([c, cp], c.id == ^chat_id and cp.user_id == ^user_id)
    |> preload([c, cp], :participants)
    |> Repo.one()
  end

  defp chat_json(chat) do
    %{
      id: chat.id,
      name: chat.name,
      type: chat.type,
      avatar_url: chat.avatar_url,
      created_by: chat.created_by,
      participants: Enum.map(chat.participants || [], &participant_json/1),
      inserted_at: chat.inserted_at,
      updated_at: chat.updated_at
    }
  end

  defp participant_json(participant) do
    %{
      id: participant.id,
      user_id: participant.user_id,
      role: participant.role,
      joined_at: participant.inserted_at
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
