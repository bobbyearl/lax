import { useCallback, useMemo, useState } from 'react'
import { X, Copy, Check, Mail, ExternalLink, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/retroui/Button'
import { useFavorites } from '@/components/FavoritesProvider'
import type { Coach } from '@/lib/coaches'

type CollegeEntry = {
  id: string
  name: string
  city: string
  state: string
  conference: string | null
  team_website_url: string | null
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

  return (
    <Overlay onClose={onClose}>
      <div className="flex flex-col h-full">
        <div className="email-header">
          <div>
            <h2 className="text-lg font-bold font-head">Recruiting Contacts</h2>
            <p className="text-xs text-muted-foreground">
              {favColleges.length} school
              {favColleges.length !== 1 ? 's' : ''} starred
            </p>
          </div>
          <button onClick={onClose} className="email-close-btn">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {favColleges.map((school) => (
            <SchoolCard key={school.id} school={school} />
          ))}
        </div>
      </div>
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

function SchoolCard({ school }: { school: CollegeEntry }) {
  const staffUrl = school.team_website_url
    ? school.team_website_url.replace(/\/$/, '') + '/coaches'
    : null

  return (
    <div className="email-school-card">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <h3 className="font-bold font-head text-sm">{school.name}</h3>
          <p className="text-xs text-muted-foreground">
            {[school.conference, `${school.city}, ${school.state}`]
              .filter(Boolean)
              .join(' - ')}
          </p>
        </div>
        {staffUrl && (
          <a
            href={staffUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 shrink-0"
          >
            Staff page <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>

      {school.coaches.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">
          No coach data in the repo.{' '}
          {staffUrl && (
            <a
              href={staffUrl}
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              Find on athletics site.
            </a>
          )}
        </p>
      ) : (
        <div className="space-y-1.5">
          {school.coaches.map((coach, i) => (
            <CoachRow key={i} coach={coach} schoolName={school.name} />
          ))}
        </div>
      )}

      {school.coaches_updated && (
        <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          Data from {school.coaches_updated} - verify before sending
        </p>
      )}
    </div>
  )
}

function CoachRow({ coach, schoolName }: { coach: Coach; schoolName: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopyEmail = useCallback(async () => {
    if (!coach.email) return
    await navigator.clipboard.writeText(coach.email)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [coach.email])

  const mailtoHref = coach.email
    ? `mailto:${coach.email}?subject=${encodeURIComponent(`Interest in ${schoolName} Lacrosse`)}`
    : undefined

  return (
    <div className="email-coach-row">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{coach.name}</p>
        <p className="text-xs text-muted-foreground">{coach.title}</p>
      </div>
      {coach.email ? (
        <div className="flex items-center gap-1 shrink-0">
          <code className="text-xs text-muted-foreground hidden sm:inline">
            {coach.email}
          </code>
          <button
            onClick={handleCopyEmail}
            className="email-action-btn"
            title="Copy email"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-green-600" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </button>
          {mailtoHref && (
            <a
              href={mailtoHref}
              className="email-action-btn"
              title="Send email"
            >
              <Mail className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      ) : (
        <span className="text-xs text-muted-foreground italic">no email</span>
      )}
    </div>
  )
}
