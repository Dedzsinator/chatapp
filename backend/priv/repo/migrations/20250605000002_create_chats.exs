defmodule RealChat.Repo.Migrations.CreateChats do
  use Ecto.Migration

  def change do
    create table(:chats, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :name, :string
      add :description, :text
      add :type, :string, null: false, default: "direct"
      add :avatar_url, :string
      add :settings, :map, default: %{}
      add :created_by_id, references(:users, type: :binary_id, on_delete: :nilify_all)
      add :last_message_at, :utc_datetime
      add :message_count, :integer, default: 0

      timestamps()
    end

    create index(:chats, [:type])
    create index(:chats, [:created_by_id])
    create index(:chats, [:last_message_at])
  end
end
