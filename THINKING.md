# Feature Flag System — Thinking Log

> Running log of decisions, research, and uncertainties.
> Written as I go, not polished after the fact.

---

## Setup — 14/04/26

### First impressions

Reading through the spec, the core challenge here is not CRUD — it's the graph logic.
Flags form a directed graph where edges are either REQUIRES or EXCLUDES relationships.
The interesting problems are: cycle detection, transitive traversal, and conflict resolution UX.

My instinct is to build the graph engine as a pure, stateless module first (no HTTP, no DB),
get it right with unit tests against the five scenarios, then wire everything else around it.

### How I'm breaking this down

- [x] Monorepo scaffold (Turborepo + pnpm)
- [x] Shared types package (@repo/types)
- [x] Database schema (flags, environments, dependencies)
- [x] Graph engine (pure logic — cycle detection, validation, traversal)
- [x] Unit tests for all five scenarios in the spec
- [x] REST API (Express routes calling the graph engine)
- [x] Frontend scaffold (Vite + React)
- [x] Flag list + create/edit UI
- [x] Toggle UI with conflict resolution modal
- [x] Dependency graph visualization (React Flow + Dagre)
- [x] Polish, README, final THINKING.md pass

### Decision: Turborepo + pnpm over a simpler setup

**What I chose:** Turborepo monorepo with pnpm workspaces.
**Why:** The shared types package is genuinely useful here, both the API and the frontend will pass `Flag`, `FlagDependency`, and `ValidationResult` shapes around. Having one
source of truth prevents the frontend and backend from drifting out of sync.
**Tradeoff:** First time using Turborepo, so there was setup friction upfront, particularly
around pnpm workspaces not recognising local packages until `pnpm-workspace.yaml` was correctly configured with `apps/*` and `packages/*`.
**What I'd do at scale:** Same approach, potentially with Nx for larger teams.

### Decision: SQLite over Postgres

**What I chose:** SQLite via better-sqlite3.
**Why:** Zero-config local setup, no Docker required, sufficient for this scope.
The data access patterns are simple — no heavy concurrency, no complex joins.
**Tradeoff:** Not production-grade. Concurrent writes would be a problem.
**What I'd do at scale:** Postgres with a proper migration tool (Drizzle or Prisma).

### Decision: pnpm over Bun

**What I chose:** pnpm.
**Why:** Already familiar with it, and under time pressure the last thing I need is
debugging Bun compatibility issues with Express or TypeScript tooling. Bun is faster
but has subtle incompatibilities with some Node.js APIs. Sticking with what I know
was the right call for a timed assessment.

### What I researched

- Turborepo docs — workspace setup, `turbo.json` pipeline config
- DFS cycle detection: the key insight is you need a `visited` Set starting from the target node. If DFS can reach the source node through existing edges, the new edge would close a loop. You don't need the three-state (unvisited/visiting/visited) approach for this specific use case, a simple visited Set is enough because we're only asking "can I get from Y to X?" not doing a full graph traversal.
- React Flow — the right library for graph visualisation. Has a Dagre layout example in their docs which handles automatic node positioning.
- Dagre — graph layout algorithm library. Works alongside React Flow to position nodes automatically in a left-to-right layout so they don't overlap.

### Decision: REQUIRES edges only for cycle detection

**What I chose:** Only traverse REQUIRES edges when checking for cycles.
**Why:** EXCLUDES is a co-existence constraint, not a transitive dependency. If A excludes B, that tells us nothing about what B depends on. Cycles only matter in dependency chains, "A needs B needs C needs A" — which can only happen with REQUIRES edges. Including EXCLUDES edges in cycle detection would produce false positives.

### Decision: Dependencies are global, states are per-environment

**What I chose:** `flag_dependencies` rows are environment-agnostic. Only `flag_states`
rows are scoped per environment.
**Why:** "Flag B requires Flag A" is a structural relationship that doesn't change
between dev and prod. What changes is whether each flag is currently enabled in each
environment. This keeps the data model clean — one table for the graph structure,
one table for the runtime state.

### Currently uncertain about (both resolved)

- Whether "excludes" edges should participate in cycle detection — resolved: no, only
  REQUIRES edges form dependency chains that can cycle.
- How granular environment scoping should be — resolved: dependencies are global,
  states are per-environment.

