export type Environment = 'dev' | 'staging' | 'prod'

export type DependencyType = 'REQUIRES' | 'EXCLUDES'

export type Flag = {
  id: string
  name: string
  description: string
  createdAt: string
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

export type ValidationResult = {
  valid: boolean
  reason?: string
  // What needs to change to resolve the conflict
  suggestedActions?: SuggestedAction[]
}

export type SuggestedAction = {
  flagId: string
  flagName: string
  action: 'enable' | 'disable'
  reason: string
}