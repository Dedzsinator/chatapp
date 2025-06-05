defmodule RealChat.Auth do
  @moduledoc """
  Authentication and authorization module.
  """

  alias RealChat.{User, Repo, Guardian}
  import Ecto.Query

  def authenticate_user(email, password) do
    case get_user_by_email(email) do
      nil ->
        # Run password hash to prevent timing attacks
        Argon2.no_user_verify()
        {:error, :invalid_credentials}

      user ->
        if Argon2.verify_pass(password, user.password_hash) do
          {:ok, user}
        else
          {:error, :invalid_credentials}
        end
    end
  end

  def create_user(attrs) do
    %User{}
    |> User.registration_changeset(attrs)
    |> Repo.insert()
  end

  def generate_tokens(user) do
    with {:ok, access_token, _claims} <- Guardian.encode_and_sign(user, %{}, token_type: "access"),
         {:ok, refresh_token, _claims} <- Guardian.encode_and_sign(user, %{}, token_type: "refresh") do
      {:ok, %{access_token: access_token, refresh_token: refresh_token}}
    end
  end

  def verify_token(token) do
    Guardian.decode_and_verify(token)
  end

  def refresh_token(refresh_token) do
    case Guardian.decode_and_verify(refresh_token) do
      {:ok, claims} ->
        case Guardian.resource_from_claims(claims) do
          {:ok, user} ->
            generate_tokens(user)

          {:error, reason} ->
            {:error, reason}
        end

      {:error, reason} ->
        {:error, reason}
    end
  end

  def revoke_token(token) do
    Guardian.revoke(token)
  end

  def get_user_by_email(email) do
    Repo.get_by(User, email: email)
  end

  def get_user_by_username(username) do
    Repo.get_by(User, username: username)
  end

  def get_user!(id) do
    Repo.get!(User, id)
  end

  def update_last_seen(user_id) do
    from(u in User, where: u.id == ^user_id)
    |> Repo.update_all(set: [last_seen_at: DateTime.utc_now()])
  end

  def verify_email(user_id, verification_code) do
    # TODO: Implement email verification logic
    # For now, just mark as verified
    user = get_user!(user_id)

    user
    |> User.changeset(%{email_verified: true})
    |> Repo.update()
  end

  def send_password_reset(email) do
    case get_user_by_email(email) do
      nil ->
        # Don't reveal if email exists
        {:ok, :sent}

      user ->
        # TODO: Generate reset token and send email
        {:ok, :sent}
    end
  end

  def reset_password(token, new_password) do
    # TODO: Implement password reset logic
    {:error, :not_implemented}
  end
end
