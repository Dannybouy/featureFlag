import type { Dependency, Environment, Flag, FlagEnvironmentState } from '@repo/types'
import type Database from 'better-sqlite3'

// One function per table. Takes the raw DB row (unknown shape),
// returns the correct TypeScript type. All snake_case → camelCase mapping happens here.

export function toFlag(row: any, db?: Database.Database): Flag {
  // Get states from flag_states table if db is provided
  let states: Record<Environment, boolean> = { dev: false, staging: false, prod: false }
  
  if (db) {
    const rows = db.prepare('SELECT environment, enabled FROM flag_states WHERE flag_id = ?').all(row.id) as any[]
    rows.forEach(r => {
      states[r.environment as Environment] = r.enabled === 1
    })
  }
  
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    createdAt: row.created_at,
    states,
  }
}

export function toDependency(row: any): Dependency {
  return {
    id: row.id,
    flagId: row.from_flag_id,
    dependsOn: row.to_flag_id,
    type: (row.type.toLowerCase() as 'requires' | 'excludes'),
  }
}

export function toFlagDependency(row: any) {
  return {
    fromFlagId: row.from_flag_id,
    toFlagId: row.to_flag_id,
    type: row.type,
  }
}

export function toFlagState(row: any): FlagEnvironmentState {
  return {
    flagId: row.flag_id,
    environment: row.environment,
    enabled: row.enabled === 1,
  }
}