import type { Flag, FlagDependency, FlagEnvironmentState } from '@repo/types'

// One function per table. Takes the raw DB row (unknown shape),
// returns the correct TypeScript type. All snake_case → camelCase mapping happens here.

export function toFlag(row: any): Flag {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    createdAt: row.created_at,
  }
}

export function toFlagDependency(row: any): FlagDependency {
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