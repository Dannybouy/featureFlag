import { Router, type Request, type Response } from 'express'
import type Database from 'better-sqlite3'
import { getAllFlags, getAllDependencies, getAllStates } from '../db/queries'
import { graphEngine } from '../graph/graphEngine'
import type { Environment } from '@repo/types'

export function createGraphRouter(db: Database.Database): Router {
  const router = Router()

  // GET /graph?environment=prod
  //
  // Returns everything the frontend visualization needs:
  // nodes (flags with their current state), edges, and
  // the impact radius for each node pre-computed.
  //
  router.get('/', (req: Request, res: Response) => {
    const environment = (req.query.environment as Environment) ?? 'prod'

    if (!['dev', 'staging', 'prod'].includes(environment)) {
      res.status(400).json({ error: 'environment must be dev, staging, or prod' })
      return
    }

    const flags = getAllFlags(db)
    const edges = getAllDependencies(db)
    const states = getAllStates(db)

    // Build nodes: each flag enriched with its enabled state
    // for the requested environment
    const nodes = flags.map(flag => {
      const state = states.find(
        s => s.flagId === flag.id && s.environment === environment
      )
      const impact = graphEngine.getImpactAnalysis(flag.id, edges)

      return {
        id: flag.id,
        name: flag.name,
        description: flag.description,
        enabled: state?.enabled ?? false,
        impact, // pre-computed so frontend doesn't have to ask separately
      }
    })

    res.json({ nodes, edges, environment })
  })

  return router
}