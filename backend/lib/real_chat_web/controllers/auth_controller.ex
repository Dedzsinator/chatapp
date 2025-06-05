defmodule RealChatWeb.AuthController do
  use RealChatWeb, :controller

  alias RealChat.{Auth, User, Repo}
  alias RealChat.Guardian

  def register(conn, %{"email" => email, "password" => password, "username" => username}) do
    case Auth.register_user(%{email: email, password: password, username: username}) do
      {:ok, user} ->
        {:ok, token, _claims} = Guardian.encode_and_sign(user)

        conn
        |> put_status(:created)
        |> json(%{
          success: true,
          data: %{
            user: user_json(user),
            token: token
          }
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

  def login(conn, %{"email" => email, "password" => password}) do
    case Auth.authenticate_user(email, password) do
      {:ok, user} ->
        {:ok, token, _claims} = Guardian.encode_and_sign(user)

        conn
        |> json(%{
          success: true,
          data: %{
            user: user_json(user),
            token: token
          }
        })

      {:error, :invalid_credentials} ->
        conn
        |> put_status(:unauthorized)
        |> json(%{
          success: false,
          error: "Invalid email or password"
        })
    end
  end

  def refresh_token(conn, %{"token" => token}) do
    case Guardian.refresh(token) do
      {:ok, {_old_token, _old_claims}, {new_token, new_claims}} ->
        case Guardian.resource_from_claims(new_claims) do
          {:ok, user} ->
            conn
            |> json(%{
              success: true,
              data: %{
                user: user_json(user),
                token: new_token
              }
            })

          {:error, _reason} ->
            conn
            |> put_status(:unauthorized)
            |> json(%{
              success: false,
              error: "Invalid token"
            })
        end

      {:error, _reason} ->
        conn
        |> put_status(:unauthorized)
        |> json(%{
          success: false,
          error: "Unable to refresh token"
        })
    end
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
