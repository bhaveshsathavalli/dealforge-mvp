// Role mapping utilities for consistent Clerk ↔ UI mapping
export type UiRole = 'member' | 'admin'

export function toClerkRole(r: UiRole): 'org:member' | 'org:admin' {
  return r === 'admin' ? 'org:admin' : 'org:member'
}

export function fromClerkRole(r?: string | null): UiRole {
  return r === 'admin' || r === 'org:admin' ? 'admin' : 'member'
}