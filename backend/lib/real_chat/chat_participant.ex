defmodule RealChat.ChatParticipant do
  @moduledoc """
  Chat participant schema for PostgreSQL.
  """

  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, Ecto.ULID, autogenerate: true}

  schema "chat_participants" do
    field :role, Ecto.Enum, values: [:owner, :admin, :member], default: :member
    field :joined_at, :utc_datetime
    field :left_at, :utc_datetime
    field :last_read_at, :utc_datetime
    field :muted, :boolean, default: false
    field :pinned, :boolean, default: false

    belongs_to :chat, RealChat.Chat, type: Ecto.ULID
    belongs_to :user, RealChat.User, type: Ecto.ULID

    timestamps()
  end

  def changeset(participant, attrs) do
    participant
    |> cast(attrs, [:role, :joined_at, :left_at, :last_read_at, :muted, :pinned])
    |> validate_required([:chat_id, :user_id])
    |> unique_constraint([:chat_id, :user_id])
  end
end