---

## Day 1 — 14/04/26

### What I worked on

- Turborepo + pnpm monorepo scaffold
- Shared `@repo/types` package with `Flag`, `FlagDependency`, `FlagEnvironmentState`,
  `ValidationResult`, `SuggestedAction`, `DependencyType`, `Environment` types
- SQLite database schema — three tables: `flags`, `flag_states`, `flag_dependencies`
- GraphEngine class — `wouldCreateCycle`, `validateEnable`, `validateDisable`,
  `getImpactAnalysis` (pure functions, no DB dependency)
- Unit tests for all five spec scenarios using Vitest

### Decision: GraphEngine takes data arrays, not a DB connection

**What I chose:** All GraphEngine methods accept flags/edges/states as plain arrays.
The Express route handler loads from SQLite and passes data in.
**Why:** The engine can be unit tested without a database — just pass mock arrays.
This is the key architectural decision that keeps the graph logic clean and testable.
The Express routes are the only place that touch the DB.

### Decision: Only check direct prerequisites in validateEnable

**What I chose:** `validateEnable` only checks that direct prerequisites are enabled,
not transitive ones.
**Why:** When Flag B was enabled, the system already validated that Flag A was on.
The invariant is maintained at enable time. If B is on, A must already be on — so checking
one level up is sufficient. Checking transitively would be redundant.

### Decision: Seed flag_states rows on flag creation

**What I chose:** When a flag is created, immediately insert OFF state rows for all
three environments (dev, staging, prod).
**Why:** The toggle route can always use UPDATE rather than INSERT-or-UPDATE. No
"missing state row" edge case to handle downstream. Simpler logic everywhere.

### What I learned about graphs and DFS

A graph is just things (nodes) with connections (edges) between them. For this project,
flags are nodes and REQUIRES/EXCLUDES relationships are edges. Every edge is stored as
one row in `flag_dependencies` — that table IS the graph written down.

DFS (Depth First Search) is a graph traversal that goes as deep as possible down one
path before backing up and trying another — like exploring a cave, going all the way
down one tunnel before trying the next one.

For cycle detection: to check if adding edge X→Y would create a cycle, start DFS from
Y using only existing REQUIRES edges. If you can reach X — the new edge would close a
loop and must be rejected. If DFS exhausts the graph without finding X — safe to add.

The visited Set prevents infinite loops during traversal. Once a node is fully explored,
mark it so you don't visit it again.

Key distinction between the three tables:
- `flags` — identity of each flag (name, description). Changes rarely.
- `flag_states` — is this flag ON or OFF in this environment? Changes frequently.
- `flag_dependencies` — the graph edges. Changes occasionally.

### All 5 unit tests passing

Scenarios verified by unit tests:
1. Simple chain (A, B requires A, C requires B) — blocking and cascading work correctly
2. Mutual exclusion (OldCheckout excludes NewCheckout) — bidirectional check works
3. Diamond dependency (D requires B and C, both require A) — all prereqs checked
4. Exclusion vs dependency conflict (C requires A, excludes B, B is on) — blocked correctly
5. Cycle prevention (A→B→C→A) — rejected at edge creation time

### Harder than expected

Understanding when to use two-state vs three-state DFS. For a full graph cycle search
you need three states (unvisited/visiting/visited) to detect back-edges within the current
DFS stack. For the specific question "can I reach X from Y?" a simple visited Set is enough.
Spent time understanding the difference before settling on the simpler approach.

### End of day status

GraphEngine fully tested. All 5 spec scenarios pass. Ready to move to the HTTP layer.

---

## Day 2 — 17/04/26

### What I worked on

- `db/queries.ts` — data access layer (all SQL in one file)
- `db/mappers.ts` — row mapping from snake_case DB columns to camelCase TypeScript types
- Express routes: `flags.ts`, `dependencies.ts`, `toggle.ts`, `graph.ts`
- `index.ts` — entry point wiring all routes together with middleware
- Debugging and fixing the snake_case/camelCase mismatch bug

### Decision: queries.ts as a data access layer

**What I chose:** All SQL lives in one file — `queries.ts`. Routes never write SQL inline.
**Why:** If a column is renamed or an index changes, it's one place to update. Also makes
it immediately obvious at a glance what database operations exist. Routes stay clean.

