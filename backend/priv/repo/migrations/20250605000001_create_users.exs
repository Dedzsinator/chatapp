defmodule RealChat.Repo.Migrations.CreateUsers do
  use Ecto.Migration

  def change do
    create table(:users, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :email, :string, null: false
      add :phone, :string
      add :username, :string, null: false
      add :display_name, :string, null: false
      add :avatar_url, :string
      add :password_hash, :string, null: false
      add :email_verified, :boolean, default: false
      add :phone_verified, :boolean, default: false
      add :status, :string, default: "active"
      add :preferences, :map, default: %{}
      add :last_seen_at, :utc_datetime

      timestamps()
    end

    create unique_index(:users, [:email])
    create unique_index(:users, [:username])
    create unique_index(:users, [:phone])
    create index(:users, [:status])
    create index(:users, [:last_seen_at])
  end
end
