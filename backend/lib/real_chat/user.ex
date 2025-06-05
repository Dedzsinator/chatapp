defmodule RealChat.User do
  @moduledoc """
  User schema for PostgreSQL.
  """

  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, Ecto.ULID, autogenerate: true}

  schema "users" do
    field :email, :string
    field :phone, :string
    field :username, :string
    field :display_name, :string
    field :avatar_url, :string
    field :password_hash, :string
    field :email_verified, :boolean, default: false
    field :phone_verified, :boolean, default: false
    field :status, Ecto.Enum, values: [:active, :suspended, :deleted], default: :active
    field :preferences, :map, default: %{}
    field :last_seen_at, :utc_datetime

    has_many :user_sessions, RealChat.UserSession
    has_many :user_devices, RealChat.UserDevice
    has_many :chat_participants, RealChat.ChatParticipant

    timestamps()
  end

  def changeset(user, attrs) do
    user
    |> cast(attrs, [
      :email, :phone, :username, :display_name, :avatar_url,
      :email_verified, :phone_verified, :status, :preferences, :last_seen_at
    ])
    |> validate_required([:email, :username, :display_name])
    |> validate_email()
    |> validate_username()
    |> unique_constraint(:email)
    |> unique_constraint(:username)
    |> unique_constraint(:phone)
  end

  def registration_changeset(user, attrs) do
    user
    |> changeset(attrs)
    |> cast(attrs, [:password])
    |> validate_required([:password])
    |> validate_length(:password, min: 8)
    |> hash_password()
  end

  defp validate_email(changeset) do
    changeset
    |> validate_format(:email, ~r/^[^\s]+@[^\s]+\.[^\s]+$/, message: "must be a valid email")
    |> validate_length(:email, max: 255)
  end

  defp validate_username(changeset) do
    changeset
    |> validate_format(:username, ~r/^[a-zA-Z0-9_]{3,30}$/,
         message: "must be 3-30 characters, letters, numbers, and underscores only")
  end

  defp hash_password(changeset) do
    case get_change(changeset, :password) do
      nil -> changeset
      password ->
        changeset
        |> put_change(:password_hash, Argon2.hash_pwd_salt(password))
        |> delete_change(:password)
    end
  end
end