### Decision: mappers.ts for DB row conversion

**What I chose:** A `mappers.ts` file with one converter function per table (`toFlag`,
`toFlagDependency`, `toFlagState`). Every query calls the relevant mapper on its results.
**Why:** `better-sqlite3` returns raw snake_case column names from the database. TypeScript
types use camelCase. Rather than mapping inline in every query (verbose) or using SQL
aliases on every SELECT (requires listing all columns explicitly), a shared mapper file
gives a single source of truth for all column name and type conversions.

Three options were considered:
1. SQL aliases (`SELECT from_flag_id AS fromFlagId`) — works but requires listing every
   column in every SELECT query, easy to miss when adding columns
2. `mappers.ts` with one function per table — chosen approach, clean and maintainable
3. Driving mappers from a config object in `@repo/types` using a generic `makeMapper`
   function — elegant pattern but genuinely overkill for three tables

**Also handles:** SQLite boolean representation. SQLite stores booleans as 0/1 integers.
The mapper converts these explicitly with `row.enabled === 1` rather than relying on
JavaScript's truthy coercion, which avoids subtle comparison bugs.

### Decision: Why NOT to rename SQLite columns to camelCase

Considered renaming DB columns to camelCase to eliminate the mismatch at source.
Rejected because:
- SQL reads badly with camelCase (`SELECT fromFlagId FROM flagDependencies`)
- Every SQL tool (TablePlus, DB Browser, raw queries) expects snake_case — looks like a mistake
- Doesn't solve the fundamental problem — the mismatch between SQL world (snake_case) and
  JS world (camelCase) is permanent. A translation layer is the correct solution.
- ORMs like Prisma and Drizzle all use exactly this mapper pattern for the same reason.

### Decision: 409 for validation failures, not 400

**What I chose:** Return HTTP 409 Conflict when the graph engine rejects a toggle.
**Why:** 400 Bad Request means the request was malformed. 409 Conflict means the request
was valid but conflicts with the current state of the resource. When validateEnable returns
`valid: false`, the HTTP request itself was fine — the conflict is with the graph state.
409 is semantically correct and tells the frontend exactly what type of error occurred.

### Bug found and fixed: snake_case vs camelCase mismatch

**The bug:** Toggle route was returning success even when prerequisites were not met.
Flag B was being enabled despite Flag A being off.

**Root cause:** `better-sqlite3` returns raw DB column names. The edges array contained
objects with `from_flag_id` and `to_flag_id` keys, but `GraphEngine.validateEnable` was
checking `edge.fromFlagId` and `edge.toFlagId` — both `undefined`. So every filter
returned an empty array, `unmetPrereqs` was empty, and validation always passed.

**How I found it:** Added a debug `console.log` of all inputs to the toggle route before
the validation call. The terminal output showed:
```
edges: [{ "from_flag_id": "...", "to_flag_id": "...", "type": "REQUIRES" }]
```
The camelCase properties the engine expected simply didn't exist on the objects.

**Fix:** Applied `mappers.ts` to all query functions so every row is converted to
camelCase as it leaves the database. The rest of the app — GraphEngine, routes —
only ever sees correctly-shaped TypeScript objects.

**Lesson learned:** When a validation function returns an unexpected result, log its
actual inputs FIRST before touching the logic. The logic was correct — the data
coming in was wrong. This saved significant debugging time once applied.

**Secondary fix:** `enabled: row.enabled === 1` explicit boolean conversion. Without
this, `state.enabled` would be the integer `0` or `1` instead of `false` or `true`,
which could cause subtle issues in strict boolean comparisons.

### What I researched

- HTTP status codes — specifically 400 (bad request), 409 (conflict), 422 (unprocessable)
- better-sqlite3 synchronous API — intentionally sync, which simplifies route handlers
  significantly since no async/await is needed for DB operations
- Express Router factory pattern — `createFlagsRouter(db)` injects the DB instance
  into each router rather than using a global, which keeps things testable

### Harder than expected

The snake_case bug was harder to find than expected because the validation logic looked
entirely correct on inspection. The bug was invisible without logging actual runtime values.
This reinforced the habit of always logging inputs before debugging logic.

