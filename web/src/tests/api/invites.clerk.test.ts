import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('@/server/orgContext', () => ({
  resolveOrgContext: vi.fn(),
  OrgContextError: class OrgContextError extends Error {
    constructor(message: string, code: string) {
      super(message);
      this.name = 'OrgContextError';
      this.code = code;
    }
  }
}));

vi.mock('@/server/supabaseAdmin', () => ({
  supabaseAdmin: {
    from: vi.fn()
  }
}));

vi.mock('@clerk/nextjs/server', () => ({
  clerkClient: {
    organizations: {
      createOrganizationInvitation: vi.fn()
    }
  }
}));

// Import after mocking
import { resolveOrgContext } from '@/server/orgContext';
import { supabaseAdmin } from '@/server/supabaseAdmin';
import { clerkClient } from '@clerk/nextjs/server';
import { POST } from '@/app/api/team/invitations/route';

const mockAdminContext = {
  clerkUserId: 'user_admin123',
  clerkOrgId: 'org_123',
  role: 'admin' as const,
  orgId: 'supabase_org_123'
};

const mockMemberContext = {
  clerkUserId: 'user_member456',
  clerkOrgId: 'org_123',
  role: 'member' as const,
  orgId: 'supabase_org_123'
};

describe('Clerk Invitations API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/team/invitations', () => {
    it('should create invitation successfully with Clerk', async () => {
      vi.mocked(resolveOrgContext).mockResolvedValue(mockAdminContext);
      
      const mockInvitation = { 
        id: 'inv1', 
        email: 'test@example.com', 
        role: 'member',
        clerk_org_id: 'org_123',
        status: 'pending',
        clerk_invitation_id: 'clerk_inv1'
      };
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
        body: JSON.stringify({ email: 'test@example.com', role: 'member' })
      });
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.data.invitation).toEqual(mockInvitation);
      expect(data.data.clerkInvitationId).toBe('clerk_inv1');
      expect(data.data.fallback).toBeUndefined();
      
      expect(clerkClient.organizations.createOrganizationInvitation).toHaveBeenCalledWith({
        organizationId: 'org_123',
        emailAddress: 'test@example.com',
        role: 'org:member'
      });
    });

    it('should handle Clerk failure with local fallback', async () => {
      vi.mocked(resolveOrgContext).mockResolvedValue(mockAdminContext);
      
      const mockInvitation = { 
        id: 'inv1', 
        email: 'test@example.com', 
        role: 'member',
        clerk_org_id: 'org_123',
        status: 'pending',
        clerk_invitation_id: null
      };
      
      // Mock Clerk failure
      const clerkError = {
        errors: [{ code: 'INVITES_DISABLED', message: 'Invitations are disabled' }]
      };
      vi.mocked(clerkClient.organizations.createOrganizationInvitation).mockRejectedValue(clerkError);
      
      vi.mocked(supabaseAdmin.from).mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockInvitation, error: null })
          })
        })
      } as any);

      const request = new NextRequest('http://localhost:3000/api/team/invitations', {
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com', role: 'member' })
      });
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.data.invitation).toEqual(mockInvitation);
      expect(data.data.fallback).toBe(true);
      expect(data.data.clerkError.code).toBe('INVITES_DISABLED');
    });

    it('should handle UNAUTHORIZED Clerk error', async () => {
      vi.mocked(resolveOrgContext).mockResolvedValue(mockAdminContext);
      
      const mockInvitation = { 
        id: 'inv1', 
        email: 'test@example.com', 
        role: 'member',
        clerk_org_id: 'org_123',
        status: 'pending',
        clerk_invitation_id: null
      };
      
      // Mock Clerk UNAUTHORIZED error
      const clerkError = {
        errors: [{ code: 'UNAUTHORIZED', message: 'Invalid credentials' }]
      };
      vi.mocked(clerkClient.organizations.createOrganizationInvitation).mockRejectedValue(clerkError);
      
      vi.mocked(supabaseAdmin.from).mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockInvitation, error: null })
          })
        })
      } as any);

      const request = new NextRequest('http://localhost:3000/api/team/invitations', {
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com', role: 'member' })
      });
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.data.fallback).toBe(true);
      expect(data.data.clerkError.code).toBe('UNAUTHORIZED');
    });

    it('should handle ORG_NOT_FOUND Clerk error', async () => {
      vi.mocked(resolveOrgContext).mockResolvedValue(mockAdminContext);
      
      const mockInvitation = { 
        id: 'inv1', 
        email: 'test@example.com', 
        role: 'member',
        clerk_org_id: 'org_123',
        status: 'pending',
        clerk_invitation_id: null
      };
      
      // Mock Clerk ORG_NOT_FOUND error
      const clerkError = {
        errors: [{ code: 'RESOURCE_NOT_FOUND', message: 'Organization not found' }]
      };
      vi.mocked(clerkClient.organizations.createOrganizationInvitation).mockRejectedValue(clerkError);
      
      vi.mocked(supabaseAdmin.from).mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockInvitation, error: null })
          })
        })
      } as any);

      const request = new NextRequest('http://localhost:3000/api/team/invitations', {
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com', role: 'member' })
      });
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.data.fallback).toBe(true);
      expect(data.data.clerkError.code).toBe('RESOURCE_NOT_FOUND');
    });

    it('should return 403 for non-admin', async () => {
      vi.mocked(resolveOrgContext).mockResolvedValue(mockMemberContext);

      const request = new NextRequest('http://localhost:3000/api/team/invitations', {
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com' })
      });
      
      const response = await POST(request);
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
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.ok).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should handle duplicate invitations gracefully', async () => {
      vi.mocked(resolveOrgContext).mockResolvedValue(mockAdminContext);
      
      const mockClerkInvitation = { id: 'clerk_inv1' };
      const existingInvitation = { 
        id: 'existing_inv1', 
        email: 'test@example.com', 
        role: 'member',
        status: 'pending'
      };
      
      vi.mocked(clerkClient.organizations.createOrganizationInvitation).mockResolvedValue(mockClerkInvitation as any);
      
      // Mock duplicate constraint error
      const duplicateError = { code: '23505', message: 'duplicate key value' };
      vi.mocked(supabaseAdmin.from).mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: duplicateError })
          })
        }),
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: existingInvitation, error: null })
              })
            })
          })
        })
      } as any);

      const request = new NextRequest('http://localhost:3000/api/team/invitations', {
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com', role: 'member' })
      });
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.data.invitation).toEqual(existingInvitation);
    });

    it('should never return empty body on errors', async () => {
      vi.mocked(resolveOrgContext).mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/team/invitations', {
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com' })
      });
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.ok).toBe(false);
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe('INTERNAL');
      expect(data.error.message).toBe('Internal server error');
    });
  });
});
