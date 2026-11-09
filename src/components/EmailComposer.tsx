import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  X,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Copy,
  Check,
  Mail,
} from 'lucide-react'
import { Button } from '@/components/retroui/Button'
import { useFavorites } from '@/components/FavoritesProvider'
import type { Coach } from '@/lib/coaches'
import {
  SUPPORTED_VARS,
  CONDITIONALS_HELP,
  findUnknownVars,
  mergeTemplate,
  resolveAllVars,
  buildContext,
  detectHardcodedSchoolNames,
  loadTemplate,
  saveTemplate,
} from '@/lib/template'
import type { SchoolData } from '@/lib/template'

type CollegeEntry = SchoolData & {
  id: string
  coaches: Coach[]
  coaches_updated: string | null
}

export function EmailComposer({
  colleges,
  onClose,
}: {
  colleges: CollegeEntry[]
  onClose: () => void
}) {
  const { favorites } = useFavorites()
  const favColleges = useMemo(
    () => colleges.filter((c) => favorites.has(c.id)),
    [colleges, favorites],
  )

  const [step, setStep] = useState<'template' | 'review' | 'data'>('template')
  const [template, setTemplate] = useState(loadTemplate)
  const [schoolIdx, setSchoolIdx] = useState(0)
  const [coachIdx, setCoachIdx] = useState(0)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    saveTemplate(template)
  }, [template])

  if (favColleges.length === 0) {
    return (
      <Overlay onClose={onClose}>
        <div className="text-center py-8 px-4">
          <p className="text-muted-foreground">
            No favorites selected. Star some schools first.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="mt-4"
          >
            Close
          </Button>
        </div>
      </Overlay>
    )
  }

  if (step === 'template') {
    return (
      <Overlay onClose={onClose}>
        <TemplateStep
          template={template}
          setTemplate={setTemplate}
          schoolCount={favColleges.length}
          favColleges={favColleges}
          onNext={() => {
            setSchoolIdx(0)
            setCoachIdx(0)
            setCopied(false)
            setStep('review')
          }}
          onSkip={() => {
            setSchoolIdx(0)
            setStep('data')
          }}
          onClose={onClose}
        />
      </Overlay>
    )
  }

  if (step === 'data') {
    return (
      <Overlay onClose={onClose}>
        <DataStep
          school={favColleges[schoolIdx]}
          schoolIdx={schoolIdx}
          schoolCount={favColleges.length}
          onPrev={() => setSchoolIdx((i) => Math.max(0, i - 1))}
          onNext={() =>
            setSchoolIdx((i) => Math.min(favColleges.length - 1, i + 1))
          }
          onBack={() => setStep('template')}
          onClose={onClose}
        />
      </Overlay>
    )
  }

  return (
    <Overlay onClose={onClose}>
      <ReviewStep
        template={template}
        school={favColleges[schoolIdx]}
        schoolIdx={schoolIdx}
        schoolCount={favColleges.length}
        coachIdx={coachIdx}
        setCoachIdx={setCoachIdx}
        copied={copied}
        setCopied={setCopied}
        allSchoolNames={favColleges.map((c) => c.name)}
        onPrev={() => {
          setCoachIdx(0)
          setCopied(false)
          setSchoolIdx((i) => Math.max(0, i - 1))
        }}
        onNext={() => {
          setCoachIdx(0)
          setCopied(false)
          setSchoolIdx((i) => Math.min(favColleges.length - 1, i + 1))
        }}
        onBack={() => setStep('template')}
        onClose={onClose}
      />
    </Overlay>
  )
}

function Overlay({
  children,
  onClose,
}: {
  children: React.ReactNode
  onClose: () => void
}) {
  return (
    <div
      className="email-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="email-modal">{children}</div>
    </div>
  )
}