Understanding which HTTP status code to use for "valid request, but business rules reject
it" also took research. 409 was the right answer but it wasn't immediately obvious why
it was more appropriate than 422.

### End of day status

Backend fully working. All routes tested via Postman and the curl smoke test script.
All 5 spec scenarios verified through the live API. Seed script created for repeatable
testing. Ready to start the frontend.

---

## Day 3 — [18/04/2026]

### What I worked on

- Frontend scaffold with Vite + React + TypeScript
- `api/client.ts` — all fetch calls centralised, 409 handled as data not error
- `hooks/useFlags.ts` — shared data layer, toggle logic, conflict state management
- `components/ConflictModal.tsx` — conflict resolution UI
- `App.tsx` — routing setup + global environment switcher in navbar
- `pages/FlagsPage.tsx` — flags list with inline toggles
- `pages/GraphPage.tsx` — React Flow + Dagre visualisation

### Decision: api/client.ts centralises all fetch calls

**What I chose:** One `api` object with typed methods for every endpoint. Pages and
hooks never call `fetch` directly.
**Why:** If the API URL changes, or auth headers are added, there is one file to update.
Also makes it obvious at a glance what API operations the frontend performs.
The 409 response is handled here — returned as data rather than thrown as an error,
because the UI needs to display the conflict modal, not catch an exception.

### Decision: ConflictModal lives at page level, not inside FlagCard

**What I chose:** The conflict modal is rendered at the page level, with conflict state
managed in `useFlags`.
**Why:** The modal needs to trigger async resolution actions and then reload the flags
list. If it lived inside `FlagCard`, each card would need its own modal instance and
its own reload logic. Lifting state to the page level means one modal, one reload,
clean separation of concerns.

### Decision: useFlags hook owns all toggle logic including conflict state

**What I chose:** The 409 conflict response is stored as state in `useFlags`, not
thrown as an error for the page to handle.
**Why:** A 409 is not an error — it's a valid state the UI needs to respond to. Keeping
the conflict flow in the hook means pages stay thin. The `resolveConflict` function
executes all suggested actions in sequence then retries the original toggle — the page
doesn't need to know any of this logic, it just calls `resolveConflict()`.

### Decision: React Flow + Dagre for graph visualisation

**What I chose:** `@xyflow/react` (React Flow v12) for node/edge rendering and
`dagre` for automatic layout.
**Why:** React Flow handles all the hard parts — node rendering, drag, zoom, pan,
edge routing. Dagre solves the layout problem (where to position nodes so they don't
overlap). Tried to plan manual graph layout — not worth it for this scope.
The combination is the standard approach for this type of UI in the React ecosystem.

**How the graph works visually:**
- Green nodes = flag enabled in selected environment, grey = disabled
- REQUIRES edges are solid arrows
- EXCLUDES edges are dashed red arrows
- Clicking a node fades unrelated nodes/edges and highlights the selected flag's
  impact radius using pre-computed impact data from `GET /graph`
- Clicking the canvas background resets all opacities

### What I researched

- React Flow v12 API (`@xyflow/react`) — significant changes from v10/v11, the package
  name changed. Most online tutorials still show v10/v11 which caused confusion.
- Dagre layout options — `rankdir: 'LR'` for left-to-right, `ranksep` and `nodesep`
  for spacing. The layout runs once after data loads, then React Flow manages positions.
- react-router-dom v6 — `useNavigate`, `useParams`, `<Routes>` replacing old `<Switch>`

### Harder than expected

React Flow v12 had breaking changes from v11. The package is now `@xyflow/react` and
several prop names changed. Most tutorials still show v10/v11 syntax which caused
confusion when things didn't work as documented online.

Dagre positions node centres, but React Flow positions node top-left corners. Needed to
subtract half the node dimensions from Dagre's output to align them correctly — this
wasn't documented clearly and required trial and error.

### End of day status

[Fill in at end of day]

---

## Testing

### Layer 1 — Unit tests (Vitest)

All 5 GraphEngine scenario tests pass. These cover pure graph logic in isolation:
`wouldCreateCycle`, `validateEnable`, `validateDisable`, `getImpactAnalysis`.

Run with: `cd apps/api && pnpm test`

### Layer 2 — API integration tests

