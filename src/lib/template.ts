import Handlebars from 'handlebars'
import { splitName } from './coaches'
import type { Coach } from './coaches'

const TEMPLATE_KEY = 'lax-email-template'

export function loadTemplate(): string {
  return localStorage.getItem(TEMPLATE_KEY) ?? ''
}

export function saveTemplate(t: string) {
  localStorage.setItem(TEMPLATE_KEY, t)
}

export type SchoolData = {
  name: string
  city: string
  state: string
  league: string
  division: string | null
  conference: string | null
  team_website_url: string | null
  website_url: string | null
}

export const SUPPORTED_VARS: { key: string; desc: string }[] = [
  { key: '{{SCHOOL_NAME}}', desc: 'School name' },
  { key: '{{CITY}}', desc: 'City' },
  { key: '{{STATE}}', desc: 'State' },
  { key: '{{CONFERENCE}}', desc: 'Conference' },
  { key: '{{COACH_FIRST}}', desc: 'Selected coach first name' },
  { key: '{{COACH_LAST}}', desc: 'Selected coach last name' },
  { key: '{{COACH_FULL}}', desc: 'Selected coach full name' },
  { key: '{{COACH_TITLE}}', desc: 'Selected coach title' },
  { key: '{{COACH_EMAIL}}', desc: 'Selected coach email' },
  { key: '{{HC_FULL}}', desc: 'Head coach full name' },
  { key: '{{HC_FIRST}}', desc: 'Head coach first name' },
  { key: '{{HC_LAST}}', desc: 'Head coach last name' },
  { key: '{{HC_EMAIL}}', desc: 'Head coach email' },
  { key: '{{DC_FULL}}', desc: 'Defensive coord full name' },
  { key: '{{DC_FIRST}}', desc: 'Defensive coord first name' },
  { key: '{{DC_LAST}}', desc: 'Defensive coord last name' },
  { key: '{{DC_EMAIL}}', desc: 'Defensive coord email' },
  { key: '{{RC_FULL}}', desc: 'Recruiting coord full name' },
  { key: '{{RC_FIRST}}', desc: 'Recruiting coord first name' },
  { key: '{{RC_LAST}}', desc: 'Recruiting coord last name' },
  { key: '{{RC_EMAIL}}', desc: 'Recruiting coord email' },
]

export const CONDITIONALS_HELP: { syntax: string; desc: string }[] = [
  { syntax: '{{#if DC_FULL}}...{{/if}}', desc: 'Show block only if DC exists' },
  {
    syntax: '{{#if HC_EMAIL}}...{{/if}}',
    desc: 'Show block only if HC email exists',
  },
  {
    syntax: '{{#unless RC_FULL}}...{{/unless}}',
    desc: 'Show block only if RC is missing',
  },
]

export function buildContext(
  school: SchoolData,
  coach: Coach | null,
  allCoaches?: Coach[],
): Record<string, string> {
  const name = coach ? splitName(coach.name) : null
  const hc = allCoaches?.find((c) => /head coach/i.test(c.title)) ?? null
  const dc = allCoaches?.find((c) => /defen/i.test(c.title)) ?? null
  const rc = allCoaches?.find((c) => /recruit/i.test(c.title)) ?? null
  const hcName = hc ? splitName(hc.name) : null
  const dcName = dc ? splitName(dc.name) : null
  const rcName = rc ? splitName(rc.name) : null

  // Only include truthy values so {{#if}} works correctly
  const raw: Record<string, string | null | undefined> = {
    SCHOOL_NAME: school.name,
    CITY: school.city,
    STATE: school.state,
    LEAGUE: school.league,
    DIVISION: school.division,
    CONFERENCE: school.conference,
    TEAM_URL: school.team_website_url,
    SCHOOL_URL: school.website_url,
    COACH_FIRST: name?.first,
    COACH_LAST: name?.last,
    COACH_FULL: coach?.name,
    COACH_TITLE: coach?.title,
    COACH_EMAIL: coach?.email,
    HC_FULL: hc?.name,
    HC_FIRST: hcName?.first,
    HC_LAST: hcName?.last,
    HC_EMAIL: hc?.email,
    DC_FULL: dc?.name,
    DC_FIRST: dcName?.first,
    DC_LAST: dcName?.last,
    DC_EMAIL: dc?.email,
    RC_FULL: rc?.name,
    RC_FIRST: rcName?.first,
    RC_LAST: rcName?.last,
    RC_EMAIL: rc?.email,
  }

  // Filter to only truthy string values
  const ctx: Record<string, string> = {}
  for (const [k, v] of Object.entries(raw)) {
    if (v) ctx[k] = v
  }
  return ctx
}

export function mergeTemplate(
  template: string,
  school: SchoolData,
  coach: Coach | null,
  allCoaches?: Coach[],
): string {
  const ctx = buildContext(school, coach, allCoaches)
  try {
    const compiled = Handlebars.compile(template, { noEscape: true })
    return compiled(ctx)
  } catch {
    // If the template has a syntax error, return it with just simple replacements
    let result = template
    for (const [k, v] of Object.entries(ctx)) {
      result = result.replaceAll(`{{${k}}}`, v)
    }
    return result
  }
}

export function resolveAllVars(
  school: SchoolData,
  coach: Coach | null,
  allCoaches?: Coach[],
): Record<string, string | null> {
  const ctx = buildContext(school, coach, allCoaches)
  const result: Record<string, string | null> = {}
  for (const v of SUPPORTED_VARS) {
    // Extract the key name from {{KEY}}
    const key = v.key.replace(/^\{\{|\}\}$/g, '')
    result[v.key] = ctx[key] ?? null
  }
  return result
}

export function findUnknownVars(template: string): string[] {
  const known = new Set(
    SUPPORTED_VARS.map((v) => v.key.replace(/^\{\{|\}\}$/g, '')),
  )
  // Match simple {{VAR}} but not {{#if ...}} or {{/if}} or {{else}}
  const matches = template.match(/\{\{([A-Z][A-Z_]*)\}\}/g) ?? []
  const unknowns: string[] = []
  for (const m of matches) {
    const key = m.replace(/^\{\{|\}\}$/g, '')
    if (!known.has(key)) unknowns.push(m)
  }
  return [...new Set(unknowns)]
}

export function detectHardcodedSchoolNames(
  mergedText: string,
  currentSchoolName: string,
  allSchoolNames: string[],
): string[] {
  const found: string[] = []
  const currentLower = currentSchoolName.toLowerCase()
  for (const name of allSchoolNames) {
    if (name.toLowerCase() === currentLower) continue
    if (name.length < 4) continue
    if (mergedText.toLowerCase().includes(name.toLowerCase())) {
      found.push(name)
    }
  }
  return found
}
