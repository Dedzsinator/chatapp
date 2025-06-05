defmodule RealChatWeb.UserController do
  use RealChatWeb, :controller

  alias RealChat.{User, Repo}
  import Ecto.Query

  def me(conn, _params) do
    user = Guardian.Plug.current_resource(conn)

    conn
    |> json(%{
      success: true,
      data: user_json(user)
    })
  end

  def update(conn, params) do
    user = Guardian.Plug.current_resource(conn)

    case User.update_changeset(user, params) |> Repo.update() do
      {:ok, updated_user} ->
        conn
        |> json(%{
          success: true,
          data: user_json(updated_user)
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

  def search(conn, %{"q" => query}) do
    users =
      User
      |> where([u], ilike(u.username, ^"%#{query}%") or ilike(u.email, ^"%#{query}%"))
      |> limit(20)
      |> Repo.all()

    conn
    |> json(%{
      success: true,
      data: Enum.map(users, &user_json/1)
    })
  end

  defp user_json(user) do
    %{
      id: user.id,
      email: user.email,
      username: user.username,
      avatar_url: user.avatar_url,
      is_online: user.is_online,
      last_seen: user.last_seen,
      inserted_at: user.inserted_at,
      updated_at: user.updated_at
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