function TemplateStep({
  template,
  setTemplate,
  schoolCount,
  favColleges,
  onNext,
  onSkip,
  onClose,
}: {
  template: string
  setTemplate: (t: string) => void
  schoolCount: number
  favColleges: CollegeEntry[]
  onNext: () => void
  onSkip: () => void
  onClose: () => void
}) {
  const unknowns = findUnknownVars(template)

  const withHC = favColleges.filter((s) =>
    s.coaches.some((c) => /head coach/i.test(c.title) && c.name),
  ).length
  const withDC = favColleges.filter((s) =>
    s.coaches.some((c) => /defen/i.test(c.title) && c.name),
  ).length
  const withRC = favColleges.filter((s) =>
    s.coaches.some((c) => /recruit/i.test(c.title) && c.name),
  ).length
  const missingAny =
    schoolCount - favColleges.filter((s) => s.coaches.length > 0).length

  // Compute per-variable availability across all favorites
  const availability = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const v of SUPPORTED_VARS) {
      const key = v.key.replace(/^\{\{|\}\}$/g, '')
      counts[v.key] = favColleges.filter((s) => {
        const ctx = buildContext(s, s.coaches[0] ?? null, s.coaches)
        return !!ctx[key]
      }).length
    }
    return counts
  }, [favColleges])

  return (
    <div className="flex flex-col h-full">
      <div className="email-header">
        <h2 className="text-lg font-bold font-head">Email Template</h2>
        <button onClick={onClose} className="email-close-btn">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <p className="text-sm text-muted-foreground">
          Write your template below. This will generate {schoolCount} email
          {schoolCount !== 1 ? 's' : ''} from your favorites.
        </p>

        <div className="email-template-grid">
          <div className="space-y-3">
            <textarea
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              placeholder={
                "Dear {{COACH_FIRST}},\n\nMy name is ... and I'm interested in playing lacrosse at {{SCHOOL_NAME}}...\n\nUpcoming tournament schedule:\n- ..."
              }
              className="email-textarea"
              rows={16}
            />
            {unknowns.length > 0 && (
              <div className="email-warning">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <div>
                  <p className="font-medium text-sm">Unknown variables</p>
                  <p className="text-xs">{unknowns.join(', ')}</p>
                </div>
              </div>
            )}
          </div>

          <div className="email-vars-panel">
            <div className="flex items-baseline justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Variables
              </p>
              <p className="text-[10px] text-muted-foreground">Available</p>
            </div>
            <div className="space-y-0.5">
              {SUPPORTED_VARS.map((v) => {
                const count = availability[v.key] ?? 0
                const full = count === schoolCount
                return (
                  <div key={v.key} className="email-var-row">
                    <code className="email-var-code">{v.key}</code>
                    <span className="text-muted-foreground text-[11px] flex-1">
                      {v.desc}
                    </span>
                    <span
                      className={`text-[11px] tabular-nums ${full ? 'text-muted-foreground' : 'text-amber-600 dark:text-amber-400 font-medium'}`}
                    >
                      {count}/{schoolCount}
                    </span>
                  </div>
                )
              })}
            </div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mt-4 mb-2">
              Conditionals
            </p>
            <div className="space-y-1">
              {CONDITIONALS_HELP.map((c) => (
                <div key={c.syntax} className="text-xs">
                  <code className="email-var-code text-[10px]">{c.syntax}</code>
                  <span className="text-muted-foreground text-[11px] ml-1">
                    {c.desc}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="email-footer">
        <Button variant="outline" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onSkip}>
            Skip - just show data <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
          <Button size="sm" onClick={onNext} disabled={!template.trim()}>
            Review emails <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  )
}

function ReviewStep({
  template,
  school,
  schoolIdx,
  schoolCount,
  coachIdx,
  setCoachIdx,
  copied,
  setCopied,
  allSchoolNames,
  onPrev,
  onNext,
  onBack,
  onClose,
}: {
  template: string
  school: CollegeEntry
  schoolIdx: number
  schoolCount: number
  coachIdx: number
  setCoachIdx: (i: number) => void
  copied: boolean
  setCopied: (v: boolean) => void
  allSchoolNames: string[]
  onPrev: () => void
  onNext: () => void
  onBack: () => void
  onClose: () => void
}) {
  const coaches = school.coaches
  const coach = coaches[coachIdx] ?? null
  const merged = mergeTemplate(template, school, coach, coaches)
  const resolved = resolveAllVars(school, coach, coaches)
  const hardcoded = detectHardcodedSchoolNames(
    merged,
    school.name,
    allSchoolNames,
  )
  const hasEmptyVars = /\{\{[A-Z_]+\}\}/.test(merged)
  const staffUrl = school.team_website_url
    ? school.team_website_url.replace(/\/$/, '') + '/coaches'
    : null

  useEffect(() => {
    setCoachIdx(0)
  }, [school.id])

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(merged)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [merged, setCopied])

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  const mailtoHref = coach?.email
    ? `mailto:${coach.email}?subject=${encodeURIComponent(`Interest in ${school.name} Lacrosse`)}&body=${encodeURIComponent(merged)}`
    : undefined

  return (
    <div className="flex flex-col h-full">
      <div className="email-header">
        <div>
          <h2 className="text-lg font-bold font-head">{school.name}</h2>
          <p className="text-xs text-muted-foreground">
            {schoolIdx + 1} of {schoolCount}
            {/* eslint-disable-next-line @typescript-eslint/no-unnecessary-condition */}
            {coach && coach.name && ` - ${coach.title}: ${coach.name}`}
          </p>
        </div>
        <button onClick={onClose} className="email-close-btn">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Coach selector - read only, just to pick which coach to merge */}
        {coaches.length > 1 && (
          <div className="flex items-center gap-2 flex-wrap">
            {coaches.map((c, i) => (
              <button
                key={i}
                onClick={() => {
                  setCoachIdx(i)
                  setCopied(false)
                }}
                className={`email-coach-pill ${i === coachIdx ? 'email-coach-pill-active' : ''}`}
              >
                {c.title}
              </button>
            ))}
          </div>
        )}

        {/* Verification warning */}
        <VerifyBanner school={school} staffUrl={staffUrl} />

        {/* Warnings */}
        {hardcoded.length > 0 && (
          <div className="email-warning">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <p className="text-xs">
              Possible hardcoded school reference:{' '}
              <strong>{hardcoded.join(', ')}</strong>.
            </p>
          </div>
        )}
        {hasEmptyVars && (
          <div className="email-warning">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <p className="text-xs">
              Some variables couldn't be filled.
              {coaches.length === 0
                ? ' No coach data in the repo for this school.'
                : ''}
            </p>
          </div>
        )}

        {/* Merged preview + variable status */}
        <div className="email-review-grid">
          <MergedPreview text={merged} />
          <VarStatusPanel resolved={resolved} />
        </div>
      </div>

      <div className="email-footer">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Template
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onPrev}
            disabled={schoolIdx === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant={copied ? 'secondary' : 'default'}
            size="sm"
            onClick={handleCopy}
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-1" /> Copied
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-1" /> Copy
              </>
            )}
          </Button>
          {mailtoHref && (
            <Button
              variant="outline"
              size="sm"
              render={<a href={mailtoHref} />}
            >
              <Mail className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={onNext}
            disabled={schoolIdx === schoolCount - 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

function DataStep({
  school,
  schoolIdx,
  schoolCount,
  onPrev,
  onNext,
  onBack,
  onClose,
}: {
  school: CollegeEntry
  schoolIdx: number
  schoolCount: number
  onPrev: () => void
  onNext: () => void
  onBack: () => void
  onClose: () => void
}) {
  const coaches = school.coaches
  const resolved = resolveAllVars(school, coaches[0] ?? null, coaches)
  const staffUrl = school.team_website_url
    ? school.team_website_url.replace(/\/$/, '') + '/coaches'
    : null

  return (
    <div className="flex flex-col h-full">
      <div className="email-header">
        <div>
          <h2 className="text-lg font-bold font-head">{school.name}</h2>
          <p className="text-xs text-muted-foreground">
            {schoolIdx + 1} of {schoolCount} - Data view
          </p>
        </div>
        <button onClick={onClose} className="email-close-btn">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <VerifyBanner school={school} staffUrl={staffUrl} />

        {/* Full-width variable data */}
        <VarStatusPanel resolved={resolved} />
      </div>

      <div className="email-footer">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Template
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onPrev}
            disabled={schoolIdx === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onNext}
            disabled={schoolIdx === schoolCount - 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

function VerifyBanner({
  school,
  staffUrl,
}: {
  school: CollegeEntry
  staffUrl: string | null
}) {
  return (
    <div className="email-verify-banner">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <p className="text-xs">
        {school.coaches_updated ? (
          <>
            Last updated <strong>{school.coaches_updated}</strong>.{' '}
          </>
        ) : (
          <>Coach data has not been verified. </>
        )}
        {staffUrl ? (
          <a
            href={staffUrl}
            target="_blank"
            rel="noreferrer"
            className="underline font-medium"
          >
            Verify before sending.
          </a>
        ) : (
          <span>Verify on the school's athletics site before sending.</span>
        )}
      </p>
    </div>
  )
}

function MergedPreview({ text }: { text: string }) {
  const parts = text.split(/(\{\{[A-Z_]+\}\})/g)
  return (
    <div className="email-preview">
      {parts.map((part, i) =>
        /^\{\{[A-Z_]+\}\}$/.test(part) ? (
          <span key={i} className="email-unfilled-var">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </div>
  )
}

function VarStatusPanel({
  resolved,
}: {
  resolved: Record<string, string | null>
}) {
  return (
    <div className="email-vars-panel">
      <div className="flex items-baseline justify-between mb-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Variables
        </p>
        <p className="text-[10px] text-muted-foreground">Value</p>
      </div>
      <div className="space-y-0.5">
        {SUPPORTED_VARS.map((v) => {
          const val = resolved[v.key]
          const available = val !== null && val !== ''
          return (
            <div key={v.key} className="email-var-row">
              <code
                className={`email-var-code ${!available ? 'opacity-40' : ''}`}
              >
                {v.key}
              </code>
              <span className="text-muted-foreground text-[11px] flex-1">
                {v.desc}
              </span>
              <span
                className={`text-[11px] ${available ? 'text-foreground font-medium' : 'text-muted-foreground italic'}`}
              >
                {available ? val : 'missing'}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
