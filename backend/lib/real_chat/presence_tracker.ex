defmodule RealChat.PresenceTracker do
  @moduledoc """
  Tracks user presence across the cluster using Phoenix.Presence.

  Features:
  - Online/offline status
  - Last seen timestamps
  - Cross-node presence tracking
  - Presence conflict resolution
  """

  use Phoenix.Presence,
    otp_app: :real_chat,
    pubsub_server: RealChat.PubSub

  alias Phoenix.PubSub

  @presence_topic "presence"

  def track_user(user_id, presence_data \\ %{}) do
    track(self(), @presence_topic, user_id, Map.merge(%{
      online_at: System.system_time(:millisecond),
      status: :online
    }, presence_data))
  end

  def update_user(user_id, presence_data) do
    update(self(), @presence_topic, user_id, presence_data)
  end

  def untrack_user(user_id) do
    untrack(self(), @presence_topic, user_id)
  end

  def get_user_presence(user_id) do
    case get_by_key(@presence_topic, user_id) do
      [] -> nil
      presences -> merge_user_presence(presences)
    end
  end

  def list_online_users do
    list(@presence_topic)
    |> Enum.map(fn {user_id, presence} ->
      {user_id, merge_user_presence(presence)}
    end)
    |> Map.new()
  end

  def get_online_count do
    list(@presence_topic) |> map_size()
  end

  def subscribe_to_presence do
    PubSub.subscribe(RealChat.PubSub, @presence_topic)
  end

  def broadcast_presence_update(user_id, presence_data) do
    PubSub.broadcast(RealChat.PubSub, "user:#{user_id}",
      {:presence_update, user_id, presence_data})
  end

  ## Phoenix.Presence callbacks

  def init(_opts) do
    {:ok, %{}}
  end

  def handle_mounts(topic, joins, leaves, state) do
    for {user_id, presence} <- joins do
      merged_presence = merge_user_presence(presence)
      broadcast_presence_update(user_id, merged_presence)
    end

    for {user_id, presence} <- leaves do
      merged_presence = merge_user_presence(presence)
      broadcast_presence_update(user_id, Map.put(merged_presence, :status, :offline))
    end

    {:ok, state}
  end

  def handle_diff(topic, {joins, leaves}, state) do
    for {user_id, presence} <- joins do
      merged_presence = merge_user_presence(presence)
      broadcast_presence_update(user_id, merged_presence)
    end

    for {user_id, presence} <- leaves do
      merged_presence = merge_user_presence(presence)
      broadcast_presence_update(user_id, Map.put(merged_presence, :status, :offline))
    end

    {:ok, state}
  end

  ## Private functions

  defp merge_user_presence(%{metas: metas}) when is_list(metas) do
    # Merge multiple presence entries (multiple devices/sessions)
    most_recent = Enum.max_by(metas, & &1.online_at, fn -> %{} end)

    %{
      status: determine_status(metas),
      online_at: most_recent[:online_at] || System.system_time(:millisecond),
      session_count: length(metas),
      last_activity: Enum.max(Enum.map(metas, & &1[:online_at] || 0))
    }
  end

  defp merge_user_presence(presence_list) when is_list(presence_list) do
    all_metas = Enum.flat_map(presence_list, & &1.metas)
    merge_user_presence(%{metas: all_metas})
  end

  defp determine_status(metas) do
    # User is online if any session is online
    if Enum.any?(metas, & &1[:status] == :online) do
      :online
    else
      :away
    end
  end
end
