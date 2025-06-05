#
!/bin/bash

# Database initialization script for PostgreSQL

echo "Initializing PostgreSQL database..."

#
Create development database
psql -v ON_ERROR_STOP=1
--username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
CREATE DATABASE realchat_dev;
CREATE DATABASE realchat_test;
GRANT ALL PRIVILEGES ON DATABASE realchat_dev TO $POSTGRES_USER;
GRANT ALL PRIVILEGES ON DATABASE realchat_test TO $POSTGRES_USER;
EOSQL

echo "PostgreSQL databases created successfully!"
