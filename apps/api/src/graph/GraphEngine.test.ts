import {describe, it, expect} from 'vitest';
import type { FlagDependency, FlagEnvironmentState, Environment } from '@repo/types';
import { GraphEngine } from './graphEngine';

const engine = new GraphEngine();

// ── Helpers to keep tests readable ───────────────────────────────────────────

const requires = (from: string, to: string): FlagDependency => ({
  fromFlagId: from,
  toFlagId: to,
  type: 'REQUIRES',
})

const excludes = (a: string, b: string): FlagDependency => ({
  fromFlagId: a,
  toFlagId: b,
  type: 'EXCLUDES',
})

const flags = (ids: string[]) =>
  ids.map(id => ({ id, name: id }))

const states = (enabled: string[], env: 'dev' | 'staging' | 'prod' = 'prod'): FlagEnvironmentState[] =>
  enabled.map(flagId => ({ flagId, environment: env, enabled: true }))

// ─────────────────────────────────────────────────────────────────────────────
// Scenario 1: Simple chain — A, B requires A, C requires B
// ─────────────────────────────────────────────────────────────────────────────
describe('Scenario 1 — simple chain', () => {
  const edges = [requires('B', 'A'), requires('C', 'B')]
  const f = flags(['A', 'B', 'C'])

  it('blocks enabling C when A and B are off', () => {
    const result = engine.validateEnable('C', 'prod', states([]), edges, f)
    expect(result.valid).toBe(false)
    expect(result.suggestedActions?.some(a => a.flagId === 'B')).toBe(true)
  })

  it('blocks enabling C when only A is on', () => {
    const result = engine.validateEnable('C', 'prod', states(['A']), edges, f)
    expect(result.valid).toBe(false)
    // B is the direct prerequisite — that's what should be surfaced
    expect(result.suggestedActions?.some(a => a.flagId === 'B')).toBe(true)
  })

  it('allows enabling C when A and B are both on', () => {
    const result = engine.validateEnable('C', 'prod', states(['A', 'B']), edges, f)
    expect(result.valid).toBe(true)
  })

  it('blocks disabling A when B is enabled', () => {
    const result = engine.validateDisable('A', 'prod', states(['A', 'B']), edges, f)
    expect(result.valid).toBe(false)
    expect(result.suggestedActions?.some(a => a.flagId === 'B')).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Scenario 2: Mutual exclusion
// ─────────────────────────────────────────────────────────────────────────────
describe('Scenario 2 — mutual exclusion', () => {
  const edges = [excludes('OldCheckout', 'NewCheckout')]
  const f = flags(['OldCheckout', 'NewCheckout'])

  it('blocks enabling NewCheckout when OldCheckout is on', () => {
    const result = engine.validateEnable(
      'NewCheckout', 'prod', states(['OldCheckout']), edges, f
    )
    expect(result.valid).toBe(false)
    expect(result.suggestedActions?.some(a => a.flagId === 'OldCheckout')).toBe(true)
  })

  it('allows enabling NewCheckout when OldCheckout is off', () => {
    const result = engine.validateEnable(
      'NewCheckout', 'prod', states([]), edges, f
    )
    expect(result.valid).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Scenario 3: Diamond dependency — A, B→A, C→A, D→B and D→C
// ─────────────────────────────────────────────────────────────────────────────
describe('Scenario 3 — diamond dependency', () => {
  const edges = [
    requires('B', 'A'),
    requires('C', 'A'),
    requires('D', 'B'),
    requires('D', 'C'),
  ]
  const f = flags(['A', 'B', 'C', 'D'])

  it('blocks enabling D without all prerequisites', () => {
    const result = engine.validateEnable('D', 'prod', states(['A', 'B']), edges, f)
    expect(result.valid).toBe(false)
    // C is the missing direct prereq
    expect(result.suggestedActions?.some(a => a.flagId === 'C')).toBe(true)
  })

  it('allows enabling D when A, B, C are all on', () => {
    const result = engine.validateEnable('D', 'prod', states(['A', 'B', 'C']), edges, f)
    expect(result.valid).toBe(true)
  })

  it('impact radius of A includes B, C, D as dependents', () => {
    const impact = engine.getImpactAnalysis('A', edges)
    expect(impact.dependents).toContain('B')
    expect(impact.dependents).toContain('C')
    expect(impact.dependents).toContain('D')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Scenario 4: Conflict between exclusion and dependency
// A is on, B is on (B requires A), user tries to enable C (requires A, excludes B)
// ─────────────────────────────────────────────────────────────────────────────
describe('Scenario 4 — exclusion vs dependency conflict', () => {
  const edges = [
    requires('B', 'A'),
    requires('C', 'A'),
    excludes('C', 'B'),
  ]
  const f = flags(['A', 'B', 'C'])

  it('blocks enabling C when B is already on', () => {
    const result = engine.validateEnable('C', 'prod', states(['A', 'B']), edges, f)
    expect(result.valid).toBe(false)
    // Should tell user to disable B
    expect(result.suggestedActions?.some(
      a => a.flagId === 'B' && a.action === 'disable'
    )).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Scenario 5: Cycle prevention
// ─────────────────────────────────────────────────────────────────────────────
describe('Scenario 5 — cycle prevention', () => {
  it('detects a direct cycle A→B, B→A', () => {
    const existingEdges = [requires('A', 'B')]
    // Trying to add B→A — would close A→B→A
    expect(engine.wouldCreateCycle('B', 'A', existingEdges)).toBe(true)
  })

  it('detects a 3-node cycle A→B, B→C, C→A', () => {
    const existingEdges = [requires('A', 'B'), requires('B', 'C')]
    // Trying to add C→A
    expect(engine.wouldCreateCycle('C', 'A', existingEdges)).toBe(true)
  })

  it('allows a non-cycle edge', () => {
    const existingEdges = [requires('A', 'B'), requires('B', 'C')]
    // Adding D→A — perfectly fine
    expect(engine.wouldCreateCycle('D', 'A', existingEdges)).toBe(false)
  })
})