import type {FlagDependency, FlagEnvironmentState, ValidationResult, DependencyType} from '@repo/types'

type FlagNode = {
    id: string,
    name: string,
}

export type ImpactResult = {
    // Flags this flag depends on (directly or transitively)
  prerequisites: string[]
  // Flags that depend on this flag (directly or transitively)
  dependents: string[]
  // Flags that conflict with this flag
  exclusions: string[]
}

export class GraphEngine {
    // Cycle Detection: We can use a depth-first search (DFS) to detect cycles in the graph. If we encounter a node that is currently being visited, it means we have a cycle.
    //  Question: "Would adding the edge fromId→toId (REQUIRES) create a cycle?"

    wouldCreateCycle(fromId: string, toId: string, edges: FlagDependency[]): boolean {

        // Build adjacency list
        const adjacency = new Map<string, string[]>()
        for (const edge of edges) {
            if (edge.type !== 'REQUIRES') continue
            if (!adjacency.has(edge.fromFlagId)){
                adjacency.set(edge.fromFlagId, [])
            }
            adjacency.get(edge.fromFlagId)!.push(edge.toFlagId)

        }

        // DFS from toId to see if we can reach fromId - cycle detected.
        const visited = new Set<string>()

        const dfs = (nodeId: string): boolean => {
            if (nodeId === fromId) return true // Cycle detected
            if (visited.has(nodeId)) return false // Already visited, no cycle on this path

            visited.add(nodeId)
            const neighbors = adjacency.get(nodeId) ?? []
            for (const neighbor of neighbors) {
                if (dfs(neighbor)) return true
            }
            return false
        }
        return dfs(toId)
    }

    // Validate Enable
    // Question: "Can I enable flag X in environment Y given the current states and dependencies?"
    // Two things can block this:
    //   1. A prerequisite (REQUIRES edge) is not yet enabled
    //   2. A conflicting flag (EXCLUDES edge) is currently enabled
    validateEnable(flagId: string, environment: string, states: FlagEnvironmentState[], edges: FlagDependency[], flags: FlagNode[]): ValidationResult {

        // Build lookup maps for quick access
        const isEnabled = (id:string): boolean => {
            const state = states.find(s => s.flagId === id && s.environment === environment)
            return state ? state.enabled : false
        }

        const flagName = (id:string): string => {
            const flag = flags.find(f => f.id === id)
            return flag ? flag.name : id
        }

        // Check prerequisites must be enabled
        const unmetPrereqs = edges.filter(e => e.type === 'REQUIRES' && e.fromFlagId === flagId).filter(e => !isEnabled(e.toFlagId))

        if (unmetPrereqs.length > 0) {
            return {
                valid: false,
                reason: `Cannot enable "${flagName(flagId)}" — prerequisites not met`,
                suggestedActions: unmetPrereqs.map(e => ({
                    flagId: e.toFlagId,
                    flagName: flagName(e.toFlagId),
                    action: 'enable',
                    reason: `Required by ${flagName(flagId)}`
                }))
            }
        }

        // Check conflicts must not be enabled
        // A conflict exists if there's an EXCLUDES edge in either direction and the other flag is enabled
        const conflicts = edges.filter(e => e.type === 'EXCLUDES').filter(e => e.fromFlagId === flagId || e.toFlagId === flagId).map(e => (e.fromFlagId === flagId ? e.toFlagId : e.fromFlagId)).filter(otherId => isEnabled(otherId))

        if (conflicts.length > 0) {
        return {
            valid: false,
            reason: `Cannot enable "${flagName(flagId)}" — conflicts with enabled flags`,
            suggestedActions: conflicts.map(otherId => ({
            flagId: otherId,
            flagName: flagName(otherId),
            action: 'disable' as const,
            reason: `Conflicts with "${flagName(flagId)}"`,
            })),
            }
        }
        return { valid: true }
    }

    // Validate Disable
    // Question: "Can I disable flag X in environment Y given the current states and dependencies?"
    // Two things can block this:
    //   1. A dependent (REQUIRES edge) is currently enabled
    //   2. A conflicting flag (EXCLUDES edge) is currently enabled - this is a softer constraint, we might allow disabling but want to warn about it.
    validateDisable(flagId: string, environment: string, states: FlagEnvironmentState[], edges: FlagDependency[], flags: FlagNode[]): ValidationResult {
        const isEnabled = (id: string): boolean => {
      const state = states.find(
        s => s.flagId === id && s.environment === environment
      )
      return state?.enabled ?? false
    }

    const flagName = (id: string): string =>
      flags.find(f => f.id === id)?.name ?? id

    // Find all flags that directly REQUIRE this flag AND are currently enabled.
    const enabledDependents = edges
      .filter(e => e.type === 'REQUIRES' && e.toFlagId === flagId)
      .filter(e => isEnabled(e.fromFlagId))

    if (enabledDependents.length > 0) {
      return {
        valid: false,
        reason: `Cannot disable "${flagName(flagId)}" — other enabled flags depend on it`,
        suggestedActions: enabledDependents.map(e => ({
          flagId: e.fromFlagId,
          flagName: flagName(e.fromFlagId),
          action: 'disable' as const,
          reason: `Depends on "${flagName(flagId)}"`,
        })),
      }
    }

    return { valid: true }
    }

    // Impact Analysis
    // Question: "If I change the state of flag X, what other flags are impacted (i.e. which flags depend on it, which flags it depends on, and which flags conflict with it)?"
    // This does two BFS traversals:
    //   Forward  (following REQUIRES edges outward) → finds all prerequisites
    //   Backward (following REQUIRES edges inward)  → finds all dependents
    //   Plus finds all EXCLUDES relationships
    getImpactAnalysis(flagId: string, edges: FlagDependency[]): ImpactResult {
        // BFS helper - follows edges in one direction and collects reachable nodes
        const bfs = (startId: string, getNeighbours: (id: string) => string[]): string[] => {
            const visited = new Set<string>()
            const queue = [startId]
            visited.add(startId)

            while (queue.length > 0) {
                const current = queue.shift()!
                const neighbours = getNeighbours(current)
                for (const neighbor of neighbours) {
                    if (!visited.has(neighbor)) {
                        visited.add(neighbor)
                        queue.push(neighbor)
                    }
                }
            }
            // Remove the startId itself from the result
            visited.delete(startId)
            return [...visited]
        }

        // Get prerequisites (follow REQUIRES edges outward)
        const prerequisites = bfs(flagId, id => edges.filter(e => e.type === 'REQUIRES' && e.fromFlagId === id).map(e => e.toFlagId))

        // Get dependents (follow REQUIRES edges inward)
        const dependents = bfs(flagId, id => edges.filter(e => e.type === 'REQUIRES' && e.toFlagId === id).map(e => e.fromFlagId))

        // Get exclusions (any EXCLUDES edge in either direction)
        const exclusions = edges.filter(e => e.type === 'EXCLUDES' && (e.fromFlagId === flagId || e.toFlagId === flagId)).map(e => (e.fromFlagId === flagId ? e.toFlagId : e.fromFlagId))

        return { prerequisites, dependents, exclusions }
    }
}

// Note: This is a pure in-memory graph engine. It does not interact with the database directly. The API layer will be responsible for loading the relevant data from the database and passing it to these functions.
export const graphEngine = new GraphEngine()