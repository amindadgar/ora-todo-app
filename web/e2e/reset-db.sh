#!/bin/sh
# Wipe the LOCAL dev database between e2e runs (never point this at a real database).
psql "${DATABASE_URL:-postgres://ora@127.0.0.1:5433/ora_dev}" -q -c 'truncate users, sessions, records cascade'
