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
- [ ] Database schema (flags, environments, dependencies)
- [ ] Graph engine (pure logic — cycle detection, validation, traversal)
- [ ] Unit tests for all five scenarios in the spec
- [ ] REST API (Express routes calling the graph engine)
- [ ] Frontend scaffold (Vite + React)
- [ ] Flag list + create/edit UI
- [ ] Toggle UI with conflict resolution modal
- [ ] Dependency graph visualization (React Flow + Dagre)
- [ ] Polish, README, final THINKING.md pass

### Decision: Turborepo + pnpm over a simpler setup

**What I chose:** Turborepo monorepo with pnpm workspaces.
**Why:** The shared types package is genuinely useful here — both the API and the frontend
will pass `Flag`, `FlagDependency`, and `ValidationResult` shapes around. Having one
source of truth prevents the frontend and backend from drifting out of sync.
**Tradeoff:** First time using Turborepo, so there's some setup friction upfront.
**What I'd do at scale:** Same approach, potentially with Nx for larger teams.

### Decision: SQLite over Postgres

**What I chose:** SQLite via better-sqlite3.
**Why:** Zero-config local setup, no Docker required, sufficient for this scope.
The data access patterns are simple — no heavy concurrency, no complex joins.
**Tradeoff:** Not production-grade. Concurrent writes would be a problem.
**What I'd do at scale:** Postgres with a proper migration tool (Drizzle or Prisma).

### What I researched today

- Turborepo docs — workspace setup, `turbo.json` pipeline config
- DFS cycle detection: three-state approach (unvisited / visiting / visited).
  Key insight: you need the "visiting" state specifically to catch back-edges
  in the current DFS path, not just "have I seen this node before."
- React Flow — looks like the right library for the graph visualization.
  Has a Dagre layout example in their docs which handles auto-positioning.

### Currently uncertain about

- Whether "excludes" edges should participate in cycle detection the same way
  "requires" edges do. My current thinking: no — A excludes B doesn't mean
  B transitively requires A, it's a co-existence constraint, not a dependency.
  I'll model them separately and only traverse REQUIRES edges for cycle checks.
- How granular environment scoping should be for dependencies. Should a dependency
  declared in prod also apply in dev? I'm going to treat dependencies as global
  (they describe the relationship between flags, not per-environment) but states
  are per-environment. Will document this assumption clearly.

### Harder than expected

[Fill in as you go]

### End of day status

[Fill in at end of day]

---

## Day 1 — [Date]

### What I worked on

[Fill in as you go]

### Decisions made

[Fill in as you go]

### Harder than expected

[Fill in as you go]

### Currently uncertain about

[Fill in as you go]

### End of day status

[Fill in at end of day]

---

## Day 2 — [Date]

### What I worked on

[Fill in as you go]

### Decisions made

[Fill in as you go]

### Harder than expected

[Fill in as you go]

### Currently uncertain about

[Fill in as you go]

### End of day status

[Fill in at end of day]

---

## Day 3 — [Date]

### What I worked on

[Fill in as you go]

### Decisions made

[Fill in as you go]

### Harder than expected

[Fill in as you go]

### End of day status

[Fill in at end of day]

---

## Decisions Log

_One entry per non-trivial choice._

| Decision | Choice | Reason |
|---|---|---|
| Package manager | pnpm | Already familiar, avoids Bun compatibility risk under time pressure |
| Monorepo tool | Turborepo | Shared types between API and web is worth the setup cost |
| Database | SQLite (better-sqlite3) | Zero-config, sufficient for this scope |
| Excludes direction | Bidirectional | If A excludes B, B excludes A by definition — store once, query symmetrically |
| Dependency scope | Global (not per-environment) | Dependencies describe relationships; states are what vary per-environment |
| Cycle detection scope | REQUIRES edges only | EXCLUDES is a co-existence constraint, not a transitive dependency |

---

## Assumptions Made

- Dependencies are global across environments. A REQUIRES B in all environments.
  What changes per-environment is whether flags are enabled or disabled.
- "Excludes" is bidirectional. If A excludes B, the system also prevents B from
  being enabled when A is on, even if only A→B was declared.
- Circular dependencies are rejected at declaration time, not at enable time.
- When a user tries to enable a flag with unmet prerequisites, the system shows
  what needs to change but does not auto-resolve — the user must confirm.
- Deleting a flag that other flags depend on is blocked until dependencies are removed.

---

## If I Had More Time

- Postgres + a proper migration tool instead of SQLite
- Auth + multi-user support with per-user audit logs
- Cascade simulation ("dry run" before confirming bulk changes)
- Proper end-to-end tests (Playwright or Cypress)
- Better error boundaries and loading states in the frontend
- Import/export of flag configurations (JSON)
- More thorough unit test coverage, especially around edge cases in graph traversal