Created a seed script (`src/scripts/seed.ts`) that populates all 5 spec scenarios
into the database with known, logged flag IDs. Created a `test.sh` bash script that
runs curl commands against each scenario and checks expected responses.

Key things confirmed by API tests:
- snake_case mapper fix working correctly end-to-end
- 409 responses include `suggestedActions` with correct flag IDs and action types
- Cycle detection correctly rejects circular REQUIRES edges at declaration time
- EXCLUDES validation is correctly bidirectional (checking both edge directions)
- `GET /graph` returns nodes with pre-computed impact radius data

Run with: `pnpm seed` then `./test.sh`

### Layer 3 — Manual scenario walkthrough

Manually walked through all 5 spec scenarios in the browser with both servers running.

- Conflict modal appears correctly on 409 and shows human-readable reason and flag names
- "Resolve & continue" executes all suggested actions in sequence then retries the toggle
- Graph page renders correct node colours (green = on, grey = off) per environment
- REQUIRES edges are solid, EXCLUDES edges are dashed red
- Clicking a node highlights impact radius, clicking background resets
- Switching environment in the navbar re-fetches and updates the graph

---

## Decisions Log

| Decision | Choice | Reason |
|---|---|---|
| Package manager | pnpm | Already familiar, avoids Bun compatibility risk under time pressure |
| Monorepo tool | Turborepo | Shared types between API and web is worth the setup cost |
| Database | SQLite (better-sqlite3) | Zero-config, sufficient for this scope |
| Excludes direction | Bidirectional | If A excludes B, B excludes A — store once, query symmetrically |
| Dependency scope | Global (not per-environment) | Dependencies describe relationships; states vary per-environment |
| Cycle detection scope | REQUIRES edges only | EXCLUDES is a co-existence constraint, not a transitive dependency |
| DB column mapping | mappers.ts | Single source of truth for snake_case → camelCase conversion |
| Boolean conversion | `row.enabled === 1` | SQLite stores 0/1; explicit conversion avoids truthy coercion bugs |
| Validation HTTP status | 409 Conflict | Request was valid; conflict is with graph state, not the request itself |
| GraphEngine input | Plain data arrays | No DB dependency means pure unit testing without any mocking |
| Direct prereqs only | validateEnable checks one level | Invariant maintained at enable time — transitives already guaranteed |
| Seed states on create | Insert OFF rows for all envs | Toggle route can always UPDATE, no INSERT-or-UPDATE edge case |
| ConflictModal location | Page level, not FlagCard | One modal, one reload, shared conflict state via useFlags hook |
| 409 as data not error | Handled in api/client.ts | Frontend needs to show modal, not catch an exception |
| Graph layout | React Flow + Dagre | React Flow renders, Dagre positions — standard combination for this use case |

---

## Assumptions Made

- Dependencies are global across environments. A REQUIRES B in all environments.
  What changes per-environment is whether flags are enabled or disabled.
- "Excludes" is bidirectional. If A excludes B, the system also prevents B from
  being enabled when A is on, even if only A→B was declared.
- Circular dependencies are rejected at declaration time, not at enable time.
- When a user tries to enable a flag with unmet prerequisites, the system shows
  what needs to change but does not auto-resolve — the user must confirm.
- Deleting a flag removes its dependency rows via ON DELETE CASCADE. This means
  dependent flags lose their relationship silently rather than being blocked. This
  is a tradeoff — simpler implementation but potentially surprising behaviour.
- validateEnable only checks direct prerequisites, not transitive ones. The invariant
  that "if B is enabled, A must be on" is maintained by the system at enable time,
  making transitive checks redundant.

---

## If I Had More Time

- Postgres + a proper migration tool (Drizzle or Prisma) instead of SQLite
- Auth + multi-user support with per-user audit logs
- Cascade simulation — "dry run" showing exactly what would change before confirming.
  This is the most impactful stretch goal from the spec.
- Automated end-to-end tests with Playwright covering all 5 spec scenarios so
  regressions are caught automatically without manual walkthroughs
- API contract tests to verify response shapes don't drift between frontend and backend
- Better error boundaries and loading states throughout the frontend
- Import/export of flag configurations as JSON
- More thorough unit test coverage for edge cases in graph traversal (very large graphs,
  flags with many dependencies, disconnected subgraphs)
- Bulk toggle operations with dependency-aware validation across the whole batch