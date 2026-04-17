import { Router, type Request, type Response } from 'express'
import type Database from 'better-sqlite3'
import {
  getAllFlags,
  getFlagById,
  createFlag,
  updateFlag,
  deleteFlag,
  getAllDependencies,
  getAllStates,
} from '../db/queries'

export function createFlagsRouter(db: Database.Database): Router {
  const router = Router()

  // GET /flags — list all flags with their states and dependencies
  router.get('/', (_req: Request, res: Response) => {
    const flags = getAllFlags(db)
    const states = getAllStates(db)
    const edges = getAllDependencies(db)

    // Attach states and dependencies to each flag so the
    // frontend gets everything it needs in one request
    const enriched = flags.map(flag => ({
      ...flag,
      states: states.filter(s => s.flagId === flag.id),
      dependencies: edges.filter(
        e => e.fromFlagId === flag.id || e.toFlagId === flag.id
      ),
    }))

    res.json(enriched)
  })

  // GET /flags/:id — single flag with full detail
  router.get('/:id', (req: Request, res: Response) => {
    const flag = getFlagById(db, req.params.id as string)
    if (!flag) {
      res.status(404).json({ error: 'Flag not found' })
      return
    }

    const states = getAllStates(db).filter(s => s.flagId === flag.id)
    const edges = getAllDependencies(db).filter(
      e => e.fromFlagId === flag.id || e.toFlagId === flag.id
    )

    res.json({ ...flag, states, dependencies: edges })
  })

  // POST /flags — create a new flag
  router.post('/', (req: Request, res: Response) => {
    const { name, description = '' } = req.body

    if (!name || typeof name !== 'string' || name.trim() === '') {
      res.status(400).json({ error: 'name is required' })
      return
    }

    try {
      const flag = createFlag(db, { name: name.trim(), description })
      res.status(201).json(flag)
    } catch (err: any) {
      // SQLite unique constraint on name will throw here
      if (err.message?.includes('UNIQUE constraint failed')) {
        res.status(409).json({ error: 'A flag with that name already exists' })
        return
      }
      throw err
    }
  })

  // PATCH /flags/:id — update name or description
  router.patch('/:id', (req: Request, res: Response) => {
    const { name, description } = req.body
    const updated = updateFlag(db, req.params.id as string, { name, description })
    if (!updated) {
      res.status(404).json({ error: 'Flag not found' })
      return
    }
    res.json(updated)
  })

  // DELETE /flags/:id
  router.delete('/:id', (req: Request, res: Response) => {
    const deleted = deleteFlag(db, req.params.id as string)
    if (!deleted) {
      res.status(404).json({ error: 'Flag not found' })
      return
    }
    res.status(204).send()
  })

  return router
}