#!/bin/bash

# ScyllaDB initialization script

echo "Initializing ScyllaDB keyspace and tables..."

cqlsh -e "
CREATE KEYSPACE IF NOT EXISTS realchat 
WITH REPLICATION = {
  'class': 'SimpleStrategy', 
  'replication_factor': 3
};

USE realchat;

CREATE TABLE IF NOT EXISTS messages (
    chat_id UUID,
    message_id UUID,
    sender_id UUID,
    content TEXT,
    message_type TEXT,
    metadata TEXT,
    is_edited BOOLEAN,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    PRIMARY KEY (chat_id, created_at, message_id)
) WITH CLUSTERING ORDER BY (created_at DESC);

CREATE TABLE IF NOT EXISTS message_search (
    content_tokens SET<TEXT>,
    chat_id UUID,
    message_id UUID,
    content TEXT,
    created_at TIMESTAMP,
    PRIMARY KEY ((content_tokens), created_at, message_id)
) WITH CLUSTERING ORDER BY (created_at DESC);

CREATE TABLE IF NOT EXISTS user_presence (
    user_id UUID PRIMARY KEY,
    is_online BOOLEAN,
    last_seen TIMESTAMP,
    status TEXT
);
"

echo "ScyllaDB initialization completed!"
