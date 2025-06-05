defmodule RealChat.Repo.Migrations.CreateMessageReceipts do
  use Ecto.Migration

  def change do
    create table(:message_receipts, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :message_id, references(:messages, on_delete: :delete_all, type: :binary_id), null: false
      add :user_id, references(:users, on_delete: :delete_all, type: :binary_id), null: false
      add :read_at, :utc_datetime, null: false

      timestamps()
    end

    create unique_index(:message_receipts, [:message_id, :user_id])
    create index(:message_receipts, [:user_id])
    create index(:message_receipts, [:read_at])
  end
end
