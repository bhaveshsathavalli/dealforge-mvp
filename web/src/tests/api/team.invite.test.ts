import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Mock the dependencies
vi.mock('@/server/orgContext', () => ({
  resolveOrgContext: vi.fn(),
  OrgContextError: class extends Error {
    constructor(message: string, public code: string) {
      super(message);
      this.name = 'OrgContextError';
    }
  }
}));

vi.mock('@clerk/nextjs/server', () => ({
  clerkClient: {
    organizations: {
      createOrganizationInvitation: vi.fn()
    }
  }
}));

vi.mock('@/server/supabaseAdmin', () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn()
          }))
        }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn()
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn()
            }))
          }))
        }))
      })),
      upsert: vi.fn()
    }))
  }
}));

import { resolveOrgContext, OrgContextError } from '@/server/orgContext';
import { supabaseAdmin } from '@/server/supabaseAdmin';
import { clerkClient } from '@clerk/nextjs/server';

// Import the handlers
import { GET as getInvitations, POST as createInvitation } from '@/app/api/team/invitations/route';
import { DELETE as revokeInvitation } from '@/app/api/team/invitations/[invitationId]/route';
import { GET as getMembers } from '@/app/api/team/members/route';
import { POST as acceptInvite } from '@/app/api/test/accept-invite/route';

describe('Team Invitations API', () => {
  const mockAdminContext = {
    clerkUserId: 'user_admin123',
    clerkOrgId: 'org_test123',
    role: 'admin' as const
  };

  const mockMemberContext = {
    clerkUserId: 'user_member123',
    clerkOrgId: 'org_test123',
    role: 'member' as const
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/team/invitations', () => {
    it('should return invitations for admin', async () => {
      vi.mocked(resolveOrgContext).mockResolvedValue(mockAdminContext);
      
      const mockInvitations = [
        { id: 'inv1', email: 'test@example.com', role: 'member', status: 'pending' }
      ];
      
      vi.mocked(supabaseAdmin.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: mockInvitations, error: null })
            })
          })
        })
      } as any);

      const request = new NextRequest('http://localhost:3000/api/team/invitations');
      const response = await getInvitations(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.data.invitations).toEqual(mockInvitations);
    });

    it('should return 403 for non-admin', async () => {
      vi.mocked(resolveOrgContext).mockResolvedValue(mockMemberContext);

      const request = new NextRequest('http://localhost:3000/api/team/invitations');
      const response = await getInvitations(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.ok).toBe(false);
      expect(data.error.code).toBe('FORBIDDEN');
    });
  });

  describe('POST /api/team/invitations', () => {
    it('should create invitation for admin', async () => {
      vi.mocked(resolveOrgContext).mockResolvedValue(mockAdminContext);
      
      const mockInvitation = { id: 'inv1', email: 'test@example.com', role: 'member' };
      const mockClerkInvitation = { id: 'clerk_inv1' };
      
      vi.mocked(clerkClient.organizations.createOrganizationInvitation).mockResolvedValue(mockClerkInvitation as any);
      
      vi.mocked(supabaseAdmin.from).mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockInvitation, error: null })
          })
        })
      } as any);

      const request = new NextRequest('http://localhost:3000/api/team/invitations', {
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com' })
      });
      const response = await createInvitation(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.data.invitation).toEqual(mockInvitation);
    });

    it('should return 403 for non-admin', async () => {
      vi.mocked(resolveOrgContext).mockResolvedValue(mockMemberContext);

      const request = new NextRequest('http://localhost:3000/api/team/invitations', {
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com' })
      });
      const response = await createInvitation(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.ok).toBe(false);
      expect(data.error.code).toBe('FORBIDDEN');
    });

    it('should validate email format', async () => {
      vi.mocked(resolveOrgContext).mockResolvedValue(mockAdminContext);

      const request = new NextRequest('http://localhost:3000/api/team/invitations', {
        method: 'POST',
        body: JSON.stringify({ email: 'invalid-email' })
      });
      const response = await createInvitation(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.ok).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('DELETE /api/team/invitations/[invitationId]', () => {
    it('should revoke invitation for admin', async () => {
      vi.mocked(resolveOrgContext).mockResolvedValue(mockAdminContext);
      
      const mockInvitation = { id: 'inv1', email: 'test@example.com' };
      
      vi.mocked(supabaseAdmin.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockInvitation, error: null })
            })
          })
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockInvitation, error: null })
              })
            })
          })
        })
      } as any);

      const request = new NextRequest('http://localhost:3000/api/team/invitations/inv1');
      const response = await revokeInvitation(request, { params: { invitationId: 'inv1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
    });

    it('should return 403 for non-admin', async () => {
      vi.mocked(resolveOrgContext).mockResolvedValue(mockMemberContext);

      const request = new NextRequest('http://localhost:3000/api/team/invitations/inv1');
      const response = await revokeInvitation(request, { params: { invitationId: 'inv1' } });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.ok).toBe(false);
      expect(data.error.code).toBe('FORBIDDEN');
    });
  });

  describe('GET /api/team/members', () => {
    it('should return members for any authenticated user', async () => {
      vi.mocked(resolveOrgContext).mockResolvedValue(mockMemberContext);
      
      const mockMembers = [
        { clerkUserId: 'user1', email: 'user1@example.com', name: 'User 1', role: 'admin' }
      ];
      
      vi.mocked(supabaseAdmin.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: mockMembers, error: null })
        })
      } as any);

      const request = new NextRequest('http://localhost:3000/api/team/members');
      const response = await getMembers(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.data.members).toEqual(mockMembers);
    });
  });

  describe('POST /api/test/accept-invite', () => {
    it('should accept invitation for admin', async () => {
      vi.mocked(resolveOrgContext).mockResolvedValue(mockAdminContext);
      
      const mockInvitation = { id: 'inv1', email: 'test@example.com', role: 'member' };
      
      vi.mocked(supabaseAdmin.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockInvitation, error: null })
              })
            })
          })
        }),
        upsert: vi.fn().mockResolvedValue({ error: null }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null })
        })
      } as any);

      const request = new NextRequest('http://localhost:3000/api/test/accept-invite', {
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com' })
      });
      const response = await acceptInvite(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
    });

    it('should return 403 for non-admin', async () => {
      vi.mocked(resolveOrgContext).mockResolvedValue(mockMemberContext);

      const request = new NextRequest('http://localhost:3000/api/test/accept-invite', {
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com' })
      });
      const response = await acceptInvite(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.ok).toBe(false);
      expect(data.error.code).toBe('FORBIDDEN');
    });
  });
});
