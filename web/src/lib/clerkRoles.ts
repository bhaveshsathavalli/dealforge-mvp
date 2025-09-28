/**
 * Clerk role mapping utilities
 */

export type AppRole = 'admin' | 'member';
export type ClerkRole = 'org:admin' | 'org:member' | 'basic_member';

/**
 * Maps our app roles to Clerk organization roles
 */
export function clerkRoleFromAppRole(role: AppRole): ClerkRole {
  switch (role) {
    case 'admin':
      return 'org:admin';
    case 'member':
      return 'org:member';
    default:
      return 'org:member';
  }
}

/**
 * Maps Clerk organization roles back to our app roles
 */
export function appRoleFromClerkRole(clerkRole: string): AppRole {
  switch (clerkRole) {
    case 'org:admin':
    case 'admin':
      return 'admin';
    case 'org:member':
    case 'basic_member':
    case 'member':
      return 'member';
    default:
      return 'member';
  }
}
