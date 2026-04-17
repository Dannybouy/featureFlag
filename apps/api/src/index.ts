import cors from 'cors'
import express from 'express'
import fs from 'fs'
import path from 'path'
import { createDatabase } from './db/schema'
import { createDependenciesRouter } from './routes/dependencies'
import { createFlagsRouter } from './routes/flags'
import { createGraphRouter } from './routes/graph'
import { createToggleRouter } from './routes/toggle'


// Ensure the data directory exists before SQLite tries to open the file
const dataDir = path.join(process.cwd(), 'data')
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

const db = createDatabase()
const app = express()

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: 'http://localhost:5173' })) // Vite's default port
app.use(express.json())

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/flags', createFlagsRouter(db))
app.use('/flags', createToggleRouter(db))   // PATCH /flags/:id/toggle
app.use('/dependencies', createDependenciesRouter(db))
app.use('/graph', createGraphRouter(db))

// ── Health check 
app.get('/health', (_req, res) => res.json({ status: 'ok' }))

// Delete all data in db
app.delete('/reset', (req, res) => {
  // Implementation for resetting the database
  db.exec(`DELETE FROM flag_states; DELETE FROM flag_dependencies; DELETE FROM flags;`)
  res.status(204).send()

})


// ── Global error handler 
// Catches anything a route handler throws with next(err) or an unhandled throw.
// Without this, Express returns an ugly HTML error page instead of JSON.
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err)
  res.status(500).json({ error: 'Internal server error', detail: err.message })
})

const PORT = process.env.PORT ?? 3001
app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`)
})