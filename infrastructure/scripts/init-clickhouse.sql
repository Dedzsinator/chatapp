-- ClickHouse initialization script for RealChat

-- Create database
CREATE DATABASE IF NOT EXISTS realchat;

-- Use the database
USE realchat;

-- Messages table optimized for time-series queries
CREATE TABLE IF NOT EXISTS messages (
    id String,
    chat_id String,
    sender_id String,
    content String,
    message_type LowCardinality(String) DEFAULT 'text',
    metadata String,
    is_edited UInt8 DEFAULT 0,
    parent_message_id Nullable(String),
    created_at DateTime64(3),
    updated_at DateTime64(3)
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(created_at)
ORDER BY (chat_id, created_at, id)
TTL created_at + INTERVAL 2 YEAR
SETTINGS index_granularity = 8192;

-- Message search table with full-text capabilities
CREATE TABLE IF NOT EXISTS message_search (
    message_id String,
    chat_id String,
    content_tokens Array(String),
    content String,
    created_at DateTime64(3)
) ENGINE = MergeTree()
ORDER BY (chat_id, created_at)
SETTINGS index_granularity = 8192;

-- Real-time analytics materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS message_analytics
ENGINE = AggregatingMergeTree()
PARTITION BY toYYYYMM(created_at)
ORDER BY (chat_id, toDate(created_at))
AS SELECT
    chat_id,
    toDate(created_at) as date,
    countState() as message_count,
    uniqState(sender_id) as unique_senders,
    avgState(length(content)) as avg_message_length
FROM messages
GROUP BY chat_id, toDate(created_at);

-- User activity tracking
CREATE TABLE IF NOT EXISTS user_activity (
    user_id String,
    chat_id String,
    activity_type LowCardinality(String), -- 'message', 'join', 'leave', 'typing'
    timestamp DateTime64(3),
    metadata String
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (user_id, timestamp)
TTL timestamp + INTERVAL 6 MONTH;

-- Message delivery tracking
CREATE TABLE IF NOT EXISTS message_delivery (
    message_id String,
    user_id String,
    status LowCardinality(String), -- 'sent', 'delivered', 'read'
    timestamp DateTime64(3)
) ENGINE = MergeTree()
ORDER BY (message_id, user_id, timestamp);

-- Performance monitoring
CREATE TABLE IF NOT EXISTS performance_metrics (
    metric_name LowCardinality(String),
    value Float64,
    tags Map(String, String),
    timestamp DateTime64(3)
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (metric_name, timestamp)
TTL timestamp + INTERVAL 3 MONTH;
