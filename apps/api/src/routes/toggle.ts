import type { Environment } from '@repo/types'
import type Database from 'better-sqlite3'
import { Router, type Request, type Response } from 'express'
import { getFlagById, loadGraphSnapshot, setFlagEnabled } from '../db/queries'
import { graphEngine } from '../graph/graphEngine'

export function createToggleRouter(db: Database.Database): Router {
  const router = Router()

  // PATCH /flags/:id/toggle
  //
  // Body: { environment: "dev" | "staging" | "prod", enabled: boolean }
  //
  // This route does the full validation dance before touching the DB:
  //   1. Load the current graph state for this environment
  //   2. Ask the engine if the change is valid
  //   3. If valid — write to DB and respond with success
  //   4. If invalid — respond with 409 + the reason + suggested fixes
  //
  router.patch('/:id/toggle', (req: Request, res: Response) => {
    const { environment, enabled } = req.body
    const flagId = req.params.id

    // ── Input validation ───────────────────────────────────────────────────
    if (!environment || !['dev', 'staging', 'prod'].includes(environment)) {
      res.status(400).json({ error: 'environment must be dev, staging, or prod' })
      return
    }

    if (typeof enabled !== 'boolean') {
      res.status(400).json({ error: 'enabled must be a boolean' })
      return
    }

    // ── Confirm flag exists ────────────────────────────────────────────────
    const flag = getFlagById(db, flagId)
    if (!flag) {
      res.status(404).json({ error: 'Flag not found' })
      return
    }

    // ── Load full graph state for this environment ─────────────────────────
    // This is the "load from DB, pass to engine" pattern.
    // The engine gets plain data arrays — it never calls the DB itself.
    const { flags, edges, states } = loadGraphSnapshot(db, environment as Environment)

    // DEBUG — remove after fixing
  console.log('=== TOGGLE DEBUG ===')
  console.log('flagId:', flagId)
  console.log('environment:', environment)
  console.log('enabled:', enabled)
  console.log('flags count:', flags.length)
  console.log('edges count:', edges.length)
  console.log('states count:', states.length)
  console.log('edges:', JSON.stringify(edges, null, 2))
  console.log('states:', JSON.stringify(states, null, 2))

    // ── Ask the graph engine
    const validation = enabled
      ? graphEngine.validateEnable(flagId as string, environment, states, edges, flags)
      : graphEngine.validateDisable(flagId as string, environment, states, edges, flags)

    if (!validation.valid) {
      // Return 409 Conflict with the full validation result.
      // The frontend will use suggestedActions to render the resolution UI.
      res.status(409).json(validation)
      return
    }

    // ── Write to DB 
    setFlagEnabled(db, flagId as string, environment as Environment, enabled)

    res.json({
      flagId,
      environment,
      enabled,
      message: `Flag ${enabled ? 'enabled' : 'disabled'} successfully`,
    })
  })

  return router
}