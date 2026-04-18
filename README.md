# Feature Flags Management System

A production-grade feature flags management application built with **React 19**, **Express.js**, **SQLite**, and **TypeScript**. Manage feature flags across multiple environments (dev, staging, prod) with built-in dependency validation, circular dependency detection, and graph visualization.

## Features

- ✅ **Multi-Environment Support**: Manage flags independently across dev, staging, and production
- ✅ **Dependency Management**: Create prerequisite (requires) and conflict (excludes) relationships between flags
- ✅ **Cycle Detection**: Automatic detection and prevention of circular dependencies
- ✅ **Conflict Resolution**: Smart modal showing prerequisite flags that must be enabled before toggling dependent flags
- ✅ **Graph Visualization**: Visual representation of flag dependencies and relationships
- ✅ **Type-Safe**: Full TypeScript support across frontend and backend
- ✅ **Real-time Validation**: Immediate feedback on invalid dependency operations

## Tech Stack

### Backend

- **Node.js** - Backend Language
- **Express.js 5.2.1** - HTTP API server
- **better-sqlite3** - Embedded SQL database
- **TypeScript 6.0.2** - Type safety
- **ts-node-dev** - Development server with auto-reload

### Frontend

- **React 19.2.5** - UI framework with latest hooks
- **React Router DOM 7.14.1** - Client-side routing
- **@xyflow/react 12.10.2** - Graph visualization
- **Tailwind CSS 4.2.2** - Utility-first styling
- **Vite 8.0.8** - Fast build tooling
- **TypeScript 6.0.2** - Type safety

### Monorepo

- **Turborepo** - Monorepo management
- **pnpm** - Package manager (recommended)

## Project Structure

```txt
feature-flags/
├── apps/
│   ├── api/                  # Express.js backend
│   │   ├── src/
│   │   │   ├── db/          # Database schema, queries, mappers
│   │   │   ├── routes/      # Express route handlers
│   │   │   ├── graph/       # Graph engine for validation
│   │   │   └── index.ts     # Server entry point
│   │   └── data/            # SQLite database file (auto-created)
│   │
│   └── web/                  # React 19 frontend
│       ├── src/
│       │   ├── pages/       # Route pages
│       │   ├── components/  # React components
│       │   ├── hooks/       # Custom hooks (useFlags)
│       │   ├── api/         # HTTP client
│       │   └── App.tsx      # Main app component
│       └── index.html       # Entry HTML
│
└── packages/
    └── types/              # Shared TypeScript types
        └── src/index.ts    # Type definitions (Flag, Dependency, etc.)
```

## Getting Started

### Prerequisites

- **Node.js 18+** (tested with v20)
- **pnpm 8+** or npm/yarn

### Installation

1. **Clone the repository**

   ```bash
   git clone <repo-url>
   cd feature-flags
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

   Or with npm:

   ```bash
   npm install
   ```

3. **Database Setup**
   - The SQLite database is automatically created on first run
   - Database file location: `apps/api/data/flags.db`
   - Schema is auto-initialized from `apps/api/src/db/schema.ts`
   - No manual migration steps required

### Development

**Start both API and frontend dev servers** (from root):

```bash
pnpm dev
```

This will start:

- **API**: `http://localhost:3001`
- **Frontend**: `http://localhost:5173`

**Or run services independently**:

```bash
# Start API only
pnpm dev --filter=api

# Start frontend only
pnpm dev --filter=web
```

### Building for Production

```bash
# Build all apps and packages
pnpm build

# Build specific app
pnpm build --filter=web
```

### Database Reset

Reset the database (deletes all flags and dependencies):

```bash
curl -X DELETE http://localhost:3001/reset
```

## API Endpoints

### Flags

- `GET /flags` - Get all flags with per-environment states
- `GET /flags/:id` - Get specific flag
- `POST /flags` - Create new flag (auto-seeds all environments as disabled)
- `PATCH /flags/:id` - Update flag name/description
- `PATCH /flags/:id/toggle` - Toggle flag in specific environment (with validation)
- `DELETE /flags/:id` - Delete flag

### Dependencies

- `GET /dependencies` - Get all dependencies
- `POST /dependencies` - Create new dependency (with cycle detection)
- `DELETE /dependencies/:id` - Remove dependency

### Graph

- `GET /graph?environment=dev` - Get dependency graph snapshot

## Key Concepts

### Flag States

Each flag has independent `on/off` states per environment:

```typescript
{
  id: "checkout-v2",
  name: "Checkout V2",
  states: {
    dev: true,      // Enabled in dev
    staging: false, // Disabled in staging
    prod: false     // Disabled in prod
  }
}
```

### Dependencies

Two types of relationships:

1. **Requires**: Flag A cannot be enabled unless Flag B is enabled

   ```txt
   checkout-v2 requires payment-service
   ```

2. **Excludes**: Flag A and Flag B cannot both be enabled simultaneously

   ```txt
   legacy-checkout excludes checkout-v2
   ```

### Validation Flow

When toggling a flag:

1. Load current graph state for that environment
2. Graph engine validates if operation is allowed
3. If prerequisites unmet or conflicts exist → Return 409 with suggested actions
4. Frontend shows conflict modal with resolution options
5. User selects actions to enable prerequisites
6. System chains toggles: prerequisites → target flag

### Cycle Detection

Before creating a `requires` dependency:

- Perform depth-first search on existing edges
- Detect if adding new edge would create cycle
- If cycle detected → Return 409 with involved flags
- Frontend shows cycle modal preventing invalid state

## Assumptions Made

1. **Single User/No Authentication**
   - No login system implemented; assumes single user or internal tool usage
   - All users see and can modify all flags

2. **SQLite Sufficiency**
   - better-sqlite3 chosen for simplicity; scales to ~100k flags comfortably
   - For production with millions of flags, consider PostgreSQL

3. **Graph Engine in Memory**
   - Full dependency graph loaded into memory on each toggle
   - Fine for <10k flags; larger graphs may need caching strategy

4. **Synchronous Dependency Validation**
   - Toggle validation is synchronous (graph engine computes instantly)
   - Suitable for small-to-medium graphs; async iteration for larger ones

5. **Environment as Property**
   - Environments (dev/staging/prod) are hardcoded as tuple
   - Adding new environments requires code changes, not config

6. **Frontend State via Hook**
   - All flag state managed in single `useFlags` hook with local React state
   - No external state manager (Zustand, Redux) to keep it lightweight

7. **CORS Permissive**
   - Backend allows all origins from `http://localhost:5173`
   - Hardcoded for development; should be configurable in production

## Improvements for Future Work

### High Priority

- [ ] **Authentication & Authorization**
  - Add login system (OAuth2, JWT tokens)
  - Role-based access control (viewer, editor, admin)
  - Audit logs for all flag changes

- [ ] **Persistence & Recovery**
  - Database backups and restore functionality
  - Change history/rollback capability
  - Flag version control and staged rollouts

- [ ] **Production Readiness**
  - Environment variables for database path, API port, origin
  - Structured logging and error tracking (Sentry/LogRocket)
  - Performance monitoring and metrics

### Medium Priority

- [ ] **Advanced Dependency Features**
  - Transitive dependency visualization
  - Impact analysis (show all affected flags when toggling)
  - Scheduled flag changes/cron support

- [ ] **Graph Visualization**
  - Better graph layout algorithms (currently uses Dagre)
  - Zoom/pan controls with minimap
  - Click-to-edit from graph view
  - Highlight dependency chains on hover

- [ ] **Testing**
  - Comprehensive unit tests for graph engine
  - Integration tests for toggle scenarios
  - E2E tests with Playwright for full workflows

- [ ] **UI/UX Polish**
  - Search/filter for large flag lists
  - Bulk operations (enable/disable multiple flags)
  - Dark/light theme toggle
  - Keyboard shortcuts
  - Undo/redo for recent changes

### Lower Priority

- [ ] **Scaling**
  - Migrate to PostgreSQL for production
  - Add Redis caching layer for graph snapshot
  - Implement pagination for large datasets
  - GraphQL API as alternative to REST

- [ ] **DevOps**
  - Docker containerization
  - GitHub Actions CI/CD pipeline
  - Kubernetes deployment templates
  - Performance benchmarking

- [ ] **Integration**
  - Webhook support for external systems
  - Slack notifications on flag changes
  - GitHub integration for deployment tracking
  - Feature flag SDK libraries (Go, Python, Java)

- [ ] **Accessibility**
  - Full WCAG 2.1 AA compliance audit
  - Screen reader testing
  - Keyboard navigation polish
  - High contrast mode

## Known Limitations

- **No real-time updates**: Changes not broadcast to other connected clients
- **Single instance only**: Running multiple API instances requires state synchronization
- **Conflict modal cannot auto-resolve**: Users must manually select prerequisite flags (backend could provide preferred resolution strategy)
- **No flag rollout strategies**: Binary on/off only (no percentage-based rollouts or canary deployments)
- **Graph visualization limited**: Large dependency graphs (1000+ edges) may render slowly

## Contributing

When contributing:

1. Follow TypeScript best practices
2. Add tests for new graph engine functionality
3. Update types in `packages/types` before frontend/backend
4. Test cycle detection scenarios thoroughly
5. Update README if adding major features

## License

MIT

---

**Built with ❤️ for feature flag management**
