defmodule RealChat.Message do
  @moduledoc """
  Message struct for ScyllaDB storage.
  """

  defstruct [
    :id,
    :chat_id,
    :sender_id,
    :content,
    :type,
    :timestamp,
    :metadata,
    :reply_to_id,
    :edited_at,
    :deleted_at
  ]

  @type t :: %__MODULE__{
    id: String.t(),
    chat_id: String.t(),
    sender_id: String.t(),
    content: String.t(),
    type: atom(),
    timestamp: integer(),
    metadata: map(),
    reply_to_id: String.t() | nil,
    edited_at: integer() | nil,
    deleted_at: integer() | nil
  }

  @message_types [:text, :image, :file, :audio, :video, :system, :location]

  def new(attrs) do
    struct(__MODULE__, attrs)
  end

  def valid_type?(type) when type in @message_types, do: true
  def valid_type?(_), do: false

  def system_message(chat_id, content, metadata \\ %{}) do
    %__MODULE__{
      id: Ecto.ULID.generate(),
      chat_id: chat_id,
      sender_id: "system",
      content: content,
      type: :system,
      timestamp: System.system_time(:millisecond),
      metadata: metadata
    }
  end
end
