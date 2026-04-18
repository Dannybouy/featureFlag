import type { DependencyType } from '@repo/types'
import type Database from 'better-sqlite3'
import { Router, type Request, type Response } from 'express'
import { createDependency, deleteDependency, getAllDependencies, getFlagById } from '../db/queries'
import { graphEngine } from '../graph/graphEngine'

export function createDependenciesRouter(db: Database.Database): Router {
  const router = Router()

  // GET /dependencies — fetch all dependencies
  router.get('/', (_req: Request, res: Response) => {
    const dependencies = getAllDependencies(db)
    res.json(dependencies)
  })

  // POST /dependencies — declare a new relationship between two flags
  router.post('/', (req: Request, res: Response) => {
    const { flagId, dependsOn, type } = req.body

    // ── Input validation ───────────────────────────────────────────────────
    if (!flagId || !dependsOn || !type) {
      res.status(400).json({ error: 'flagId, dependsOn, and type are required' })
      return
    }

    if (!['requires', 'excludes'].includes(type)) {
      res.status(400).json({ error: 'type must be requires or excludes' })
      return
    }

    if (flagId === dependsOn) {
      res.status(400).json({ error: 'A flag cannot depend on itself' })
      return
    }

    // ── Confirm both flags exist ───────────────────────────────────────────
    const fromFlag = getFlagById(db, flagId)
    const toFlag = getFlagById(db, dependsOn)

    if (!fromFlag) {
      res.status(404).json({ error: `Flag not found: ${flagId}` })
      return
    }
    if (!toFlag) {
      res.status(404).json({ error: `Flag not found: ${dependsOn}` })
      return
    }

    // ── Cycle detection — only for REQUIRES edges ──────────────────────────
    // EXCLUDES edges don't participate in dependency chains,
    // so they can never create a cycle.
    if (type === 'requires') {
      const existingEdges = getAllDependencies(db)
      // Convert to FlagDependency format for cycle check
      const edges = existingEdges.map(d => ({
        fromFlagId: d.flagId,
        toFlagId: d.dependsOn,
        type: d.type.toUpperCase() as any,
      }))
      const wouldCycle = graphEngine.wouldCreateCycle(flagId, dependsOn, edges)

      if (wouldCycle) {
        res.status(409).json({
          error: 'This dependency would create a circular dependency',
          detail: `Adding "${fromFlag.name} requires ${toFlag.name}" would create a cycle`,
        })
        return
      }
    }

    // ── Save the edge ──────────────────────────────────────────────────────
    try {
      const dependency = createDependency(db, {
        fromFlagId: flagId,
        toFlagId: dependsOn,
        type: type.toUpperCase() as DependencyType,
      })
      res.status(201).json(dependency)
    } catch (err: any) {
      if (err.message?.includes('UNIQUE constraint failed')) {
        res.status(409).json({ error: 'This dependency already exists' })
        return
      }
      throw err
    }
  })

  // DELETE /dependencies/:id — remove a relationship
  router.delete('/:id', (req: Request, res: Response) => {
    const deleted = deleteDependency(db, req.params.id as string)
    if (!deleted) {
      res.status(404).json({ error: 'Dependency not found' })
      return
    }
    res.status(204).send()
  })

  return router
}