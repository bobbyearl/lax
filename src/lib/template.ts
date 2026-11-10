import Handlebars from 'handlebars'
import { splitName } from './coaches'
import type { Coach } from './coaches'

const TEMPLATE_KEY = 'lax-email-template'
const PROFILE_KEY = 'lax-player-profile'

export type PlayerProfile = {
  name: string
  gradYear: string
  position: string
  highSchool: string
  highSchoolState: string
  clubTeam: string
  clubCity: string
  gpa: string
  heightWeight: string
  honors: string
  accolades: string
  sports: string
  highlightFilm: string
  schedule: string
  clubDirectorName: string
  clubDirectorEmail: string
  clubDirectorPhone: string
  hsCoachName: string
  hsCoachEmail: string
  hsCoachPhone: string
}

export const EMPTY_PROFILE: PlayerProfile = {
  name: '',
  gradYear: '',
  position: '',
  highSchool: '',
  highSchoolState: '',
  clubTeam: '',
  clubCity: '',
  gpa: '',
  heightWeight: '',
  honors: '',
  accolades: '',
  sports: '',
  highlightFilm: '',
  schedule: '',
  clubDirectorName: '',
  clubDirectorEmail: '',
  clubDirectorPhone: '',
  hsCoachName: '',
  hsCoachEmail: '',
  hsCoachPhone: '',
}

export function loadProfile(): PlayerProfile {
  try {
    const raw = localStorage.getItem(PROFILE_KEY)
    if (raw) return { ...EMPTY_PROFILE, ...JSON.parse(raw) }
  } catch {
    // ignore
  }
  return { ...EMPTY_PROFILE }
}

export function saveProfile(p: PlayerProfile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(p))
}

export function loadTemplate(): string {
  return localStorage.getItem(TEMPLATE_KEY) ?? ''
}

export function saveTemplate(t: string) {
  localStorage.setItem(TEMPLATE_KEY, t)
}

export const DEFAULT_TEMPLATE = `Dear {{COACH_FIRST}},

My name is {{PLAYER_NAME}} and I am a {{GRAD_YEAR}} {{POSITION}} currently playing club for {{CLUB_TEAM}} out of {{CLUB_CITY}}. I attend {{HIGH_SCHOOL}} in {{HS_STATE}}.

I am highly interested in your program and excited to learn more about {{SCHOOL_NAME}}.

{{#if ACCOLADES}}{{ACCOLADES}}{{/if}}

{{#if GPA}}GPA: {{GPA}}{{/if}}
{{#if HEIGHT_WEIGHT}}Height/Weight: {{HEIGHT_WEIGHT}}{{/if}}
{{#if HONORS}}Coursework: {{HONORS}}{{/if}}
Club: {{CLUB_TEAM}}
{{#if SPORTS}}Sports: {{SPORTS}}{{/if}}

{{#if SCHEDULE}}Upcoming Schedule:
{{SCHEDULE}}{{/if}}

{{#if HIGHLIGHT_FILM}}Highlight Film: {{HIGHLIGHT_FILM}}{{/if}}

{{#if CLUB_DIR_NAME}}{{CLUB_DIR_NAME}}
{{#if CLUB_DIR_EMAIL}}Email: {{CLUB_DIR_EMAIL}}{{/if}}
{{#if CLUB_DIR_PHONE}}Phone: {{CLUB_DIR_PHONE}}{{/if}}{{/if}}

{{#if HS_COACH_NAME}}HS Coach: {{HS_COACH_NAME}}
{{#if HS_COACH_EMAIL}}Email: {{HS_COACH_EMAIL}}{{/if}}
{{#if HS_COACH_PHONE}}Phone: {{HS_COACH_PHONE}}{{/if}}{{/if}}

I look forward to learning more about your school and lacrosse program.

Best regards,
{{PLAYER_NAME}}`

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

