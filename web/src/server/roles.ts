// Role mapping utilities for consistent Clerk ↔ UI mapping
export type UiRole = 'member' | 'admin'

export function toClerkRole(ui: UiRole): 'org:member' | 'org:admin' {
  return ui === 'admin' ? 'org:admin' : 'org:member'
}

export function fromClerkRole(clerk: string | null | undefined): UiRole {
  return (clerk === 'admin' || clerk === 'org:admin') ? 'admin' : 'member'
}
