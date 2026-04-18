export type Environment = 'dev' | 'staging' | 'prod'

export type DependencyType = 'requires' | 'excludes'

export type Flag = {
  id: string
  name: string
  description: string
  createdAt: string
  states: Record<Environment, boolean>
}

export type Dependency = {
  id: string
  flagId: string
  dependsOn: string
  type: DependencyType
}

export type FlagEnvironmentState = {
  flagId: string
  environment: Environment
  enabled: boolean
}

export type FlagDependency = {
  fromFlagId: string
  toFlagId: string
  type: DependencyType
}

export type SuggestedAction = {
  flagId: string
  flagName?: string
  action: 'enable' | 'disable'
  reason: string
}

export type ValidationResult = {
  valid: boolean
  reason?: string
  suggestedActions?: SuggestedAction[]
}

export type GraphSnapshot = {
  flags: Flag[]
  edges: Dependency[]
  states: Record<string, Record<Environment, boolean>>
}