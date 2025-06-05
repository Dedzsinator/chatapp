defmodule RealChat.Guardian do
  @moduledoc """
  Guardian implementation for JWT tokens.
  """

  use Guardian, otp_app: :real_chat

  alias RealChat.Auth

  def subject_for_token(user, _claims) do
    {:ok, to_string(user.id)}
  end

  def resource_from_claims(%{"sub" => id}) do
    case Auth.get_user!(id) do
      nil -> {:error, :resource_not_found}
      user -> {:ok, user}
    end
  end

  def resource_from_claims(_claims) do
    {:error, :invalid_claims}
  end

  def build_claims(claims, _resource, opts) do
    claims =
      claims
      |> Map.put("token_type", Keyword.get(opts, :token_type, "access"))

    {:ok, claims}
  end
end
