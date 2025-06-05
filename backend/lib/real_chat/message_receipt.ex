defmodule RealChat.MessageReceipt do
  @moduledoc """
  Message receipt struct for delivery tracking.
  """

  defstruct [
    :message_id,
    :user_id,
    :status,
    :timestamp
  ]

  @type t :: %__MODULE__{
    message_id: String.t(),
    user_id: String.t(),
    status: :sent | :delivered | :read,
    timestamp: integer()
  }
end
