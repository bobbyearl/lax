export type Coach = {
  name: string
  title: string
  email: string
}

export function splitName(full: string): { first: string; last: string } {
  const parts = full.trim().split(/\s+/)
  if (parts.length <= 1) return { first: '', last: parts[0] ?? '' }
  return { first: parts[0], last: parts.slice(1).join(' ') }
}
