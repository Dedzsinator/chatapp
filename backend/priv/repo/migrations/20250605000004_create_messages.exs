defmodule RealChat.Repo.Migrations.CreateMessages do
  use Ecto.Migration

  def change do
    create table(:messages, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :chat_id, references(:chats, on_delete: :delete_all, type: :binary_id), null: false
      add :sender_id, references(:users, on_delete: :delete_all, type: :binary_id), null: false
      add :content, :text, null: false
      add :message_type, :string, default: "text", null: false
      add :metadata, :map, default: %{}
      add :is_edited, :boolean, default: false
      add :parent_message_id, references(:messages, on_delete: :delete_all, type: :binary_id)

      timestamps()
    end

    create index(:messages, [:chat_id])
    create index(:messages, [:sender_id])
    create index(:messages, [:inserted_at])
    create index(:messages, [:chat_id, :inserted_at])
  end
end
