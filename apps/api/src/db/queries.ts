import type {
  Dependency,
  DependencyType,
  Environment,
  Flag,
  FlagDependency,
  FlagEnvironmentState,
} from '@repo/types'
import type Database from 'better-sqlite3'
import { randomUUID } from 'crypto'
import { toDependency, toFlag, toFlagState } from './mappers'

// Flags

export function getAllFlags(db: Database.Database): Flag[] {
  return (db.prepare('SELECT * FROM flags').all() as any[]).map(row => toFlag(row, db))
}

export function getFlagById(db: Database.Database, id: string | string[]): Flag | null {
  const row = db.prepare('SELECT * FROM flags WHERE id = ?').get(id) as any
  return row ? toFlag(row, db) : null
}

export function createFlag(
  db: Database.Database,
  data: { name: string; description: string }
): Flag {
  const id = randomUUID()
  db.prepare(
    'INSERT INTO flags (id, name, description) VALUES (?, ?, ?)'
  ).run(id, data.name, data.description)

  // After creating a flag, seed an OFF state for all three environments.
  // This means the flag always has a row in flag_states — no "missing row" edge case.
  const envs: Environment[] = ['dev', 'staging', 'prod']
  const insertState = db.prepare(
    'INSERT INTO flag_states (id, flag_id, environment, enabled) VALUES (?, ?, ?, 0)'
  )
  for (const env of envs) {
    insertState.run(randomUUID(), id, env)
  }

  return getFlagById(db, id)!
}

export function updateFlag(
  db: Database.Database,
  id: string,
  data: { name?: string; description?: string }
): Flag | null {
  const flag = getFlagById(db, id)
  if (!flag) return null

  // Only update fields that were actually provided
  if (data.name !== undefined) {
    db.prepare('UPDATE flags SET name = ? WHERE id = ?').run(data.name, id)
  }
  if (data.description !== undefined) {
    db.prepare('UPDATE flags SET description = ? WHERE id = ?').run(data.description, id)
  }
  return getFlagById(db, id)!
}

export function deleteFlag(db: Database.Database, id: string): boolean {
  // Because we set ON DELETE CASCADE in the schema, deleting a flag
  // automatically removes its flag_states and flag_dependencies rows too.
  const result = db.prepare('DELETE FROM flags WHERE id = ?').run(id)
  return result.changes > 0
}

// ── Flag states (on/off per environment) ─────────────────────────────────────

export function getAllStates(db: Database.Database): FlagEnvironmentState[] {
  return (db.prepare('SELECT * FROM flag_states').all() as any[]).map(toFlagState)
}
  
export function getStatesForEnvironment(
  db: Database.Database,
  environment: Environment
): FlagEnvironmentState[] {
  return (db
    .prepare('SELECT * FROM flag_states WHERE environment = ?')
    .all(environment) as any[]).map(toFlagState)
}

export function setFlagEnabled(
  db: Database.Database,
  flagId: string,
  environment: Environment,
  enabled: boolean
): void {
  db.prepare(
    `UPDATE flag_states SET enabled = ?, updated_at = datetime('now')
     WHERE flag_id = ? AND environment = ?`
  ).run(enabled ? 1 : 0, flagId, environment)
}

export function getAllDependencies(db: Database.Database): Dependency[] {
  return (db.prepare('SELECT * FROM flag_dependencies').all() as any[]).map(toDependency)
}

export function getDependenciesForFlag(
  db: Database.Database,
  flagId: string
): FlagDependency[] {
  return db
    .prepare(
      'SELECT * FROM flag_dependencies WHERE from_flag_id = ? OR to_flag_id = ?'
    )
    .all(flagId, flagId) as FlagDependency[]
}

export function createDependency(
  db: Database.Database,
  data: { fromFlagId: string; toFlagId: string; type: DependencyType }
): Dependency {
  const id = randomUUID()
  db.prepare(
    `INSERT INTO flag_dependencies (id, from_flag_id, to_flag_id, type)
     VALUES (?, ?, ?, ?)`
  ).run(id, data.fromFlagId, data.toFlagId, data.type)

  const row = db
    .prepare('SELECT * FROM flag_dependencies WHERE id = ?')
    .get(id) as any
  return toDependency(row)
}

export function deleteDependency(db: Database.Database, id: string): boolean {
  const result = db.prepare('DELETE FROM flag_dependencies WHERE id = ?').run(id)
  return result.changes > 0
}

// ── Graph snapshot — loads everything needed for the engine in one go ─────────
// Routes call this instead of three separate queries.

export function loadGraphSnapshot(
  db: Database.Database,
  environment: Environment
) {
  const dependencies = getAllDependencies(db)
  // Convert Dependency format to FlagDependency format for graphEngine
  const edges = dependencies.map(d => ({
    fromFlagId: d.flagId,
    toFlagId: d.dependsOn,
    type: d.type.toUpperCase() as DependencyType,
  }))
  
  return {
    flags: getAllFlags(db),
    edges,
    states: getStatesForEnvironment(db, environment),
  }
}