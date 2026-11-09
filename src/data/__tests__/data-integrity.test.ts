import { describe, it, expect } from 'vitest'
import collegeData from '../2026-06-15.json'

const colleges = collegeData.colleges

describe('data integrity', () => {
  it('has a reasonable number of entries', () => {
    expect(colleges.length).toBeGreaterThan(1600)
  })

  it('every entry has required fields', () => {
    for (const c of colleges) {
      expect(c.id).toBeTruthy()
      expect(c.name).toBeTruthy()
      expect(c.state).toBeTruthy()
      expect(c.league).toBeTruthy()
      expect(c.gender).toMatch(/^(mens|womens)$/)
      expect(typeof c.lat).toBe('number')
      expect(typeof c.lng).toBe('number')
    }
  })

  it('every entry has coaches and coaches_updated fields', () => {
    for (const c of colleges) {
      expect(c).toHaveProperty('coaches')
      expect(c).toHaveProperty('coaches_updated')
      expect(Array.isArray(c.coaches)).toBe(true)
    }
  })

  it('all NCAA D1 programs have a conference', () => {
    const d1 = colleges.filter(
      (c) => c.league === 'NCAA' && c.division === 'D1',
    )
    expect(d1.length).toBeGreaterThan(200)
    for (const c of d1) {
      expect(c.conference).toBeTruthy()
    }
  })

  it('most NCAA D1 mens programs have coach data', () => {
    const d1m = colleges.filter(
      (c) => c.league === 'NCAA' && c.division === 'D1' && c.gender === 'mens',
    )
    const withCoaches = d1m.filter(
      (c) =>
        c.coaches.length > 0 &&
        c.coaches.some((coach: { name: string }) => coach.name),
    )
    expect(withCoaches.length).toBeGreaterThan(70)
  })

  it('SMU D1 entry has first_season field', () => {
    const smu = colleges.find(
      (c) => c.name === 'SMU' && c.league === 'NCAA' && c.division === 'D1',
    )
    expect(smu).toBeTruthy()
    expect((smu as Record<string, unknown>).first_season).toBe(2028)
  })

  it('coach entries have the expected shape', () => {
    const withCoaches = colleges.filter((c) => c.coaches.length > 0)
    for (const c of withCoaches) {
      for (const coach of c.coaches) {
        expect(coach).toHaveProperty('name')
        expect(coach).toHaveProperty('title')
        expect(coach).toHaveProperty('email')
      }
    }
  })

  it('no duplicate IDs', () => {
    const ids = colleges.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
