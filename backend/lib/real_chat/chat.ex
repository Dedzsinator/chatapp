defmodule RealChat.Chat do
  @moduledoc """
  Chat schema for PostgreSQL.
  """

  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, Ecto.ULID, autogenerate: true}

  schema "chats" do
    field :name, :string
    field :description, :string
    field :type, Ecto.Enum, values: [:direct, :group, :channel], default: :direct
    field :avatar_url, :string
    field :settings, :map, default: %{}
    field :created_by_id, Ecto.ULID
    field :last_message_at, :utc_datetime
    field :message_count, :integer, default: 0

    has_many :chat_participants, RealChat.ChatParticipant
    has_many :users, through: [:chat_participants, :user]

    timestamps()
  end

  def changeset(chat, attrs) do
    chat
    |> cast(attrs, [:name, :description, :type, :avatar_url, :settings, :created_by_id])
    |> validate_required([:type, :created_by_id])
    |> validate_name_for_group()
  end

  defp validate_name_for_group(changeset) do
    type = get_field(changeset, :type)

    if type in [:group, :channel] do
      validate_required(changeset, [:name])
    else
      changeset
    end
  end
end