export const SUPPORTED_VARS: { key: string; desc: string; group: string }[] = [
  // School variables
  { key: '{{SCHOOL_NAME}}', desc: 'School name', group: 'school' },
  { key: '{{CITY}}', desc: 'City', group: 'school' },
  { key: '{{STATE}}', desc: 'State', group: 'school' },
  { key: '{{CONFERENCE}}', desc: 'Conference', group: 'school' },
  // Coach variables
  { key: '{{COACH_FIRST}}', desc: 'Selected coach first name', group: 'coach' },
  { key: '{{COACH_LAST}}', desc: 'Selected coach last name', group: 'coach' },
  { key: '{{COACH_FULL}}', desc: 'Selected coach full name', group: 'coach' },
  { key: '{{COACH_TITLE}}', desc: 'Selected coach title', group: 'coach' },
  { key: '{{COACH_EMAIL}}', desc: 'Selected coach email', group: 'coach' },
  { key: '{{HC_FULL}}', desc: 'Head coach full name', group: 'coach' },
  { key: '{{HC_FIRST}}', desc: 'Head coach first name', group: 'coach' },
  { key: '{{HC_LAST}}', desc: 'Head coach last name', group: 'coach' },
  { key: '{{HC_EMAIL}}', desc: 'Head coach email', group: 'coach' },
  { key: '{{DC_FULL}}', desc: 'Defensive coord name', group: 'coach' },
  { key: '{{DC_FIRST}}', desc: 'Defensive coord first', group: 'coach' },
  { key: '{{DC_LAST}}', desc: 'Defensive coord last', group: 'coach' },
  { key: '{{DC_EMAIL}}', desc: 'Defensive coord email', group: 'coach' },
  { key: '{{RC_FULL}}', desc: 'Recruiting coord name', group: 'coach' },
  { key: '{{RC_FIRST}}', desc: 'Recruiting coord first', group: 'coach' },
  { key: '{{RC_LAST}}', desc: 'Recruiting coord last', group: 'coach' },
  { key: '{{RC_EMAIL}}', desc: 'Recruiting coord email', group: 'coach' },
  // Player profile variables
  { key: '{{PLAYER_NAME}}', desc: 'Player name', group: 'player' },
  { key: '{{GRAD_YEAR}}', desc: 'Graduation year', group: 'player' },
  { key: '{{POSITION}}', desc: 'Position', group: 'player' },
  { key: '{{HIGH_SCHOOL}}', desc: 'High school', group: 'player' },
  { key: '{{HS_STATE}}', desc: 'High school state', group: 'player' },
  { key: '{{CLUB_TEAM}}', desc: 'Club team', group: 'player' },
  { key: '{{CLUB_CITY}}', desc: 'Club city/state', group: 'player' },
  { key: '{{GPA}}', desc: 'GPA', group: 'player' },
  { key: '{{HEIGHT_WEIGHT}}', desc: 'Height / Weight', group: 'player' },
  { key: '{{HONORS}}', desc: 'Honors/AP courses', group: 'player' },
  { key: '{{ACCOLADES}}', desc: 'Awards/accolades', group: 'player' },
  { key: '{{SPORTS}}', desc: 'Sports played', group: 'player' },
  { key: '{{HIGHLIGHT_FILM}}', desc: 'Highlight film URL', group: 'player' },
  { key: '{{SCHEDULE}}', desc: 'Tournament schedule', group: 'player' },
  { key: '{{CLUB_DIR_NAME}}', desc: 'Club director name', group: 'player' },
  { key: '{{CLUB_DIR_EMAIL}}', desc: 'Club director email', group: 'player' },
  { key: '{{CLUB_DIR_PHONE}}', desc: 'Club director phone', group: 'player' },
  { key: '{{HS_COACH_NAME}}', desc: 'HS coach name', group: 'player' },
  { key: '{{HS_COACH_EMAIL}}', desc: 'HS coach email', group: 'player' },
  { key: '{{HS_COACH_PHONE}}', desc: 'HS coach phone', group: 'player' },
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
  profile?: PlayerProfile | null,
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
    // Player profile
    PLAYER_NAME: profile?.name,
    GRAD_YEAR: profile?.gradYear,
    POSITION: profile?.position,
    HIGH_SCHOOL: profile?.highSchool,
    HS_STATE: profile?.highSchoolState,
    CLUB_TEAM: profile?.clubTeam,
    CLUB_CITY: profile?.clubCity,
    GPA: profile?.gpa,
    HEIGHT_WEIGHT: profile?.heightWeight,
    HONORS: profile?.honors,
    ACCOLADES: profile?.accolades,
    SPORTS: profile?.sports,
    HIGHLIGHT_FILM: profile?.highlightFilm,
    SCHEDULE: profile?.schedule,
    CLUB_DIR_NAME: profile?.clubDirectorName,
    CLUB_DIR_EMAIL: profile?.clubDirectorEmail,
    CLUB_DIR_PHONE: profile?.clubDirectorPhone,
    HS_COACH_NAME: profile?.hsCoachName,
    HS_COACH_EMAIL: profile?.hsCoachEmail,
    HS_COACH_PHONE: profile?.hsCoachPhone,
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
  profile?: PlayerProfile | null,
): string {
  const ctx = buildContext(school, coach, allCoaches, profile)
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
  profile?: PlayerProfile | null,
): Record<string, string | null> {
  const ctx = buildContext(school, coach, allCoaches, profile)
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
