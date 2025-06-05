defmodule RealChat.Repo do
  @moduledoc """
  PostgreSQL repository for user accounts and metadata.
  """

  use Ecto.Repo,
    otp_app: :real_chat,
    adapter: Ecto.Adapters.Postgres
end
