import { describe, it, expect } from 'vitest'
import {
  buildContext,
  mergeTemplate,
  resolveAllVars,
  findUnknownVars,
  detectHardcodedSchoolNames,
} from '../template'
import type { SchoolData } from '../template'
import type { Coach } from '../coaches'

const school: SchoolData = {
  name: 'Brown University',
  city: 'Providence',
  state: 'RI',
  league: 'NCAA',
  division: 'D1',
  conference: 'Ivy League',
  team_website_url: 'https://brownbears.com/sports/mens-lacrosse',
  website_url: 'https://www.brown.edu/',
}

const headCoach: Coach = {
  name: 'Mike Daly',
  title: 'Head Coach',
  email: 'michael_daly@brown.edu',
}
const defCoord: Coach = {
  name: 'John Cook',
  title: 'Defensive Coordinator',
  email: 'john_cook1@brown.edu',
}
const recCoord: Coach = {
  name: 'Jane Smith',
  title: 'Recruiting Coordinator',
  email: 'jsmith@brown.edu',
}

const allCoaches = [headCoach, defCoord, recCoord]

describe('buildContext', () => {
  it('includes school data', () => {
    const ctx = buildContext(school, null)
    expect(ctx.SCHOOL_NAME).toBe('Brown University')
    expect(ctx.CITY).toBe('Providence')
    expect(ctx.STATE).toBe('RI')
    expect(ctx.CONFERENCE).toBe('Ivy League')
  })

  it('includes selected coach data', () => {
    const ctx = buildContext(school, defCoord, allCoaches)
    expect(ctx.COACH_FIRST).toBe('John')
    expect(ctx.COACH_LAST).toBe('Cook')
    expect(ctx.COACH_FULL).toBe('John Cook')
    expect(ctx.COACH_TITLE).toBe('Defensive Coordinator')
    expect(ctx.COACH_EMAIL).toBe('john_cook1@brown.edu')
  })

  it('resolves HC/DC/RC by title', () => {
    const ctx = buildContext(school, headCoach, allCoaches)
    expect(ctx.HC_FULL).toBe('Mike Daly')
    expect(ctx.HC_EMAIL).toBe('michael_daly@brown.edu')
    expect(ctx.DC_FULL).toBe('John Cook')
    expect(ctx.DC_EMAIL).toBe('john_cook1@brown.edu')
    expect(ctx.RC_FULL).toBe('Jane Smith')
    expect(ctx.RC_EMAIL).toBe('jsmith@brown.edu')
  })

  it('omits falsy values so Handlebars #if works', () => {
    const ctx = buildContext(school, null, [])
    expect(ctx).not.toHaveProperty('COACH_FIRST')
    expect(ctx).not.toHaveProperty('HC_FULL')
    expect(ctx).not.toHaveProperty('DC_FULL')
  })

  it('handles null school fields', () => {
    const s: SchoolData = { ...school, conference: null, division: null }
    const ctx = buildContext(s, null)
    expect(ctx).not.toHaveProperty('CONFERENCE')
    expect(ctx).not.toHaveProperty('DIVISION')
  })
})

describe('mergeTemplate', () => {
  it('replaces simple variables', () => {
    const result = mergeTemplate(
      'Hello {{SCHOOL_NAME}} in {{CITY}}',
      school,
      headCoach,
      allCoaches,
    )
    expect(result).toBe('Hello Brown University in Providence')
  })

  it('replaces coach variables', () => {
    const result = mergeTemplate(
      'Dear {{COACH_FIRST}},',
      school,
      defCoord,
      allCoaches,
    )
    expect(result).toBe('Dear John,')
  })

  it('replaces position-specific variables', () => {
    const result = mergeTemplate(
      'HC: {{HC_LAST}}, DC: {{DC_LAST}}',
      school,
      headCoach,
      allCoaches,
    )
    expect(result).toBe('HC: Daly, DC: Cook')
  })

  it('handles Handlebars conditionals', () => {
    const tmpl = '{{#if DC_FULL}}DC exists{{/if}}'
    expect(mergeTemplate(tmpl, school, headCoach, allCoaches)).toBe('DC exists')
    expect(mergeTemplate(tmpl, school, headCoach, [])).toBe('')
  })

  it('handles {{#unless}} blocks', () => {
    const tmpl = '{{#unless RC_FULL}}No RC{{/unless}}'
    expect(mergeTemplate(tmpl, school, headCoach, allCoaches)).toBe('')
    expect(mergeTemplate(tmpl, school, headCoach, [])).toBe('No RC')
  })

  it('falls back to simple replacement on Handlebars syntax error', () => {
    const result = mergeTemplate(
      '{{SCHOOL_NAME}} {{#if broken',
      school,
      headCoach,
      allCoaches,
    )
    expect(result).toContain('Brown University')
  })
})

describe('resolveAllVars', () => {
  it('returns null for missing variables', () => {
    const resolved = resolveAllVars(school, null, [])
    expect(resolved['{{SCHOOL_NAME}}']).toBe('Brown University')
    expect(resolved['{{DC_FULL}}']).toBeNull()
    expect(resolved['{{HC_FULL}}']).toBeNull()
  })

  it('returns values for available variables', () => {
    const resolved = resolveAllVars(school, defCoord, allCoaches)
    expect(resolved['{{COACH_FULL}}']).toBe('John Cook')
    expect(resolved['{{HC_FULL}}']).toBe('Mike Daly')
    expect(resolved['{{DC_FULL}}']).toBe('John Cook')
    expect(resolved['{{RC_FULL}}']).toBe('Jane Smith')
  })
})

describe('findUnknownVars', () => {
  it('returns empty for known variables', () => {
    expect(findUnknownVars('{{SCHOOL_NAME}} {{HC_FULL}}')).toEqual([])
  })

  it('finds unknown variables', () => {
    expect(findUnknownVars('{{SCHOOL_NAME}} {{MASCOT}}')).toEqual([
      '{{MASCOT}}',
    ])
  })

  it('ignores Handlebars control syntax', () => {
    expect(findUnknownVars('{{#if DC_FULL}}{{/if}}')).toEqual([])
  })

  it('deduplicates', () => {
    expect(findUnknownVars('{{FOO}} {{FOO}}')).toEqual(['{{FOO}}'])
  })
})

describe('detectHardcodedSchoolNames', () => {
  const schools = ['Brown University', 'Duke University', 'Cornell University']

  it('finds hardcoded school names from other schools', () => {
    const result = detectHardcodedSchoolNames(
      'I love Duke University and want to play there',
      'Brown University',
      schools,
    )
    expect(result).toEqual(['Duke University'])
  })

  it('ignores the current school', () => {
    const result = detectHardcodedSchoolNames(
      'I love Brown University',
      'Brown University',
      schools,
    )
    expect(result).toEqual([])
  })

  it('skips short names', () => {
    const result = detectHardcodedSchoolNames(
      'SMU is great',
      'Brown University',
      ['Brown University', 'SMU'],
    )
    expect(result).toEqual([])
  })
})
