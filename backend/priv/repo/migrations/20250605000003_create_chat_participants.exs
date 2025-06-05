defmodule RealChat.Repo.Migrations.CreateChatParticipants do
  use Ecto.Migration

  def change do
    create table(:chat_participants, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :role, :string, default: "member"
      add :joined_at, :utc_datetime
      add :left_at, :utc_datetime
      add :last_read_at, :utc_datetime
      add :muted, :boolean, default: false
      add :pinned, :boolean, default: false

      add :chat_id, references(:chats, type: :binary_id, on_delete: :delete_all), null: false
      add :user_id, references(:users, type: :binary_id, on_delete: :delete_all), null: false

      timestamps()
    end

    create unique_index(:chat_participants, [:chat_id, :user_id])
    create index(:chat_participants, [:user_id])
    create index(:chat_participants, [:role])
    create index(:chat_participants, [:joined_at])
  end
end
