import Database from "better-sqlite3";
import path from "path";

export function createDatabase(dbPath?: string): Database.Database {
    const resolvedPath = dbPath ?? path.join(process.cwd(), 'data', 'flags.db')
    const db = new Database(resolvedPath);

    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    db.exec(
        `
        -- The core flags table.
        -- so a flag can have different on/off per environmet.
        CREATE TABLE IF NOT EXISTS flags (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            description TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        -- One row per flag+environment combination.
        -- enabled is 0 or 1 (SQLite has no boolean type).
        CREATE TABLE IF NOT EXISTS flag_states (
        id          TEXT PRIMARY KEY,
        flag_id     TEXT NOT NULL REFERENCES flags(id) ON DELETE CASCADE,
        environment TEXT NOT NULL CHECK(environment IN ('dev', 'staging', 'prod')),
        enabled     INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN (0, 1)),
        updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(flag_id, environment)
        );

        -- Each row is a directed edge in the dependency graph.
        -- from_flag_id REQUIRES/EXCLUDES to_flag_id.
        -- type is either 'REQUIRES' or 'EXCLUDES'.
        CREATE TABLE IF NOT EXISTS flag_dependencies (
        id           TEXT PRIMARY KEY,
        from_flag_id TEXT NOT NULL REFERENCES flags(id) ON DELETE CASCADE,
        to_flag_id   TEXT NOT NULL REFERENCES flags(id) ON DELETE CASCADE,
        type         TEXT NOT NULL CHECK(type IN ('REQUIRES', 'EXCLUDES')),
        created_at   TEXT NOT NULL DEFAULT (datetime('now')),
        -- Prevent duplicate edges of the same type between same flags
        UNIQUE(from_flag_id, to_flag_id, type)
        );

        -- Indexes to speed up the graph traversal queries.
        -- We frequently ask "give me all edges WHERE from_flag_id = X"
        -- and "give me all edges WHERE to_flag_id = X".
        CREATE INDEX IF NOT EXISTS idx_deps_from ON flag_dependencies(from_flag_id);
        CREATE INDEX IF NOT EXISTS idx_deps_to   ON flag_dependencies(to_flag_id);
        CREATE INDEX IF NOT EXISTS idx_states_flag_env ON flag_states(flag_id, environment);

        `
    )

    return db;
}