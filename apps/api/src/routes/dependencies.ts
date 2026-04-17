import { Router, type Request, type Response } from 'express'
import type Database from 'better-sqlite3'
import { getAllDependencies, createDependency, deleteDependency, getFlagById } from '../db/queries'
import type { DependencyType } from '@repo/types'
import { graphEngine } from '../graph/graphEngine'

export function createDependenciesRouter(db: Database.Database): Router {
  const router = Router()

  // POST /dependencies — declare a new relationship between two flags
  router.post('/', (req: Request, res: Response) => {
    const { fromFlagId, toFlagId, type } = req.body

    // ── Input validation ───────────────────────────────────────────────────
    if (!fromFlagId || !toFlagId || !type) {
      res.status(400).json({ error: 'fromFlagId, toFlagId, and type are required' })
      return
    }

    if (!['REQUIRES', 'EXCLUDES'].includes(type)) {
      res.status(400).json({ error: 'type must be REQUIRES or EXCLUDES' })
      return
    }

    if (fromFlagId === toFlagId) {
      res.status(400).json({ error: 'A flag cannot depend on itself' })
      return
    }

    // ── Confirm both flags exist ───────────────────────────────────────────
    const fromFlag = getFlagById(db, fromFlagId)
    const toFlag = getFlagById(db, toFlagId)

    if (!fromFlag) {
      res.status(404).json({ error: `Flag not found: ${fromFlagId}` })
      return
    }
    if (!toFlag) {
      res.status(404).json({ error: `Flag not found: ${toFlagId}` })
      return
    }

    // ── Cycle detection — only for REQUIRES edges ──────────────────────────
    // EXCLUDES edges don't participate in dependency chains,
    // so they can never create a cycle.
    if (type === 'REQUIRES') {
      const existingEdges = getAllDependencies(db)
      const wouldCycle = graphEngine.wouldCreateCycle(fromFlagId, toFlagId, existingEdges)

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
        fromFlagId,
        toFlagId,
        type: type as DependencyType,
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